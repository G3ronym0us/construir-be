import { Product } from './product.entity';
import { fromBase, round2 } from './iva.util';

/**
 * Recalcula los tres campos en bolívares de un producto (base, IVA y total con
 * IVA) a partir de su precio en USD, su tipo de IVA y la tasa de cambio dada.
 *
 * El IVA en VES se calcula sobre la base ya convertida a VES, no convirtiendo
 * el IVA en USD, para que `priceWithIvaVes` quede siempre consistente con
 * `priceVes`. Es el mismo criterio de la migración AddIvaToProductsTable.
 *
 * Debe llamarse en todo punto que setee precios (creación, edición v1 y
 * sincronización diaria de tasa) para que los campos VES no queden congelados
 * en una tasa vieja. Los campos USD ya no dependen de esta función: los deriva
 * `Product.syncUsdIvaFields()` por hook de entidad.
 */
export function applyVesPrices(product: Product, rate: number): void {
  const priceVes = round2(Number(product.price) * rate);
  const { base, iva, total } = fromBase(priceVes, product.ivaType);

  product.priceVes = base;
  product.ivaVes = iva;
  product.priceWithIvaVes = total;
}
