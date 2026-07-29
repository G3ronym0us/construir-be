import { Product } from './product.entity';
import { IvaType } from './enums/iva-type.enum';

describe('Product.syncUsdIvaFields', () => {
  const build = (price: number, ivaType?: IvaType): Product => {
    const product = new Product();
    product.price = price;
    if (ivaType !== undefined) product.ivaType = ivaType;
    return product;
  };

  it('deriva iva y priceWithIva desde price y ivaType', () => {
    const product = build(10, IvaType.NORMAL);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(1.6);
    expect(product.priceWithIva).toBe(11.6);
  });

  it('deja el IVA en cero para productos exentos', () => {
    const product = build(10, IvaType.EXENTO);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(0);
    expect(product.priceWithIva).toBe(10);
  });

  it('sobreescribe valores congelados de una carga anterior', () => {
    const product = build(20, IvaType.NORMAL);
    product.iva = 1.6; // valor viejo, correspondía a price = 10
    product.priceWithIva = 11.6;
    product.syncUsdIvaFields();
    expect(product.iva).toBe(3.2);
    expect(product.priceWithIva).toBe(23.2);
  });

  it('trata price como string, tal como lo devuelve el driver de Postgres', () => {
    const product = new Product();
    product.price = '10.00' as unknown as number;
    product.ivaType = IvaType.NORMAL;
    product.syncUsdIvaFields();
    expect(product.priceWithIva).toBe(11.6);
  });

  it('asume NORMAL cuando ivaType no está definido, no exento', () => {
    const product = build(10);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(1.6);
  });
});
