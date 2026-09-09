import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { jwtConfig } from '../config/configuration';
import {
  SESSION_COOKIE_NAME,
  opcionesCookieSesion,
  opcionesBorradoSesion,
  duracionEnMs,
  problemaDeDominioDeCookie,
} from './session-cookie';

/**
 * El JWT de sesión vivía en `localStorage` y en una cookie escrita desde
 * JavaScript con `document.cookie` — que por definición NO puede ser
 * `httpOnly`, porque sólo el servidor puede marcarla así. Cualquier XSS, o una
 * dependencia comprometida, se llevaba la sesión de un cliente o de un
 * administrador entera.
 *
 * Estas pruebas fijan que el token salga de acá en una cookie que el
 * JavaScript del navegador no pueda leer. Si alguien quita el `httpOnly`, o
 * emite la cookie a mano sin pasar por `opcionesCookieSesion`, el agujero
 * vuelve sin que nada más se rompa — de ahí que se afirme atributo por
 * atributo y no sólo "responde 200".
 */
describe('Cookie de sesión — `/auth/login` y `/auth/logout`', () => {
  const respuestaFalsa = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  const armarControlador = async (expiresIn = '24h') => {
    const authService = { login: jest.fn() };
    const mod = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: {} },
        { provide: jwtConfig.KEY, useValue: { secret: 's', expiresIn } },
      ],
    }).compile();
    return { controller: mod.get(AuthController), authService };
  };

  const NODE_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_DOMAIN;
  });

  it('el login emite el token en una cookie `httpOnly`', async () => {
    const { controller, authService } = await armarControlador();
    authService.login.mockResolvedValue({
      access_token: 'jwt.de.prueba',
      user: { id: 1, role: 'admin' },
    });
    const res = respuestaFalsa();

    await controller.login(
      { email: 'a@b.com', password: 'x' } as never,
      res as never,
    );

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const [nombre, valor, opciones] = res.cookie.mock.calls[0];

    expect(nombre).toBe(SESSION_COOKIE_NAME);
    expect(valor).toBe('jwt.de.prueba');
    // Lo único que impide que un script de la página se lleve la sesión.
    expect(opciones.httpOnly).toBe(true);
    // Reemplaza a la protección que daba gratis la cabecera `Authorization`:
    // el navegador manda las cookies solo en peticiones que origina otro sitio.
    expect(opciones.sameSite).toBe('lax');
    expect(opciones.path).toBe('/');
  });

  it('el cuerpo sigue trayendo `access_token` para Postman y los scripts', async () => {
    // La cabecera `Authorization` se conserva como fuente secundaria a
    // propósito; quitar el token del cuerpo rompía la colección de Postman sin
    // cerrar ningún hueco — la vulnerabilidad es dónde lo guarda el navegador.
    const { controller, authService } = await armarControlador();
    authService.login.mockResolvedValue({
      access_token: 'jwt.de.prueba',
      user: { id: 1 },
    });

    const cuerpo = await controller.login(
      { email: 'a@b.com', password: 'x' } as never,
      respuestaFalsa() as never,
    );

    expect(cuerpo.access_token).toBe('jwt.de.prueba');
  });

  it('el logout borra la cookie con los MISMOS atributos con que se puso', async () => {
    // `res.clearCookie` sólo surte efecto si `path`, `sameSite`, `secure` y
    // `domain` coinciden. Si no coinciden, el navegador ignora el borrado en
    // silencio y la sesión sobrevivía a "cerrar sesión".
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = '.construir.com';

    const { controller } = await armarControlador();
    const resLogin = respuestaFalsa();
    const resLogout = respuestaFalsa();

    // Se comparan contra las mismas opciones que emite el login.
    const puestas = opcionesCookieSesion({
      expiresIn: '24h',
      produccion: true,
      domain: '.construir.com',
    });
    void resLogin;

    controller.logout(resLogout as never);

    expect(resLogout.clearCookie).toHaveBeenCalledTimes(1);
    const [nombre, opciones] = resLogout.clearCookie.mock.calls[0];
    expect(nombre).toBe(SESSION_COOKIE_NAME);
    expect(opciones.path).toBe(puestas.path);
    expect(opciones.sameSite).toBe(puestas.sameSite);
    expect(opciones.secure).toBe(puestas.secure);
    expect(opciones.domain).toBe(puestas.domain);
    // El borrado no lleva `maxAge`: `clearCookie` pone el suyo, en el pasado.
    expect(opciones.maxAge).toBeUndefined();
  });

  it('el logout NO exige sesión válida', async () => {
    // Con `JwtAuthGuard`, salir con el token ya vencido respondía 401 y la
    // cookie muerta se quedaba pegada en el navegador para siempre.
    const guards = Reflect.getMetadata(
      '__guards__',
      AuthController.prototype.logout,
    );
    expect(guards).toBeUndefined();
  });
});

