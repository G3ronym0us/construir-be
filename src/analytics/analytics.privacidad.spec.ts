import { Test } from '@nestjs/testing';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTasksService } from './analytics-tasks.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { PageView } from './page-view.entity';
import { aOrigenDeReferrer } from './referrer.util';
import { VisitanteThrottlerGuard } from './visitante-throttler.guard';
import { analyticsConfig } from '../config/configuration';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * `POST /analytics/page-view` es público y se dispara en cada navegación de la
 * tienda. Guardaba la IP del visitante en cada fila, para siempre, y ninguna
 * consulta la leía nunca: sólo se cuentan filas por fecha y se agrupa por
 * `path`. Era un dato personal retenido a perpetuidad a cambio de nada.
 *
 * Por lo mismo se fue después el `userAgent` —media huella de navegador, que
 * cruzada con `path` y `created_at` reidentifica sesiones aunque la IP ya no
 * esté— y el `referrer` pasó a guardarse recortado a su origen: guardarlo entero
 * llegó a meter en esta tabla el `?token=` de una invitación de registro.
 *
 * Estas pruebas fijan que nada de eso vuelva a colarse: que la visita se
 * persiste sin IP y sin navegador, que el referrer se guarda recortado también
 * en los casos raros, que el cuerpo está acotado en longitud, y que la purga por
 * retención sigue existiendo.
 */
