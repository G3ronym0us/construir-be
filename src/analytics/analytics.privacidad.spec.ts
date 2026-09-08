import { Test } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
  const repositorio = {
    create: jest.fn((datos) => datos),
    save: jest.fn((fila) => Promise.resolve({ id: 1, ...fila })),
    count: jest.fn(),
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
      .overrideGuard(ThrottlerGuard)
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

  it('la entidad PageView ya no declara la columna userAgent', () => {
    const columnas: Array<{ propertyName: string }> =
      Reflect.getMetadata('typeorm:columns', PageView) ?? [];
    expect(columnas.map((c) => c.propertyName)).not.toContain('userAgent');
  });

  it('la entidad PageView ya no declara la columna ip_address', () => {
    // Instanciarla y listar sus claves no sirve (TypeScript borra los tipos),
    // así que se mira el metadato que TypeORM sí guarda del decorador.
    const columnas: Array<{ propertyName: string }> =
      Reflect.getMetadata('typeorm:columns', PageView) ?? [];
    const nombres = columnas.map((c) => c.propertyName);
    expect(nombres).not.toContain('ipAddress');
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

    it('el DTO ya no declara userAgent, que es lo que hace que se rechace', async () => {
      // Con `forbidNonWhitelisted` (ver main.ts) un campo no declarado es un
      // 400. Aquí se fija la causa: la propiedad no existe en el DTO, así que
      // `plainToInstance` la descarta. Si alguien la reintroduce, esto avisa.
      const instancia = plainToInstance(CreatePageViewDto, {
        path: '/',
        userAgent: 'Mozilla/5.0',
      });
      expect(Object.keys(instancia)).not.toContain('userAgent');
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
    it('corta a partir de la petición 31 en el mismo minuto', async () => {
      const modulo = await Test.createTestingModule({
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }])],
        controllers: [AnalyticsController],
        providers: [
          AnalyticsService,
          AnalyticsTasksService,
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
          .send(JSON.stringify({ path: '/' }));

      // El límite global del módulo es 1000: si algo corta a las 30 es el
      // @Throttle propio de la ruta, no la configuración de fondo.
      for (let i = 0; i < 30; i++) {
        await enviar().expect(201);
      }
      await enviar().expect(429);

      await app.close();
      // 31 peticiones HTTP reales no caben en los 5 s por defecto de jest
      // cuando la suite entera corre en paralelo.
    }, 60000);
  });

  describe('purga por retención: la tabla no tenía caducidad y crecía sin techo', () => {
    it('borra las visitas anteriores al plazo configurado', async () => {
      repositorio.delete.mockResolvedValue({ affected: 42 });
      config.get.mockReturnValue(180);

      await tareas.handleDailyPageViewPurge();

      expect(repositorio.delete).toHaveBeenCalledTimes(1);
      const criterio = repositorio.delete.mock.calls[0][0];
      // LessThan guarda el valor en `_value`.
      const corte: Date = criterio.createdAt._value;
      const diasAtras = Math.round(
        (Date.now() - corte.getTime()) / (24 * 60 * 60 * 1000),
      );
      expect(diasAtras).toBe(180);
    });

    it('devuelve cuántas borró', async () => {
      repositorio.delete.mockResolvedValue({ affected: 7 });
      await expect(servicio.purgeOldPageViews(30)).resolves.toBe(7);
    });

    it('no borra nada si el plazo configurado no tiene sentido', async () => {
      config.get.mockReturnValue(NaN);
      await tareas.handleDailyPageViewPurge();
      expect(repositorio.delete).not.toHaveBeenCalled();
    });
  });
});
