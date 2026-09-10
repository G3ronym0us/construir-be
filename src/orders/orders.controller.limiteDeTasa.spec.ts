import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { S3Service } from '../products/s3.service';
import { VisitanteThrottlerGuard } from '../common/throttling/visitante-throttler.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

/**
 * `POST /orders` es la superficie pública más cara de este proyecto y hasta
 * este cambio no tenía **ningún** límite de tasa. No es que estuviera flojo:
 * `ThrottlerModule.forRoot()` fijaba unos valores por defecto que no aplicaba
 * nadie, porque no había ningún `APP_GUARD` registrado y el guard sólo corría
 * donde alguien escribiera `@UseGuards(ThrottlerGuard)` a mano — dos rutas en
 * todo el proyecto, y ninguna de ellas era ésta.
 *
 * Medido contra la base real antes del arreglo: **70 `POST /orders` seguidos
 * devolvieron 70 pedidos creados (201), 142 correos enviados y 71 unidades
 * menos de inventario, sin un solo 429.** Sin sesión, sin pagar y sin coste.
 * Cada uno de los tres es un problema distinto:
 *
 *   - correo: el destinatario lo elige quien llama, y parte del contenido
 *     también (nombre, notas). Es bombardeo y suplantación con el dominio de
 *     la tienda, que además arriesga la reputación del remitente por el que
 *     salen los correos con los que la tienda cobra;
 *   - inventario: los pedidos quedan `ON_HOLD` y apartan mercancía que nadie
 *     pagó, así que se puede agotar el stock de cualquier producto gratis;
 *   - base de datos: 70 pedidos basura en 72 segundos.
 *
 * Estas pruebas fijan las tres mitades del arreglo: que el límite EXISTE, que
 * cuenta **por visitante y no por proxy** (si contara por `req.ip`, detrás del
 * nginx de producción la tienda entera compartiría un cubo de 5 pedidos por
 * minuto y el sexto cliente del día no podría comprar), y que la API externa
 * v1 queda fuera para no matar las ráfagas legítimas del ERP.
 */
