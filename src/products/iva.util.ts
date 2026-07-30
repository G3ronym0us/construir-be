import { IvaType, IVA_RATES } from './enums/iva-type.enum';

export interface IvaBreakdown {
  /** Monto sin IVA. */
  base: number;
  /** Monto del IVA. */
  iva: number;
  /** Monto con IVA incluido. Siempre exactamente `base + iva`. */
  total: number;
}

/**
 * Redondeo monetario a 2 decimales.
 *
 * No usa `Math.round(v * 100) / 100` porque esa forma falla en los empates:
 * `1.005 * 100` da 100.49999999999999 en punto flotante y redondearía a 1.00
 * en vez de 1.01. Desplazar el punto decimal por notación exponencial sobre la
 * representación en texto evita el error, porque el parseo decimal no arrastra
 * el residuo binario de la multiplicación.
 */
export function round2(value: number): number {
  // JS imprime los números con magnitud menor a 1e-6 en notación exponencial
  // (`${9e-7}` da "9e-7"), lo que rompe el desplazamiento de punto decimal
  // por texto de más abajo: el template armaría "9e-7e2", que Number() no
  // puede parsear y devolvería NaN. Cualquier valor tan chico redondea a 0 en
  // 2 decimales de todos modos, así que se corta antes de llegar ahí.
  if (value !== 0 && Math.abs(value) < 1e-6) {
    return 0;
  }

  return Number(`${Math.round(Number(`${value}e2`))}e-2`);
}

function rateOf(ivaType: IvaType): number {
  // IvaType.NORMAL es 0, así que un ivaType ausente no puede resolverse con
  // `?? 0`: eso daría alícuota 0 (exento) en vez de 16%.
  return IVA_RATES[ivaType ?? IvaType.NORMAL] ?? IVA_RATES[IvaType.NORMAL];
}

/**
 * Deriva el desglose a partir de una base sin IVA.
 *
 * El total sale de sumar base + IVA ya redondeados, nunca de redondear el
 * producto por separado, para que la identidad `base + iva === total` se
 * cumpla exacto.
 */
export function fromBase(base: number, ivaType: IvaType): IvaBreakdown {
  const roundedBase = round2(base);
  const iva = round2(roundedBase * rateOf(ivaType));
  return { base: roundedBase, iva, total: round2(roundedBase + iva) };
}

/**
 * Extrae el desglose a partir de un monto que ya incluye IVA.
 *
 * El IVA sale por resta contra el total, no de redondear el producto, por la
 * misma razón que en `fromBase`.
 */
export function fromTotal(total: number, ivaType: IvaType): IvaBreakdown {
  const roundedTotal = round2(total);
  const base = round2(roundedTotal / (1 + rateOf(ivaType)));
  return { base, iva: round2(roundedTotal - base), total: roundedTotal };
}
