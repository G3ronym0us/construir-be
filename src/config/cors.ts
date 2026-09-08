/**
 * Lista blanca de orígenes del navegador.
 *
 * Antes acá había `origin: true, credentials: true`, que refleja como
 * permitido CUALQUIER origen que pregunte. Mientras el token viajaba en la
 * cabecera `Authorization` eso era feo pero acotado: una web ajena no podía
 * leer el `localStorage` de la tienda, así que no tenía con qué firmar la
 * petición.
 *
 * Con la sesión en cookie el riesgo cambia de categoría. El navegador adjunta
 * la cookie solo, y el frontend pide con `credentials: 'include'`; si el
 * backend le devuelve `Access-Control-Allow-Origin: <lo que sea>` junto con
 * `Allow-Credentials: true`, cualquier página que el usuario visite puede
 * hacer peticiones autenticadas en su nombre Y LEER LA RESPUESTA. Es decir:
 * pasar a cookie sin cerrar el CORS empeora la seguridad en vez de mejorarla.
 */

/** Orígenes de desarrollo. No se agregan cuando `NODE_ENV=production`. */
const ORIGENES_DESARROLLO = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  // La red local se usa para probar la tienda desde el teléfono; el
  // `FRONTEND_URL` de este repo apunta hoy a una 192.168.x.
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
];

export interface EntornoCors {
  /** `CORS_ORIGINS`: lista separada por comas. Es la fuente principal. */
  corsOrigins?: string;
  /** `FRONTEND_URL`: ya existía en el `.env`; se acepta como origen sin repetirlo. */
  frontendUrl?: string;
  produccion: boolean;
}

/** Deja `https://tienda.com/` como `https://tienda.com`. */
function normalizar(valor: string): string | null {
  const limpio = valor.trim().replace(/\/+$/, '');
  if (!limpio) return null;
  try {
    // Se compara el origen, no la URL: `FRONTEND_URL` puede traer una ruta.
    return new URL(limpio).origin;
  } catch {
    return null;
  }
}

/**
 * Arma la lista de orígenes permitidos.
 *
 * En producción devuelve SÓLO lo declarado por variable de entorno: si el
 * dueño no configura `CORS_ORIGINS` ni `FRONTEND_URL`, la lista queda vacía y
 * el navegador rechaza todo. Es deliberado — un fallo ruidoso en el despliegue
 * es preferible a volver silenciosamente al "cualquier origen" de antes.
 */
export function origenesPermitidos(
  env: EntornoCors,
): (string | RegExp)[] {
  const declarados = [
    ...(env.corsOrigins ?? '').split(','),
    env.frontendUrl ?? '',
  ]
    .map(normalizar)
    .filter((o): o is string => o !== null);

  const unicos = Array.from(new Set(declarados));

  return env.produccion ? unicos : [...unicos, ...ORIGENES_DESARROLLO];
}

/**
 * Predicado que usa `enableCors`. Se devuelve una función y no el arreglo
 * pelado porque hay que aceptar peticiones SIN cabecera `Origin` —Postman, los
 * scripts de mantenimiento, los health checks—: esas no las origina un
 * navegador, así que el CORS no las gobierna y rechazarlas rompía las
 * herramientas sin cerrar ningún hueco.
 */
export function comprobadorDeOrigen(env: EntornoCors) {
  const permitidos = origenesPermitidos(env);

  return (
    origen: string | undefined,
    callback: (err: Error | null, permitir?: boolean) => void,
  ): void => {
    if (!origen) return callback(null, true);

    const aceptado = permitidos.some((p) =>
      typeof p === 'string' ? p === origen : p.test(origen),
    );

    if (aceptado) return callback(null, true);

    // Se responde "no permitido" sin lanzar: lanzar acá convierte un origen
    // ajeno en un 500 en los logs del servidor. Sin la cabecera
    // `Access-Control-Allow-Origin`, el navegador ya bloquea la respuesta.
    return callback(null, false);
  };
}
