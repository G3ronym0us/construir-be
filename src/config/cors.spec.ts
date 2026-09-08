import { comprobadorDeOrigen, origenesPermitidos } from './cors';

/**
 * `main.ts` tenía `origin: true, credentials: true`, que refleja como
 * permitido CUALQUIER origen que pregunte.
 *
 * Mientras el token viajaba en la cabecera `Authorization` eso era malo pero
 * acotado: una web ajena no podía leer el `localStorage` de la tienda, así que
 * no tenía con qué firmar. Con la sesión en cookie el navegador la adjunta
 * solo, y `Allow-Origin: <cualquiera>` + `Allow-Credentials: true` le da a
 * cualquier página que el usuario visite permiso para hacer peticiones
 * autenticadas en su nombre y LEER la respuesta.
 *
 * O sea: sin esta lista blanca, el cambio a cookie empeora la seguridad en vez
 * de mejorarla. Estas pruebas son las que impiden que alguien vuelva a
 * `origin: true` "porque en local no funcionaba".
 */
describe('Lista blanca de CORS', () => {
  /** Ejecuta el predicado y devuelve si el origen quedó permitido. */
  const permite = (
    env: Parameters<typeof comprobadorDeOrigen>[0],
    origen: string | undefined,
  ): boolean => {
    let resultado: boolean | undefined;
    comprobadorDeOrigen(env)(origen, (_e, ok) => {
      resultado = ok;
    });
    return resultado === true;
  };

  const PRODUCCION = {
    corsOrigins: 'https://construir.com,https://www.construir.com',
    frontendUrl: 'https://construir.com',
    produccion: true,
  };

  it('rechaza un origen ajeno en producción', () => {
    expect(permite(PRODUCCION, 'https://sitio-malicioso.com')).toBe(false);
    expect(permite(PRODUCCION, 'http://construir.com.attacker.net')).toBe(false);
  });

  it('acepta los orígenes declarados', () => {
    expect(permite(PRODUCCION, 'https://construir.com')).toBe(true);
    expect(permite(PRODUCCION, 'https://www.construir.com')).toBe(true);
  });

  it('distingue el esquema y el puerto', () => {
    // `https://construir.com` y `http://construir.com` son orígenes distintos:
    // aceptar el http dejaba pasar una versión sin cifrar del mismo dominio.
    expect(permite(PRODUCCION, 'http://construir.com')).toBe(false);
    expect(permite(PRODUCCION, 'https://construir.com:8443')).toBe(false);
  });

  it('no cuela localhost en producción', () => {
    // Los orígenes de desarrollo son cómodos en local y un hueco en producción:
    // cualquiera puede montar algo en su `localhost` y apuntarlo a la API.
    expect(permite(PRODUCCION, 'http://localhost:3000')).toBe(false);
  });

  it('acepta localhost y la red local SÓLO fuera de producción', () => {
    const dev = { frontendUrl: 'http://192.168.1.46:3001', produccion: false };
    expect(permite(dev, 'http://localhost:3025')).toBe(true);
    expect(permite(dev, 'http://127.0.0.1:3025')).toBe(true);
    // El teléfono probando la tienda contra la máquina de desarrollo.
    expect(permite(dev, 'http://192.168.1.46:3001')).toBe(true);
    expect(permite(dev, 'https://sitio-malicioso.com')).toBe(false);
  });

  it('deja pasar las peticiones sin `Origin`', () => {
    // Postman, los scripts de mantenimiento y los health checks no mandan
    // `Origin`: no las origina un navegador, así que el CORS no las gobierna.
    // Rechazarlas rompía las herramientas sin cerrar ningún hueco.
    expect(permite(PRODUCCION, undefined)).toBe(true);
  });

  it('tolera barras y espacios en la variable de entorno', () => {
    // `CORS_ORIGINS=https://construir.com/, https://tienda.com` es exactamente
    // lo que alguien va a escribir a mano en el `.env` del servidor.
    const env = {
      corsOrigins: ' https://construir.com/ , https://tienda.com ',
      produccion: true,
    };
    expect(permite(env, 'https://construir.com')).toBe(true);
    expect(permite(env, 'https://tienda.com')).toBe(true);
  });

  it('en producción sin variables configuradas la lista queda VACÍA', () => {
    // Deliberado: un fallo ruidoso al desplegar es mejor que volver en
    // silencio al "cualquier origen" de antes. `main.ts` avisa por log.
    expect(origenesPermitidos({ produccion: true })).toEqual([]);
    expect(permite({ produccion: true }, 'https://construir.com')).toBe(false);
  });

  it('ignora entradas basura sin tumbar la lista entera', () => {
    const env = {
      corsOrigins: 'no-es-una-url,,https://construir.com',
      produccion: true,
    };
    expect(permite(env, 'https://construir.com')).toBe(true);
  });
});
