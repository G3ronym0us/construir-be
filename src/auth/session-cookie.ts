import type { CookieOptions } from 'express';

/**
 * Nombre de la cookie de sesión.
 *
 * Es el mismo `token` que el frontend escribía antes con `document.cookie`,
 * y a propósito: el `middleware.ts` de Next lee `request.cookies.get('token')`
 * para proteger el panel. Cambiarle el nombre acá dejaba el panel abierto de
 * par en par —el middleware no encontraría cookie y, según la rama, redirigía
 * a login en bucle— sin ningún beneficio.
 */
export const SESSION_COOKIE_NAME = 'token';

/**
 * Convierte la duración del JWT (`JWT_EXPIRES_IN`, tipo "24h", "7d", "900s")
 * a milisegundos.
 *
 * La cookie tiene que morir cuando muere el token. Si viviera más, el
 * navegador seguiría mandando un token vencido y el usuario vería 401 en cada
 * pantalla sin entender por qué "sigue con sesión"; si viviera menos, lo
 * sacaría antes de tiempo.
 */
export function duracionEnMs(expiresIn: string): number {
  const DIA = 24 * 60 * 60 * 1000;
  const m = /^(\d+)\s*([smhd])?$/.exec((expiresIn ?? '').trim());

  // Un valor que no se entiende no puede caer a "sin caducidad": se prefiere
  // el mismo 24h que trae el `jwtConfig` por defecto.
  if (!m) return DIA;

  const cantidad = parseInt(m[1], 10);
  const unidad = m[2] ?? 's'; // jsonwebtoken interpreta un número pelado como segundos
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unidad]!;
  return cantidad * factor;
}

export interface OpcionesSesion {
  /** `JWT_EXPIRES_IN`. */
  expiresIn: string;
  /** `true` en producción. */
  produccion: boolean;
  /** `COOKIE_SAMESITE`: 'lax' | 'strict' | 'none'. */
  sameSite?: string;
  /** `COOKIE_DOMAIN`, para compartir la cookie entre `www` y `api`. */
  domain?: string;
}

/**
 * Atributos con los que el backend emite —y borra— la cookie de sesión.
 *
 * `httpOnly` es el punto de todo el cambio: antes el token vivía en
 * `localStorage` y en una cookie escrita con `document.cookie`, así que
 * cualquier script de la página (un XSS, una dependencia comprometida, una
 * extensión) se llevaba la sesión de un cliente o de un administrador. Una
 * cookie `httpOnly` no la puede leer el JavaScript del navegador.
 *
 * `sameSite` es lo que reemplaza a la protección que daba gratis la cabecera
 * `Authorization`: una cookie sí la manda el navegador sola en peticiones que
 * origina otro sitio. Con `lax` el navegador no la adjunta en peticiones
 * cruzadas que no sean navegaciones GET de nivel superior, lo que cubre el CSRF
 * clásico por formulario o imagen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * `SameSite=Lax` ES LA ÚNICA DEFENSA CSRF DE ESTA API. NO ES UNA PERILLA
 * NEUTRA: `COOKIE_SAMESITE=none` LA APAGA Y ABRE UN AGUJERO REAL.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Conviene dejar escrito por qué, porque el razonamiento intuitivo es erróneo
 * en dos puntos y se comprobó contra el servidor:
 *
 *  1. La lista blanca de CORS NO es una defensa CSRF. Cuando el origen no está
 *     permitido, Express omite la cabecera `Access-Control-Allow-Origin` pero
 *     EL HANDLER SE EJECUTA IGUAL y el efecto secundario ocurre. Lo único que
 *     el navegador impide es que el atacante LEA la respuesta. Comprobado: un
 *     `POST /banners` con `Origin: https://sitio-malicioso.example` y sólo la
 *     cookie pasa la autenticación y el guard de rol, y llega hasta la
 *     validación de negocio.
 *
 *  2. `multipart/form-data` está en la lista segura de `Content-Type`, así que
 *     un `<form enctype="multipart/form-data" method="POST">` alojado en otra
 *     web es una petición SIMPLE: no dispara preflight, y por tanto el CORS no
 *     llega a mirarla siquiera. El argumento de "todo va en JSON y el JSON
 *     preflightea" no cubre estos tres endpoints, que aceptan multipart:
 *       - POST /banners            (la portada de la tienda)
 *       - POST /categories
 *       - POST /products/:uuid/... (imagen de producto)
 *
 * Con `lax`, el navegador no adjunta la cookie a ese formulario cruzado y el
 * ataque muere ahí. Con `none`, la adjunta. Por eso `none` EXIGE montar antes
 * un token anti-CSRF (patrón de doble envío o token por sesión, verificado en
 * un guard global para los métodos que cambian estado). Mientras ese token no
 * exista, `none` no se debe usar: `bootstrap()` avisa por log si se configura.
 */
