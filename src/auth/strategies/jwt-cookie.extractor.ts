import type { Request } from 'express';
import { SESSION_COOKIE_NAME } from '../session-cookie';

/**
 * Saca el JWT de la cookie de sesión.
 *
 * Se parsea la cabecera `Cookie` a mano en vez de montar `cookie-parser`:
 * es lo único que se necesita leer de las cookies en todo el backend, y
 * agregar una dependencia global para cinco líneas obliga a que todo el que
 * despliegue vuelva a instalar.
 *
 * `req.cookies` se consulta primero por si alguien monta `cookie-parser` más
 * adelante — entonces esto sigue funcionando sin tocar nada.
 */
export function extraerTokenDeCookie(req: Request): string | null {
  const yaParseada = (req as Request & { cookies?: Record<string, string> })
    .cookies?.[SESSION_COOKIE_NAME];
  if (yaParseada) return yaParseada;

  const cabecera = req?.headers?.cookie;
  if (!cabecera) return null;

  for (const par of cabecera.split(';')) {
    const igual = par.indexOf('=');
    if (igual === -1) continue;

    const nombre = par.slice(0, igual).trim();
    if (nombre !== SESSION_COOKIE_NAME) continue;

    const valor = par.slice(igual + 1).trim();
    // Una cookie recién borrada llega como `token=`; devolver la cadena vacía
    // hacía que passport intentara verificar "" y respondiera 500 en vez de 401.
    if (!valor) return null;

    try {
      return decodeURIComponent(valor);
    } catch {
      // Un `%` suelto revienta `decodeURIComponent`. Un JWT sólo tiene
      // caracteres base64url y puntos, así que crudo también sirve.
      return valor;
    }
  }

  return null;
}
