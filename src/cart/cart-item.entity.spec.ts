import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';

describe('CartItem', () => {
  const item = (price: number, quantity: number, product: Partial<Product>) => {
    const cartItem = new CartItem();
    cartItem.price = price;
    cartItem.quantity = quantity;
    cartItem.product = product as Product;
    return cartItem;
  };

  it('calcula el subtotal con el precio inclusivo de IVA', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: 2847.8 });
    expect(cartItem.subtotal).toBe(23.2);
  });

  it('calcula el subtotal en VES desde el precio inclusivo, no desde la base', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: 2847.8 });
    expect(cartItem.subtotalVes).toBe(5695.6);
  });

  it('devuelve 0 en VES si el producto no tiene precio inclusivo en VES', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: null as never });
    expect(cartItem.subtotalVes).toBe(0);
  });
});
