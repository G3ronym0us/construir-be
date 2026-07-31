import { toWooOrder, formatLocalDate } from './woo-order.serializer';
import { round2 } from '../../products/iva.util';
import { Order, OrderStatus, DeliveryMethod } from '../../orders/order.entity';
import { OrderItem } from '../../orders/order-item.entity';
import { ShippingAddress } from '../../orders/shipping-address.entity';
import { GuestCustomer } from '../../orders/guest-customer.entity';
import { User } from '../../users/user.entity';
import { Product } from '../../products/product.entity';
import { IvaType } from '../../products/enums/iva-type.enum';

const TZ = 'America/Caracas';

// `product` se tipea aparte porque en la entidad es `Product` no nulo, pero en
// runtime puede llegar `null` cuando el producto fue borrado — el resto del
// código (p.ej. `orders.service.ts`) ya lo trata como opcional con `?.`.
const makeItem = (
  overrides: Partial<Omit<OrderItem, 'product'>> & {
    product?: Product | null;
  } = {},
): OrderItem =>
  ({
    id: 1,
    productName: 'Cemento',
    productSku: 'CEM-001',
    product: { id: 10, ivaType: IvaType.NORMAL } as Product,
    quantity: 2,
    price: 11.6,
    subtotal: 23.2,
    base: 20.0,
    iva: 3.2,
    ...overrides,
  }) as OrderItem;

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 34,
    status: OrderStatus.ON_HOLD,
    createdAt: new Date('2026-07-31T04:37:03.000Z'),
    total: 23.2,
    tax: 3.2,
    deliveryMethod: DeliveryMethod.PICKUP,
    notes: null,
    user: null,
    guestEmail: null,
    guestCustomer: null,
    shippingAddress: null,
    items: [makeItem()],
    ...overrides,
  }) as Order;

