/**
 * Reduce un referrer a su origen: `https://google.com/buscar?q=...` → `https://google.com`.
 *
 * **La regla vive aquí y sólo aquí.** El backend es quien manda: aplica esto a
 * todo lo que llega, venga del navegador de la tienda o de cualquier otro
 * cliente, así que da igual lo que mande quien llame.
 *
 * El motivo no es teórico. En esta misma tabla había guardadas URLs completas
 * con el `?token=` de una invitación de registro: un secreto de un solo uso
 * copiado a un almacén de analítica que nadie vigila. La ruta de procedencia
 * también arrastra términos de búsqueda e identificadores de campaña del
 * visitante. Del referrer sólo se ha consultado nunca "de dónde llega la
 * gente", y para eso el origen basta.
 *
 * Nunca lanza: el registro de visitas no debe perderse por un referrer raro.
 * Lo que no sea una URL http(s) utilizable acaba en `null`, que es como se
 * guarda "no hay procedencia":
 *
 * - `''`, espacios, `undefined`  → `null` (la navegación directa manda esto)
 * - `about:blank`, `data:...`     → `null` (no son un origen web)
 * - `no-es-una-url`               → `null` (no revienta)
 * - `android-app://com.x`         → `null` (origen opaco: la URL lo serializa
 *                                   como la cadena "null", que no queremos
 *                                   guardar literalmente)
 * - `https://user:clave@host/x`   → `https://host` (el userinfo no llega nunca;
 *                                   `URL.origin` no lo incluye)
 * - `HTTPS://Host.COM/x`          → `https://host.com` (esquema y host en
 *                                   minúsculas, como manda la norma)
 * - referrer interno de la tienda → su propio origen, tratado como cualquier otro
 */
export function aOrigenDeReferrer(referrer?: string | null): string | null {
  if (typeof referrer !== 'string') return null;

  const limpio = referrer.trim();
  if (limpio === '') return null;

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  // `origin` ya incluye el puerto cuando no es el estándar del esquema.
  return url.origin && url.origin !== 'null' ? url.origin : null;
}