export function opcionesCookieSesion(op: OpcionesSesion): CookieOptions {
  const sameSite = (op.sameSite ?? 'lax').toLowerCase() as
    | 'lax'
    | 'strict'
    | 'none';

  return {
    httpOnly: true,
    // `SameSite=None` sólo es válido junto con `Secure`; el navegador descarta
    // la cookie en silencio si falta, y la sesión simplemente no se guardaba.
    secure: op.produccion || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: duracionEnMs(op.expiresIn),
    ...(op.domain ? { domain: op.domain } : {}),
  };
}

/**
 * Atributos para borrarla. `res.clearCookie` sólo la borra si coinciden
 * `path`, `domain`, `secure` y `sameSite` con los que se usaron al ponerla;
 * si no coinciden el navegador ignora el borrado y la sesión sobrevivía al
 * "cerrar sesión".
 */
export function opcionesBorradoSesion(op: OpcionesSesion): CookieOptions {
  const { maxAge, ...resto } = opcionesCookieSesion(op);
  void maxAge;
  return resto;
}

/** Host de una URL, o `null` si no se puede leer. */
function hostDe(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export interface EntornoDominio {
  /** `FRONTEND_URL`: dónde vive la tienda (y el `middleware.ts` de Next). */
  frontendUrl?: string;
  /** `APP_URL`: dónde vive esta API. */
  appUrl?: string;
  /** `COOKIE_DOMAIN`. */
  cookieDomain?: string;
}

/**
 * Detecta la configuración que deja el panel rebotando a login para siempre.
 *
 * La cookie de sesión, sin `Domain`, queda atada al host que la emitió: el de
 * la API. El `middleware.ts` de Next corre en el host de la TIENDA y lee la
 * cookie de ahí, así que si los hosts difieren NO LA VE NUNCA. El login
 * responde 200, todo parece ir bien, y `/admin/*` redirige a `/admin/login`
 * indefinidamente. No se imprime ningún error en ninguna consola: es el fallo
 * más mudo de todo este cambio, y por eso se comprueba al arrancar.
 *
 * Ojo: la regla es por HOST, no por dominio registrable. `construir.com` y
 * `api.construir.com` ya son hosts distintos, e incluso `localhost` y
 * `127.0.0.1` lo son.
 *
 * @returns el mensaje a gritar, o `null` si la configuración es coherente.
 */
export function problemaDeDominioDeCookie(env: EntornoDominio): string | null {
  if (env.cookieDomain) return null; // ya se declaró un dominio compartido

  const tienda = hostDe(env.frontendUrl);
  const api = hostDe(env.appUrl);

  if (!tienda || !api || tienda === api) return null;

  return (
    `La tienda (${tienda}) y esta API (${api}) están en hosts distintos y ` +
    'COOKIE_DOMAIN está vacía. La cookie de sesión quedará atada al host de la ' +
    'API, y el middleware de Next —que corre en el host de la tienda— no la ' +
    'verá nunca: el login responderá 200 pero /admin/* rebotará a /admin/login ' +
    'para siempre, sin ningún error visible. Declara el dominio padre que ' +
    `comparten, por ejemplo COOKIE_DOMAIN=.${dominioPadre(tienda, api) ?? 'tudominio.com'}`
  );
}

/** Sufijo común de dos hosts, para poder sugerir un `COOKIE_DOMAIN` concreto. */
function dominioPadre(a: string, b: string): string | null {
  const pa = a.split('.').reverse();
  const pb = b.split('.').reverse();
  const comun: string[] = [];

  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] !== pb[i]) break;
    comun.push(pa[i]);
  }

  // Con menos de dos etiquetas en común no hay dominio padre que sugerir
  // (`localhost` frente a `127.0.0.1`, por ejemplo).
  return comun.length >= 2 ? comun.reverse().join('.') : null;
}