describe('`opcionesCookieSesion` — atributos según el entorno', () => {
  it('marca `Secure` en producción', () => {
    // Sin `Secure` la cookie viaja también por HTTP plano y cualquiera en la
    // red la lee: sería cambiar el XSS por un espionaje de red.
    expect(
      opcionesCookieSesion({ expiresIn: '24h', produccion: true }).secure,
    ).toBe(true);
  });

  it('no exige `Secure` en desarrollo, donde no hay HTTPS', () => {
    // Con `Secure` en `http://localhost` el navegador descarta la cookie y
    // nadie puede entrar en local.
    expect(
      opcionesCookieSesion({ expiresIn: '24h', produccion: false }).secure,
    ).toBe(false);
  });

  it('fuerza `Secure` cuando se pide `SameSite=None`', () => {
    // El navegador descarta en silencio una cookie `SameSite=None` sin
    // `Secure`, y el síntoma es "el login responde 200 pero no queda sesión".
    const o = opcionesCookieSesion({
      expiresIn: '24h',
      produccion: false,
      sameSite: 'none',
    });
    expect(o.sameSite).toBe('none');
    expect(o.secure).toBe(true);
  });

  it('la cookie caduca cuando caduca el token', () => {
    expect(duracionEnMs('24h')).toBe(86_400_000);
    expect(duracionEnMs('7d')).toBe(604_800_000);
    expect(duracionEnMs('900s')).toBe(900_000);
    expect(duracionEnMs('15m')).toBe(900_000);
    // Un valor ilegible no puede caer a "sin caducidad".
    expect(duracionEnMs('lo-que-sea')).toBe(86_400_000);
  });

  it('el borrado no arrastra `maxAge`', () => {
    const o = opcionesBorradoSesion({ expiresIn: '24h', produccion: true });
    expect(o.maxAge).toBeUndefined();
    expect(o.httpOnly).toBe(true);
  });
});

/**
 * El fallo más mudo de todo el cambio a cookie: si la tienda y la API están en
 * hosts distintos y no se declara `COOKIE_DOMAIN`, la cookie queda atada al
 * host de la API y el `middleware.ts` de Next —que corre en el host de la
 * tienda— no la ve NUNCA. El login responde 200, parece que todo va bien, y
 * `/admin/*` rebota a `/admin/login` para siempre sin imprimir un solo error.
 *
 * Como no hay forma de notarlo en caliente, se detecta al arrancar. Estas
 * pruebas fijan esa detección.
 */
describe('Aviso de COOKIE_DOMAIN — el rebote infinito del panel', () => {
  it('avisa cuando los hosts difieren y no hay COOKIE_DOMAIN', () => {
    const aviso = problemaDeDominioDeCookie({
      frontendUrl: 'https://construir.com',
      appUrl: 'https://api.construir.com',
    });
    expect(aviso).toContain('construir.com');
    expect(aviso).toContain('api.construir.com');
    // Tiene que sugerir el valor concreto, no sólo describir el problema.
    expect(aviso).toContain('COOKIE_DOMAIN=.construir.com');
  });

  it('la regla es por HOST, no por dominio registrable', () => {
    // `localhost` y `127.0.0.1` apuntan a la misma máquina pero son hosts
    // distintos para las cookies: reproducido, basta eso para romperlo.
    expect(
      problemaDeDominioDeCookie({
        frontendUrl: 'http://127.0.0.1:3000',
        appUrl: 'http://localhost:3001',
      }),
    ).not.toBeNull();
  });

  it('no avisa si comparten host, aunque cambie el puerto', () => {
    // Los puertos no cuentan para las cookies: mismo host, misma cookie.
    expect(
      problemaDeDominioDeCookie({
        frontendUrl: 'http://localhost:3000',
        appUrl: 'http://localhost:3001',
      }),
    ).toBeNull();
  });

  it('no avisa si ya se declaró COOKIE_DOMAIN', () => {
    expect(
      problemaDeDominioDeCookie({
        frontendUrl: 'https://construir.com',
        appUrl: 'https://api.construir.com',
        cookieDomain: '.construir.com',
      }),
    ).toBeNull();
  });

  it('no avisa si falta información para juzgar', () => {
    // Sin `APP_URL` no se puede saber, y un aviso falso en cada arranque
    // enseña a ignorar los avisos de verdad.
    expect(problemaDeDominioDeCookie({ frontendUrl: 'https://construir.com' })).toBeNull();
    expect(problemaDeDominioDeCookie({})).toBeNull();
    expect(
      problemaDeDominioDeCookie({ frontendUrl: 'no-es-url', appUrl: 'tampoco' }),
    ).toBeNull();
  });

  it('no inventa un dominio padre cuando no lo hay', () => {
    const aviso = problemaDeDominioDeCookie({
      frontendUrl: 'http://localhost:3000',
      appUrl: 'http://127.0.0.1:3001',
    });
    expect(aviso).toContain('tudominio.com');
  });
});
