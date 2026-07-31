/**
 * Formateo de los montos que muestran los correos.
 *
 * El diseño pide bolívar protagonista y dólar de referencia. El bolívar va en
 * `es-VE` —punto de millares, coma decimal— y **sin** el prefijo "Bs.": lo pone
 * la plantilla, que lo maqueta aparte.
 *
 * Un monto ausente viaja como `null` y no como `"0,00"`: la plantilla oculta el
 * bloque. Un pedido facturado sin tasa disponible no tiene monto en bolívares,
 * y decir "Bs. 0,00" sería afirmar algo falso.
 */

const VES = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Acepta el string que TypeORM devuelve para las columnas `numeric`. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function formatVes(
  amount: number | string | null | undefined,
): string | null {
  const n = toNumber(amount);
  return n === null ? null : VES.format(n);
}