describe('Límite de tasa de la superficie pública de pedidos', () => {
  let app: INestApplication;

  const ordersService = {
    createOrder: jest.fn(() => Promise.resolve({ uuid: 'order-uuid' })),
    quoteOrder: jest.fn(() => Promise.resolve({ total: 1 })),
  };

  /**
   * Un controlador con el prefijo de la API externa, para comprobar la
   * exclusión sobre una ruta de verdad y no sobre el método del guard: probar
   * `shouldSkip` en aislamiento no distinguiría una exclusión bien puesta de
   * una que el guard nunca llega a consultar.
   */
  @Controller('api/v1/products')
  class ProductosV1DePrueba {
    @Get()
    listar() {
      return { ok: true };
    }
  }

  /**
   * Levanta la aplicación con el guard registrado igual que en `app.module.ts`.
   *
   * `limiteGlobal` es el techo de fondo, el que se aplica a las rutas que no
   * declaran su propio `@Throttle`. Cada bloque de abajo elige el suyo para que
   * la prueba diga algo: con un techo de fondo muy alto, una ruta SIN límite
   * propio pasaría igual y la prueba no distinguiría nada.
   */
  const crearApp = async (limiteGlobal: number): Promise<INestApplication> => {
    const modulo = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: limiteGlobal }])],
      controllers: [OrdersController, ProductosV1DePrueba],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: S3Service, useValue: {} },
        // Exactamente como en `app.module.ts`.
        { provide: APP_GUARD, useClass: VisitanteThrottlerGuard },
      ],
    })
      // Lo único que se anula es la autenticación opcional: sin la estrategia
      // de passport montada, `OptionalJwtAuthGuard` revienta con un 500 y
      // taparía el 201/429 que es lo que se está midiendo. El limitador NO se
      // anula: es el que se está probando.
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const creada = modulo.createNestApplication();
    await creada.init();
    return creada;
  };

  afterEach(async () => {
    await app?.close();
  });

  /** Un pedido cualquiera, desde el visitante que se indique. */
  const pedir = (visitante: string) =>
    request(app.getHttpServer())
      .post('/orders')
      // Content-Type explícito y sin charset: supertest manda
      // "application/json; charset=UTF-8" y el body-parser de Express 5
      // rechaza ese charset en mayúsculas con un 415.
      .set('Content-Type', 'application/json')
      // Sin esto todas las peticiones caerían en el cubo del "desconocido" y
      // la prueba no diría nada del tracker.
      .set('X-Forwarded-For', visitante)
      .send(JSON.stringify({}));

  const cotizar = (visitante: string) =>
    request(app.getHttpServer())
      .post('/orders/quote')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', visitante)
      .send(JSON.stringify({}));

  describe('POST /orders', () => {
    // Techo de fondo alto: si algo corta a las 5 es el `@Throttle` de la ruta
    // y no la configuración global.
    beforeEach(async () => {
      jest.clearAllMocks();
      app = await crearApp(1000);
    });

    it('corta a partir del sexto pedido del mismo visitante en un minuto', async () => {
      for (let i = 0; i < 5; i++) {
        await pedir('192.0.2.10').expect(201);
      }

      await pedir('192.0.2.10').expect(429);
    });

    /**
     * **La regresión que más caro sale y la que menos se ve.**
     *
     * El guard de serie cuenta por `req.ip`, y `req.ip` sólo es el cliente si
     * Express tiene `trust proxy` — que `main.ts` no configura, a propósito
     * (cambiarlo mueve también `req.protocol` y la cookie de sesión). Detrás
     * del proxy de producción TODAS las peticiones llegan con la misma IP: un
     * límite global con ese criterio contaría a la tienda entera como un solo
     * cliente y el primer comprador del minuto se llevaría el cupo de todos.
     *
     * La trampa está en el orden: hay que gastar el cupo del primer visitante
     * ENTERO antes de probar el segundo. Con menos peticiones que el límite,
     * esta prueba pasaría igual con el tracker roto y no diría nada.
     */
    it('el cupo de un visitante no consume el de otro', async () => {
      for (let i = 0; i < 5; i++) {
        await pedir('192.0.2.10').expect(201);
      }
      await pedir('192.0.2.10').expect(429);

      // El segundo visitante llega con el cupo intacto: cinco pedidos suyos.
      for (let i = 0; i < 5; i++) {
        await pedir('198.51.100.20').expect(201);
      }
      await pedir('198.51.100.20').expect(429);

      // Y el primero sigue cortado: el segundo no le devolvió nada.
      await pedir('192.0.2.10').expect(429);
    });

    /**
     * `x-forwarded-for` trae la cadena entera de proxies. El cliente es la
     * PRIMERA entrada; quedarse con la última identificaría al proxy y volvería
     * a juntar a todo el mundo en un cubo.
     */
    it('identifica por la primera entrada de x-forwarded-for, no por la cadena entera', async () => {
      for (let i = 0; i < 5; i++) {
        await pedir('192.0.2.10, 10.0.0.1').expect(201);
      }

      // Mismo cliente, otra cadena de proxies: tiene que seguir cortado.
      await pedir('192.0.2.10, 10.0.0.9, 172.16.0.1').expect(429);
    });
  });

  describe('POST /orders/quote', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      app = await crearApp(1000);
    });

    /**
     * El quote acepta un `discountCode`, así que es por donde se enumeraban
     * los cupones. El techo es más alto que el de `POST /orders` porque el
     * checkout recotiza en cada cambio del formulario, pero sigue siendo un
     * techo: con el mensaje ya unificado, probar 30 códigos por minuto no
     * lleva a ninguna parte.
     */
    it('corta a partir de la petición 31 del mismo visitante en un minuto', async () => {
      for (let i = 0; i < 30; i++) {
        await cotizar('203.0.113.30').expect(200);
      }

      await cotizar('203.0.113.30').expect(429);
    });

    /**
     * El quote tiene que ser MÁS holgado que la creación: un cliente que
     * cambia el método de entrega, la cantidad y prueba un cupón dispara
     * varias cotizaciones en el mismo checkout, y cortarlo ahí deja la pantalla
     * de pago sin totales. Se fija la relación, no sólo los números sueltos.
     */
    it('deja cotizar más veces de las que deja crear pedidos', async () => {
      for (let i = 0; i < 6; i++) {
        await cotizar('203.0.113.31').expect(200);
      }
    });
  });

  describe('la API externa v1 queda fuera del límite', () => {
    /**
     * **Techo de fondo de 10 a propósito, y ahí está toda la prueba.**
     *
     * `/api/v1/products` no declara `@Throttle`, así que sin la exclusión le
     * tocaría el techo de fondo. La primera versión de este bloque lo dejaba en
     * 1000 y hacía 50 llamadas: pasaba igual con la exclusión quitada, porque
     * 50 nunca llegaba al techo. Era una prueba que no comprobaba nada — se
     * detectó saboteando `shouldSkip` para que devolviera siempre `false` y
     * viendo que la suite seguía en verde.
     *
     * Con el techo en 10, una ráfaga de 30 lo supera tres veces: si la
     * exclusión no está, la petición 11 devuelve 429 y la prueba se cae.
     */
    const TECHO_DE_FONDO = 10;

    beforeEach(async () => {
      jest.clearAllMocks();
      app = await crearApp(TECHO_DE_FONDO);
    });

    /**
     * El ERP sincroniza el catálogo entero de un tirón: una ráfaga suya supera
     * de largo cualquier techo dimensionado para un navegador. Y no queda
     * desprotegida — `/api/v1/*` exige clave de API, que se puede revocar, y
     * cada llamada queda registrada con la clave que la hizo.
     */
    it('aguanta una ráfaga que triplica el techo de fondo', async () => {
      for (let i = 0; i < TECHO_DE_FONDO * 3; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/products')
          .set('X-Forwarded-For', '192.0.2.77')
          .expect(200);
      }
    });

    /**
     * Y la exclusión no puede desbordarse al resto: si `shouldSkip` devolviera
     * `true` de más —comparando mal, o mirando `originalUrl` con una cadena de
     * consulta que contenga `/api/v1/`— la aplicación entera quedaría sin
     * límite y no lo notaría nadie hasta el siguiente abuso. Acá se comprueba
     * que el mismo visitante que acaba de gastar tres veces el techo en v1
     * sigue teniendo sus 5 pedidos y ni uno más.
     */
    it('no deja sin límite al resto de la aplicación', async () => {
      for (let i = 0; i < TECHO_DE_FONDO * 3; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/products')
          .set('X-Forwarded-For', '192.0.2.78')
          .expect(200);
      }

      for (let i = 0; i < 5; i++) {
        await pedir('192.0.2.78').expect(201);
      }
      await pedir('192.0.2.78').expect(429);
    });
  });
});
