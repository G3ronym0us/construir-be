import { getMetadataArgsStorage } from 'typeorm';
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

  // Bloqueante del review final: los tests de arriba llaman a
  // `syncUsdIvaFields()` directo, así que quedan en verde aunque alguien
  // borre los decoradores `@BeforeInsert`/`@BeforeUpdate` de la entidad —
  // y esos decoradores son la única defensa contra el bug más caro de esta
  // rama (precios que cambian en `price` sin que `iva`/`price_with_iva` se
  // actualicen, porque nadie volvió a llamar al método). Este test lee la
  // metadata que TypeORM arma a partir de los decoradores, no el método.
  // Verificado manualmente borrando cada decorador por separado: el test
  // falla en ambos casos; con los dos decoradores presentes, pasa.
  it('registra syncUsdIvaFields como listener de before-insert y before-update', () => {
    const listeners = getMetadataArgsStorage().entityListeners.filter(
      (listener) =>
        listener.target === Product &&
        listener.propertyName === 'syncUsdIvaFields',
    );

    const types = listeners.map((listener) => listener.type);

    expect(types).toContain('before-insert');
    expect(types).toContain('before-update');
  });
});
