/**
 * Cédula y teléfono venezolanos: una sola definición para todo el backend.
 *
 * Ninguno de los dos se validaba. El cliente podía registrarse con el teléfono
 * "asdf" o con una cédula de tres dígitos, y eso se descubría después: cuando
 * el despachador intentaba llamar para coordinar la entrega, o cuando el
 * recibo salía con una cédula que no existe. Tampoco se guardaban dos veces
 * igual — "0412-1234567", "+58 412 1234567" y "04121234567" son el mismo
 * número — así que buscar a un cliente por su teléfono no encontraba nada.
 *
 * Por eso además de validar se NORMALIZA: lo que entra se guarda siempre en el
 * mismo formato canónico, y quien escribe con guiones, espacios, en minúscula
 * o con el prefijo internacional no recibe un rechazo por algo que sí sabemos
 * interpretar.
 */

/** Prefijos de las cuatro operadoras móviles del país. Los fijos (0212, 0241…) no entran. */
export const PREFIJOS_MOVILES_VE = [
  '0412',
  '0414',
  '0416',
  '0424',
  '0426',
] as const;

/** Formato en el que se guarda un teléfono: `04141234567`. */
export const TELEFONO_MOVIL_VE_CANONICO = /^0(412|414|416|424|426)\d{7}$/;

/** Formato en el que se guarda una cédula: `V-12345678`. */
export const CEDULA_VE_CANONICA = /^[VE]-\d{7,8}$/;

/**
 * Deja un teléfono en su forma canónica, o `null` si no es un móvil venezolano.
 *
 * Se aceptan las formas en las que la gente los escribe de verdad:
 * `0412-123.45.67`, `0412 1234567`, `+58 412 1234567` y `584121234567`.
 */
export function normalizarTelefonoMovilVE(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  // Fuera todo lo que sea separador visual: guiones, puntos, espacios,
  // paréntesis. Sólo interesan los dígitos y un posible "+" del prefijo país.
  let digitos = valor.replace(/[^\d+]/g, '');

  // `+58412...` y `58412...` son el mismo número con el prefijo del país. Se le
  // devuelve el 0 inicial que usa la numeración local.
  digitos = digitos.replace(/^\+?58/, '0');

  // Alguien que escribe "4121234567" se está saltando el 0; es interpretable.
  if (/^4(12|14|16|24|26)\d{7}$/.test(digitos)) {
    digitos = `0${digitos}`;
  }

  return TELEFONO_MOVIL_VE_CANONICO.test(digitos) ? digitos : null;
}

/**
 * Deja una cédula en su forma canónica `V-12345678`, o `null` si no lo es.
 *
 * Se aceptan `v12345678`, `V 12.345.678`, `12345678` (se asume V, que es el
 * caso de la enorme mayoría) y la forma canónica misma.
 */
export function normalizarCedulaVE(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
  const match = /^([VE]?)(\d{7,8})$/.exec(limpio);
  if (!match) return null;

  const [, prefijo, numero] = match;
  return `${prefijo || 'V'}-${numero}`;
}

/**
 * Une el tipo y el número que el formulario pide por separado y normaliza.
 *
 * El registro tiene un `select` de tipo y un campo de número aparte, pero el
 * cliente igual pega "V-12345678" completo en el número: el normalizador se
 * come el prefijo repetido en vez de rechazarlo.
 */
export function normalizarCedulaVEDesdePartes(
  tipo: unknown,
  numero: unknown,
): string | null {
  if (typeof tipo !== 'string' || typeof numero !== 'string') return null;

  const soloNumero = numero
    .trim()
    .toUpperCase()
    .replace(/^[VE][\s.-]*/, '');
  return normalizarCedulaVE(`${tipo}${soloNumero}`);
}

export function esTelefonoMovilVE(valor: unknown): boolean {
  return normalizarTelefonoMovilVE(valor) !== null;
}

export function esCedulaVE(valor: unknown): boolean {
  return normalizarCedulaVE(valor) !== null;
}
