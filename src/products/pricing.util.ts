import { Product } from './product.entity';
import { IVA_RATES } from './enums/iva-type.enum';

/**
 * Recalcula los tres campos en bolívares de un producto (base, IVA y total con
 * IVA) a partir de su precio en USD, su tipo de IVA y la tasa de cambio actual.
 *
 * Mantiene la misma fórmula que la migración AddIvaToProductsTable: el IVA en
 * VES se calcula sobre el precio base en VES, no convirtiendo el IVA en USD,
 * para que `priceWithIvaVes` quede siempre consistente con `priceVes`.
 *
 * Debe llamarse en TODO punto que setee precios (creación, edición admin,
 * edición v1 y sincronización diaria de tasa) para evitar que los campos de
 * IVA en VES queden congelados en una tasa vieja.
 */
export function applyVesPrices(product: Product, rate: number): void {
  const ivaPct = IVA_RATES[product.ivaType] ?? 0;

  const priceVes = Number((Number(product.price) * rate).toFixed(2));
  const ivaVes = Number((priceVes * ivaPct).toFixed(2));

  product.priceVes = priceVes;
  product.ivaVes = ivaVes;
  product.priceWithIvaVes = Number((priceVes + ivaVes).toFixed(2));
}