describe('toWooOrder', () => {
  describe('convención de impuestos', () => {
    it('emite el total del renglón SIN IVA y el impuesto aparte', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].total).toBe('20.00');
      expect(woo.line_items[0].total_tax).toBe('3.20');
    });

    it('emite price como el unitario sin IVA, sin redondear', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].price).toBe(10);
      expect(
        Math.round(woo.line_items[0].price * woo.line_items[0].quantity * 100) /
          100,
      ).toBe(Number(woo.line_items[0].total));
    });

    // La invariante del contrato: los renglones van sin IVA y el total de la
    // orden lo incluye. Es la que hoy NO se cumple.
    it('Σ total + Σ total_tax de los renglones da el total de la orden', () => {
      const order = makeOrder({
        total: 34.8,
        tax: 4.8,
        items: [
          makeItem({ id: 1, base: 20.0, iva: 3.2, subtotal: 23.2 }),
          makeItem({ id: 2, base: 10.0, iva: 1.6, subtotal: 11.6 }),
        ],
      });

      const woo = toWooOrder(order, TZ);
      const sumTotal = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total),
        0,
      );
      const sumTax = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total_tax),
        0,
      );

      expect(Math.round((sumTotal + sumTax) * 100) / 100).toBe(
        Number(woo.total),
      );
    });

    it('deriva tax_rate del desglose guardado y emite tax_class vacío', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].tax_rate).toBe(16);
      expect(woo.line_items[0].tax_class).toBe('');
    });

    it('no divide por cero cuando la base quedó en 0 por descuento', () => {
      const order = makeOrder({
        items: [makeItem({ base: 0, iva: 0, subtotal: 0 })],
      });

      expect(toWooOrder(order, TZ).line_items[0].tax_rate).toBe(0);
    });
  });

  describe('órdenes anteriores a la migración', () => {
    // base/iva en NULL: se deriva al vuelo del ivaType vivo, pero se emite
    // bajo la convención correcta igual que una orden nueva.
    it('deriva el desglose y lo emite sin IVA', () => {
      const order = makeOrder({
        items: [makeItem({ base: null, iva: null, subtotal: 23.2 })],
      });

      const woo = toWooOrder(order, TZ);

      expect(woo.line_items[0].total).toBe('20.00');
      expect(woo.line_items[0].total_tax).toBe('3.20');
    });

    it('trata un producto borrado como alícuota normal, igual que antes', () => {
      const order = makeOrder({
        items: [makeItem({ base: null, iva: null, product: null })],
      });

      expect(toWooOrder(order, TZ).line_items[0].total_tax).toBe('3.20');
    });

    it('respeta la exención cuando el desglose guardado dice 0', () => {
      const order = makeOrder({
        items: [
          makeItem({ base: 23.2, iva: 0, subtotal: 23.2, product: null }),
        ],
      });

      expect(toWooOrder(order, TZ).line_items[0].total_tax).toBe('0.00');
    });
  });

  describe('billing', () => {
    it('emite strings vacíos, nunca null', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.billing).toMatchObject({
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        email: '',
        phone: '',
      });
      expect(woo.customer_note).toBe('');
    });

    it('resuelve nombre y correo del usuario autenticado', () => {
      const order = makeOrder({
        user: {
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@test.com',
          identificationType: 'V',
          identificationNumber: '12345678',
        } as User,
      });

      expect(toWooOrder(order, TZ).billing).toMatchObject({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
      });
    });

    it('resuelve del guest customer cuando no hay usuario', () => {
      const order = makeOrder({
        guestEmail: 'guest@test.com',
        guestCustomer: {
          firstName: 'María',
          lastName: 'González',
          email: 'guest@test.com',
        } as GuestCustomer,
      });

      expect(toWooOrder(order, TZ).billing).toMatchObject({
        first_name: 'María',
        last_name: 'González',
        email: 'guest@test.com',
      });
    });

    it('cae al guestEmail cuando no hay perfil', () => {
      const order = makeOrder({ guestEmail: 'suelto@test.com' });

      expect(toWooOrder(order, TZ).billing.email).toBe('suelto@test.com');
    });

    it('emite la identificación en address_2 y en identification', () => {
      const order = makeOrder({
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '20708398',
        } as GuestCustomer,
      });

      const { billing } = toWooOrder(order, TZ);
      expect(billing.address_2).toBe('V-20708398');
      expect(billing.identification).toBe('V-20708398');
    });

    // Cuando el invitado marca "crear cuenta", el pedido queda con usuario Y
    // con ficha de invitado, pero el usuario nace sin cédula. Resolverla por
    // rama dejaba al ERP sin cédula en toda orden con alta de cuenta.
    it('toma la identificación de la ficha del invitado si el usuario no la tiene', () => {
      const order = makeOrder({
        user: {
          firstName: 'Carmen',
          lastName: 'Pineda',
          email: 'carmen@test.com',
          identificationType: null,
          identificationNumber: null,
        } as unknown as User,
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '2345678',
        } as GuestCustomer,
      });

      const { billing } = toWooOrder(order, TZ);
      expect(billing.address_2).toBe('V-2345678');
      expect(billing.identification).toBe('V-2345678');
      // El nombre y el correo sí salen del usuario: ahí manda la cuenta.
      expect(billing.first_name).toBe('Carmen');
      expect(billing.email).toBe('carmen@test.com');
    });

    it('la identificación del usuario gana sobre la del invitado', () => {
      const order = makeOrder({
        user: {
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@test.com',
          identificationType: 'V',
          identificationNumber: '11111111',
        } as unknown as User,
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '22222222',
        } as GuestCustomer,
      });

      expect(toWooOrder(order, TZ).billing.address_2).toBe('V-11111111');
    });

    it('la dirección de envío tiene prioridad para la identificación', () => {
      const order = makeOrder({
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '111',
        } as GuestCustomer,
        shippingAddress: {
          identificationType: 'J',
          identificationNumber: '222',
        } as ShippingAddress,
      });

      expect(toWooOrder(order, TZ).billing.address_2).toBe('J-222');
    });

    // Una orden de pickup no tiene dirección de envío; el teléfono vive en el
    // perfil y sin él no se coordina el retiro.
    it('toma el teléfono del perfil cuando no hay dirección de envío', () => {
      const order = makeOrder({
        guestCustomer: { phone: '04249428607' } as GuestCustomer,
      });

      expect(toWooOrder(order, TZ).billing.phone).toBe('04249428607');
    });

    // Tercer operando de la cadena `??`: un usuario autenticado (no guest)
    // sin dirección de envío en la orden.
    it('cae al teléfono del usuario autenticado cuando no hay dirección ni guestCustomer', () => {
      const order = makeOrder({
        user: { phone: '04121112233' } as User,
      });

      expect(toWooOrder(order, TZ).billing.phone).toBe('04121112233');
    });

    it('la dirección de envío tiene prioridad para el teléfono', () => {
      const order = makeOrder({
        guestCustomer: { phone: '04249428607' } as GuestCustomer,
        shippingAddress: { phone: '04121234567' } as ShippingAddress,
      });

      expect(toWooOrder(order, TZ).billing.phone).toBe('04121234567');
    });
  });

  // El ancla de todo el contrato: una orden equivalente a la 6284 del payload
  // real de OrbisNet, con sus cuatro renglones y sus números exactos.
  describe('caso de referencia: la orden 6284 de OrbisNet', () => {
    const referencia = () =>
      makeOrder({
        id: 6284,
        total: 124.79,
        tax: 17.21,
        createdAt: new Date('2023-11-14T21:48:13.000Z'), // 17:48:13 en Caracas
        guestCustomer: {
          firstName: 'Jesus',
          lastName: 'Morales',
          email: 'admin@constru-ir.com',
          phone: '04120776574',
          identificationType: 'V',
          identificationNumber: '20708398',
        } as GuestCustomer,
        items: [
          makeItem({
            id: 75,
            productName: 'BOMBA AGUA  1/2HP PERIF GENPAR GBP-050-A',
            quantity: 3,
            base: 98.46,
            iva: 15.75,
            subtotal: 114.21,
          }),
          makeItem({
            id: 76,
            productName: 'CODO HG  1/2X90',
            quantity: 5,
            base: 4.55,
            iva: 0.73,
            subtotal: 5.28,
          }),
          makeItem({
            id: 77,
            productName: 'CODO PCO A/B S 1/2X090',
            quantity: 7,
            base: 2.17,
            iva: 0.35,
            subtotal: 2.52,
          }),
          makeItem({
            id: 78,
            productName: 'CODO UNIT AB  1/2X90 SOLD UNITECA',
            quantity: 10,
            base: 2.4,
            iva: 0.38,
            subtotal: 2.78,
          }),
        ],
      });

    it('emite los renglones con los montos exactos del payload real', () => {
      const woo = toWooOrder(referencia(), TZ);

      expect(
        woo.line_items.map((l) => ({
          total: l.total,
          total_tax: l.total_tax,
          tax_rate: l.tax_rate,
          quantity: l.quantity,
        })),
      ).toEqual([
        { total: '98.46', total_tax: '15.75', tax_rate: 16, quantity: 3 },
        { total: '4.55', total_tax: '0.73', tax_rate: 16, quantity: 5 },
        { total: '2.17', total_tax: '0.35', tax_rate: 16, quantity: 7 },
        { total: '2.40', total_tax: '0.38', tax_rate: 16, quantity: 10 },
      ]);
    });

    it('reproduce el price unitario de cada renglón', () => {
      const woo = toWooOrder(referencia(), TZ);
      const precios = woo.line_items.map((l) => round2(l.price));

      expect(precios).toEqual([32.82, 0.91, 0.31, 0.24]);
    });

    // Discrimina la decisión deliberada de no redondear `price`: 4.55 / 5 no
    // cae exacto en punto flotante. Si el código redondeara antes de emitir,
    // este valor daría 0.91 y la mutación pasaría desapercibida.
    it('emite price sin redondear, con el residuo de punto flotante intacto', () => {
      const woo = toWooOrder(referencia(), TZ);

      expect(woo.line_items[1].price).toBe(0.9099999999999999);
    });

    it('cierra contra el total de la orden', () => {
      const woo = toWooOrder(referencia(), TZ);
      const suma = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total) + Number(l.total_tax),
        0,
      );

      expect(round2(suma)).toBe(124.79);
      expect(woo.total).toBe('124.79');
      expect(woo.total_tax).toBe('17.21');
    });

    it('emite la fecha, la identificación y el teléfono como los espera el ERP', () => {
      const woo = toWooOrder(referencia(), TZ);

      expect(woo.date_created).toBe('2023-11-14T17:48:13');
      expect(woo.number).toBe('6284');
      expect(woo.billing.address_2).toBe('V-20708398');
      expect(woo.billing.phone).toBe('04120776574');
    });
  });

  describe('resto del contrato', () => {
    it('emite date_created en hora local de la tienda', () => {
      // 04:37 UTC son las 00:37 en Caracas: cruza el cambio de día.
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.date_created).toBe('2026-07-31T00:37:03');
    });

    it('number es el id como string', () => {
      expect(toWooOrder(makeOrder(), TZ).number).toBe('34');
    });

    it('traduce el método de entrega', () => {
      expect(toWooOrder(makeOrder(), TZ).payment_method_title).toBe(
        'Entrega y/o recogida en el local',
      );
      expect(
        toWooOrder(makeOrder({ deliveryMethod: DeliveryMethod.DELIVERY }), TZ)
          .payment_method_title,
      ).toBe('Envío a domicilio');
    });

    it('emite product_id 0 cuando el producto fue borrado', () => {
      const order = makeOrder({ items: [makeItem({ product: null })] });

      expect(toWooOrder(order, TZ).line_items[0].product_id).toBe(0);
    });

    it('el total de la orden sí incluye el IVA', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.total).toBe('23.20');
      expect(woo.total_tax).toBe('3.20');
    });
  });

  describe('formatLocalDate con STORE_TIMEZONE inválido', () => {
    // Sin esto, un typo en la variable de entorno tira un RangeError críptico
    // de Intl ("Invalid time zone specified") y convierte todo listado del
    // ERP en un 500 permanente sin pista de la causa.
    it('falla con un mensaje que señala el valor inválido, no el RangeError críptico de Intl', () => {
      expect(() =>
        formatLocalDate(new Date('2026-07-31T04:37:03.000Z'), 'Not/AZone'),
      ).toThrow('STORE_TIMEZONE inválido: "Not/AZone"');
    });

    it('sigue funcionando con una zona válida', () => {
      expect(formatLocalDate(new Date('2026-07-31T04:37:03.000Z'), TZ)).toBe(
        '2026-07-31T00:37:03',
      );
    });
  });
});
