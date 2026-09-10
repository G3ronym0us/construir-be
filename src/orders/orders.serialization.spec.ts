import { instanceToPlain } from 'class-transformer';
import { Order, OrderStatus, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';

/**
 * `totalItems` es un getter del prototipo, y `instanceToPlain` sólo incluye
 * esos si llevan `@Expose()`. Sin el decorador, `GET /orders` y
 * `GET /orders/:uuid` respondían SIN el campo, y "Mis pedidos" le mostraba al
 * cliente "undefined productos" debajo de cada compra.
 *
 * Es el mismo fallo que ya cazó `cart.serialization.spec.ts` para el carrito, y
 * se prueba igual: NO sobre la entidad —donde el getter siempre funciona y la
 * prueba pasaría aunque el decorador no estuviera— sino sobre
 * `instanceToPlain`, que es lo que arma de verdad la respuesta HTTP.
 */
describe('serialización de Order', () => {
  const construirPedido = (cantidades: number[]): Order => {
    const pedido = new Order();
    pedido.uuid = 'order-uuid-1';
    pedido.orderNumber = 'ORD-MSA0K346-LP53';
    pedido.status = OrderStatus.COMPLETED;
    pedido.deliveryMethod = DeliveryMethod.PICKUP;
    pedido.items = cantidades.map((quantity) => {
      const renglon = new OrderItem();
      renglon.quantity = quantity;
      return renglon;
    });
    return pedido;
  };

  it('expone las unidades del pedido en la respuesta HTTP', () => {
    const plano = instanceToPlain(construirPedido([1, 2, 4]));

    // La comprobación que importa: que la CLAVE exista. Sin `@Expose()` el
    // valor no es incorrecto, es que el campo no está.
    expect(plano).toHaveProperty('totalItems');
    expect(plano.totalItems).toBe(7);
  });

  it('cuenta cero unidades cuando el pedido no trae renglones cargados', () => {
    const pedido = construirPedido([]);
    pedido.items = undefined as unknown as OrderItem[];

    const plano = instanceToPlain(pedido);

    expect(plano).toHaveProperty('totalItems');
    expect(plano.totalItems).toBe(0);
  });
});