describe('Analítica de visitas — no se recogen datos que identifiquen al visitante', () => {
  /**
   * Las columnas que la entidad declara de verdad, leídas del registro de
   * TypeORM. Se usa `getMetadataArgsStorage` y no `Reflect.getMetadata` porque
   * aquélla está siempre poblada: una lectura vacía haría que estas pruebas
   * pasaran sin comprobar nada.
   */
  const columnasDeLaEntidad = (): string[] =>
    getMetadataArgsStorage()
      .columns.filter((c) => c.target === PageView)
      .map((c) => c.propertyName);

  const repositorio = {
    // Imita a TypeORM: `create` sólo conserva lo que la entidad declara. Sin
    // esto el mock se tragaría cualquier campo y las pruebas de "no persiste X"
    // estarían comprobando el mock, no la entidad.
    create: jest.fn((datos: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(datos).filter(([k]) => columnasDeLaEntidad().includes(k)),
      ),
    ),
    save: jest.fn((fila) => Promise.resolve({ id: 1, ...fila })),
    count: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  let controlador: AnalyticsController;
  let servicio: AnalyticsService;
  let tareas: AnalyticsTasksService;
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const modulo = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        AnalyticsTasksService,
        { provide: getRepositoryToken(PageView), useValue: repositorio },
        { provide: ConfigService, useValue: config },
      ],
    })
      .overrideGuard(VisitanteThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controlador = modulo.get(AnalyticsController);
    servicio = modulo.get(AnalyticsService);
    tareas = modulo.get(AnalyticsTasksService);
  });

  it('no persiste ninguna IP al registrar una visita', async () => {
    await controlador.trackPageView({
      path: '/productos',
      title: 'Productos',
      referrer: 'https://google.com',
    });

    const guardado = repositorio.save.mock.calls[0][0];
    expect(guardado).not.toHaveProperty('ipAddress');
    expect(JSON.stringify(guardado)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    expect(guardado.path).toBe('/productos');
  });

  it('no persiste el navegador aunque alguien lo cuele en el cuerpo', async () => {
    // El DTO ya no lo declara, pero se fuerza para comprobar que la entidad
    // tampoco tiene dónde guardarlo si la validación se relajara algún día.
    await controlador.trackPageView({
      path: '/productos',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/147',
    } as never);

    expect(JSON.stringify(repositorio.save.mock.calls[0][0])).not.toContain(
      'Mozilla',
    );
  });

  it('la entidad PageView sólo declara lo que hace falta', () => {
    // El `path` se comprueba a propósito: si la lectura de metadatos devolviera
    // una lista vacía, las dos aserciones siguientes pasarían sin mirar nada.
    const columnas = columnasDeLaEntidad();
    expect(columnas).toContain('path');
    expect(columnas).not.toContain('userAgent');
    expect(columnas).not.toContain('ipAddress');
  });

  it('el controlador no recibe la petición cruda, así que no puede leer la IP', () => {
    // Un solo argumento: el DTO. En cuanto alguien vuelva a inyectar `@Req()`
    // la IP queda otra vez al alcance de la mano.
    expect(controlador.trackPageView.length).toBe(1);
  });

  describe('el referrer se guarda recortado a su origen', () => {
    /**
     * Guardar la URL completa metía en la tabla los términos de búsqueda del
     * visitante y, comprobado en la base real, el `?token=` de una invitación de
     * registro: un secreto de un solo uso copiado a un almacén de analítica que
     * nadie vigila. Del referrer sólo se consulta de dónde llega la gente.
     */
    const origenGuardado = async (referrer: unknown) => {
      repositorio.save.mockClear();
      await controlador.trackPageView({ path: '/', referrer } as never);
      return repositorio.save.mock.calls[0][0].referrer;
    };

    it('se queda con el origen y tira la ruta y la query', async () => {
      expect(await origenGuardado('https://google.com/search?q=cemento')).toBe(
        'https://google.com',
      );
    });

    it('no guarda el token de una invitación que venga en el referrer', async () => {
      const guardado = await origenGuardado(
        'http://localhost:3001/register/invitation?token=fe3fe3c54d98480aa6edab613fb24c2b',
      );
      expect(guardado).toBe('http://localhost:3001');
      expect(guardado).not.toContain('token');
    });

    it('conserva el puerto cuando no es el estándar del esquema', async () => {
      expect(await origenGuardado('http://localhost:3001/productos')).toBe(
        'http://localhost:3001',
      );
      expect(await origenGuardado('https://tienda.com:8443/a')).toBe(
        'https://tienda.com:8443',
      );
    });

    it('trata el referrer interno de la propia tienda como cualquier otro', async () => {
      expect(await origenGuardado('https://construir.com/carrito?paso=2')).toBe(
        'https://construir.com',
      );
    });

    describe('entradas raras: ninguna debe perder la visita', () => {
      const casos: Array<[string, unknown]> = [
        ['cadena vacía (navegación directa)', ''],
        ['sólo espacios', '   '],
        ['about:blank', 'about:blank'],
        ['una URL mal formada', 'no-es-una-url'],
        ['un esquema que no es web', 'android-app://com.google.android.gm'],
        ['data:', 'data:text/html,<p>hola</p>'],
        ['undefined', undefined],
        ['null', null],
        ['un número, por si el cliente se equivoca de tipo', 42],
      ];

      it.each(casos)(
        '%s se guarda como null y la visita se registra igual',
        async (_, entrada) => {
          expect(await origenGuardado(entrada)).toBeNull();
          expect(repositorio.save).toHaveBeenCalledTimes(1);
        },
      );
    });

    it('aOrigenDeReferrer nunca lanza, pase lo que pase', () => {
      ['', '   ', 'http://', '://x', 'https://[', 'about:blank', '\u0000'].forEach(
        (v) => expect(() => aOrigenDeReferrer(v)).not.toThrow(),
      );
    });
  });

  describe('validación del cuerpo, que llega del navegador sin sesión', () => {
    const validar = (datos: Record<string, unknown>) =>
      validate(plainToInstance(CreatePageViewDto, datos));

    it('acepta un cuerpo normal', async () => {
      const errores = await validar({
        path: '/carrito',
        title: 'Carrito',
        referrer: 'https://construir.com',
      });
      expect(errores).toHaveLength(0);
    });

    it('rechaza el cuerpo si trae userAgent, con la misma tubería que main.ts', async () => {
      // Se monta el ValidationPipe con la configuración real (ver main.ts) en
      // lugar de mirar metadatos: lo que importa es que la petición se rechace,
      // no cómo. Si alguien reintroduce el campo en el DTO, esto avisa.
      const tuberia = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
      const metadatos = {
        type: 'body' as const,
        metatype: CreatePageViewDto,
      };

      // El `message` de la excepción de Nest es genérico ("Bad Request
      // Exception"); el detalle que interesa está en el cuerpo de la respuesta,
      // que es lo que ve el cliente.
      const error = await tuberia
        .transform({ path: '/', userAgent: 'Mozilla/5.0' }, metadatos)
        .then(
          () => null,
          (e: BadRequestException) => e,
        );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify(error?.getResponse())).toContain('userAgent');

      // Y el mismo cuerpo sin ese campo pasa sin problemas.
      await expect(
        tuberia.transform({ path: '/', title: 'Inicio' }, metadatos),
      ).resolves.toBeDefined();
    });

    it('rechaza un path más largo que su columna', async () => {
      const errores = await validar({ path: 'a'.repeat(501) });
      expect(errores).toHaveLength(1);
      expect(errores[0].constraints).toHaveProperty('maxLength');
    });

    it('rechaza title y referrer más largos que su columna', async () => {
      expect(await validar({ title: 'a'.repeat(501) })).toHaveLength(1);
      expect(await validar({ referrer: 'a'.repeat(501) })).toHaveLength(1);
    });
  });

  describe('límite de tasa del endpoint público', () => {
    /**
     * Se levanta una app de verdad con el ThrottlerGuard real: comprobar sólo
     * el metadato del decorador no distinguiría un `@Throttle` bien puesto de
     * uno colgado de un método al que nadie aplica el guard.
     */
    it('corta a partir de la petición 241 del mismo visitante en un minuto', async () => {
      const modulo = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
        controllers: [AnalyticsController],
        providers: [
          AnalyticsService,
          AnalyticsTasksService,
          VisitanteThrottlerGuard,
          { provide: getRepositoryToken(PageView), useValue: repositorio },
          { provide: ConfigService, useValue: config },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const app = modulo.createNestApplication();
      await app.init();

      const enviar = () =>
        request(app.getHttpServer())
          .post('/analytics/page-view')
          // Content-Type explícito y sin charset: supertest lo manda como
          // "application/json; charset=UTF-8" y el body-parser de Express 5
          // rechaza ese charset en mayúsculas con un 415.
          .set('Content-Type', 'application/json')
          // Un visitante concreto: sin esto todas las peticiones caerían en el
          // cubo del "desconocido" y la prueba no diría nada del tracker.
          .set('X-Forwarded-For', '192.0.2.10')
          .send(JSON.stringify({ path: '/' }));

      // El límite global del módulo es 1000: si algo corta a las 240 es el
      // @Throttle propio de la ruta, no la configuración de fondo.
      for (let i = 0; i < 240; i++) {
        await enviar().expect(201);
      }
      await enviar().expect(429);

      await app.close();
      // 241 peticiones HTTP reales no caben en los 5 s por defecto de jest
      // cuando la suite entera corre en paralelo.
    }, 60000);

    /**
     * **Ésta es la regresión que más caro salía y la que menos se veía.**
     *
     * El guard de serie cuenta por `req.ip`, y `req.ip` sólo es el cliente si
     * Express tiene `trust proxy`, que `main.ts` no configura. Detrás del proxy
     * de producción todas las visitas llegaban con la misma IP y compartían un
     * único cubo: la tienda entera quedaba limitada al techo de una sola
     * persona, y lo que pasaba de ahí se perdía con un 429 que nadie ve, porque
     * el registro de visitas falla en silencio.
     *
     * Se comprueba en dos niveles. Primero el tracker en aislamiento, que es
     * donde vive la decisión; después, por encima del techo de la ruta, que
     * visitantes distintos no se estorban — ahí está la trampa: con menos
     * peticiones que el límite la prueba pasaría con cualquier tracker, incluso
     * con el roto, y no diría nada.
     */
    describe('el tracker distingue visitantes detrás del proxy', () => {
      // `getTracker` es protegido; se expone para poder probarlo de frente.
      const tracker = (req: Record<string, unknown>): Promise<string> =>
        (
          new VisitanteThrottlerGuard(
            {} as never,
            {} as never,
            {} as never,
          ) as unknown as {
            getTracker: (r: Record<string, unknown>) => Promise<string>;
          }
        ).getTracker(req);

      it('usa la primera entrada de x-forwarded-for, que es el cliente', async () => {
        await expect(
          tracker({
            headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' },
            ip: '10.0.0.1',
          }),
        ).resolves.toBe('203.0.113.5');
      });

      it('dos visitantes tras el mismo proxy no comparten cubo', async () => {
        const unoU = await tracker({
          headers: { 'x-forwarded-for': '203.0.113.5' },
          ip: '10.0.0.1',
        });
        const otro = await tracker({
          headers: { 'x-forwarded-for': '198.51.100.9' },
          ip: '10.0.0.1',
        });
        expect(unoU).not.toBe(otro);
      });

      it('sin la cabecera cae a req.ip', async () => {
        await expect(tracker({ headers: {}, ip: '192.0.2.1' })).resolves.toBe(
          '192.0.2.1',
        );
      });

      it('no revienta si no hay ni cabeceras ni ip', async () => {
        await expect(tracker({})).resolves.toBe('desconocido');
      });
    });

    /**
     * Por encima del techo de la ruta: 260 peticiones con 260 IPs distintas.
     * Si el tracker fuera el de serie compartirían cubo y la 241 daría 429.
     */
    it('260 visitantes distintos no se estorban entre sí', async () => {
      const modulo = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
        controllers: [AnalyticsController],
        providers: [
          AnalyticsService,
          AnalyticsTasksService,
          VisitanteThrottlerGuard,
          { provide: getRepositoryToken(PageView), useValue: repositorio },
          { provide: ConfigService, useValue: config },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const app = modulo.createNestApplication();
      await app.init();

      const codigos: number[] = [];
      for (let i = 0; i < 260; i++) {
        const res = await request(app.getHttpServer())
          .post('/analytics/page-view')
          .set('Content-Type', 'application/json')
          .set('X-Forwarded-For', `10.${Math.floor(i / 256)}.${i % 256}.1`)
          .send(JSON.stringify({ path: '/' }));
        codigos.push(res.status);
      }

      expect(codigos.filter((c) => c === 429)).toHaveLength(0);

      await app.close();
    }, 120000);
  });

  describe('purga por retención: la tabla no tenía caducidad y crecía sin techo', () => {
    /** Devuelve el plazo para la clave del plazo y el lote para la del lote. */
    const configurar = (dias: number | null, lote = 50000) =>
      config.get.mockImplementation((clave: string) =>
        clave === 'analytics.pageViewRetentionDays' ? dias : lote,
      );

    const filas = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

    it('borra las visitas anteriores al plazo configurado', async () => {
      repositorio.find.mockResolvedValue(filas(42));
      repositorio.delete.mockResolvedValue({ affected: 42 });
      configurar(180);

      await tareas.handleDailyPageViewPurge();

      expect(repositorio.find).toHaveBeenCalledTimes(1);
      const criterio = repositorio.find.mock.calls[0][0];
      // LessThan guarda el valor en `_value`.
      const corte: Date = criterio.where.createdAt._value;
      const diasAtras = Math.round(
        (Date.now() - corte.getTime()) / (24 * 60 * 60 * 1000),
      );
      expect(diasAtras).toBe(180);
      expect(repositorio.delete).toHaveBeenCalledWith(
        filas(42).map((f) => f.id),
      );
    });

    it('devuelve cuántas borró', async () => {
      repositorio.find.mockResolvedValue(filas(7));
      repositorio.delete.mockResolvedValue({ affected: 7 });
      await expect(servicio.purgeOldPageViews(30, 50000)).resolves.toBe(7);
    });

    it('no toca la base si no hay nada que borrar', async () => {
      repositorio.find.mockResolvedValue([]);
      await expect(servicio.purgeOldPageViews(30, 50000)).resolves.toBe(0);
      expect(repositorio.delete).not.toHaveBeenCalled();
    });

    /**
     * El tope por ejecución existe porque la purga es un DELETE sobre una tabla
     * pensada para crecer sin techo: la primera pasada sobre un histórico
     * grande, sin lote, sería un bloqueo largo de madrugada.
     */
    it('no borra más del tope por ejecución', async () => {
      repositorio.find.mockResolvedValue(filas(1000));
      repositorio.delete.mockResolvedValue({ affected: 1000 });
      configurar(180, 1000);

      await tareas.handleDailyPageViewPurge();

      expect(repositorio.find.mock.calls[0][0].take).toBe(1000);
    });

    it.each([[null], [undefined]])(
      'no borra nada cuando el plazo configurado no se entiende (%s)',
      async (plazo) => {
        configurar(plazo as null);
        await tareas.handleDailyPageViewPurge();
        expect(repositorio.find).not.toHaveBeenCalled();
        expect(repositorio.delete).not.toHaveBeenCalled();
      },
    );

    /**
     * **El caso catastrófico, con la configuración de verdad por medio.**
     *
     * Antes esta comprobación mockeaba el `ConfigService` devolviendo `NaN`, que
     * es justo el único valor malo que la guarda ya manejaba: no ejercitaba
     * `analyticsConfig()`, que es donde vivía el `parseInt` que convertía `1e9`
     * en `1`. La prueba pasaba y el fallo seguía entero. Aquí se lee el valor
     * como lo lee la aplicación al arrancar y se comprueba que, con un `1e9` en
     * el entorno, no se borra ni una fila.
     */
    it('un 1e9 en el entorno no borra nada (antes borraba todo lo de ayer)', async () => {
      const original = process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS;
      process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS = '1e9';

      try {
        const plazoReal = analyticsConfig().pageViewRetentionDays;
        // Con parseInt esto valía 1, y la purga borraba todo lo anterior a ayer.
        expect(plazoReal).toBeNull();

        configurar(plazoReal);
        await tareas.handleDailyPageViewPurge();

        expect(repositorio.find).not.toHaveBeenCalled();
        expect(repositorio.delete).not.toHaveBeenCalled();
      } finally {
        if (original === undefined) {
          delete process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS;
        } else {
          process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS = original;
        }
      }
    });
  });
});
