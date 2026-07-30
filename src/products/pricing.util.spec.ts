import { Product } from './product.entity';
import { IvaType } from './enums/iva-type.enum';
import { applyVesPrices } from './pricing.util';

describe('applyVesPrices', () => {
  const build = (price: number, ivaType: IvaType): Product => {
    const product = new Product();
    product.price = price;
    product.ivaType = ivaType;
    return product;
  };

  it('calcula el IVA sobre la base en VES, no convirtiendo el IVA en USD', () => {
    const product = build(10, IvaType.NORMAL);
    applyVesPrices(product, 245.5);
    expect(product.priceVes).toBe(2455);
    expect(product.ivaVes).toBe(392.8);
    expect(product.priceWithIvaVes).toBe(2847.8);
  });

  it('mantiene priceWithIvaVes consistente con priceVes + ivaVes', () => {
    const product = build(7.33, IvaType.REDUCIDO);
    applyVesPrices(product, 245.5);
    expect(product.priceWithIvaVes).toBe(
      Number((product.priceVes + product.ivaVes).toFixed(2)),
    );
  });

  it('deja el IVA en VES en cero para exentos', () => {
    const product = build(10, IvaType.EXENTO);
    applyVesPrices(product, 245.5);
    expect(product.ivaVes).toBe(0);
    expect(product.priceWithIvaVes).toBe(2455);
  });
});
