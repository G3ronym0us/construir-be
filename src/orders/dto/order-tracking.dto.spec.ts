import { toOrderTrackingDto } from './order-tracking.dto';
import { Order, OrderStatus, DeliveryMethod } from '../order.entity';
import { OrderItem } from '../order-item.entity';
import {
  PaymentInfo,
  PaymentMethod,
  PaymentStatus,
} from '../payment-info.entity';
import { ShippingAddress } from '../shipping-address.entity';
import { GuestCustomer } from '../guest-customer.entity';

/**
 * Una orden como la devuelve TypeORM: con TODAS las relaciones cargadas, que
 * es justo lo que hacía peligroso devolver la entidad cruda en el endpoint
 * público de seguimiento.
 */
const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 34,
    uuid: 'f6e23aa7-cb48-4c2b-a311-a0668087fe24',
    orderNumber: 'ORD-MS8GATGP-UP2H',
    status: OrderStatus.ON_HOLD,
    deliveryMethod: DeliveryMethod.PICKUP,
    createdAt: new Date('2026-07-31T04:37:03.000Z'),
    dateCompleted: null,

    subtotal: '347.00',
    tax: '55.52',
    shipping: '0.00',
    discountCode: null,
    discountAmount: '0.00',
    total: '402.52',
    exchangeRate: '481.22',
    subtotalVes: '166983.34',
    taxVes: '26717.34',
    discountAmountVes: '0.00',
    totalVes: '193700.68',

    orderKey: 'OC-ORBIS-88213',
    adminNotes: 'Cliente pidió factura a nombre de la empresa',
    notes: null,
    userId: null,
    guestEmail: 'carlosp@gmail.com',
    guestCustomerId: 10,
    guestCustomer: {
      firstName: 'Carlos',
      lastName: 'Pineda',
      email: 'carlosp@gmail.com',
      phone: '04249428607',
      identificationType: 'V',
      identificationNumber: '1234567',
      address: 'Av. Bolívar 123',
      latitude: 10.5,
      longitude: -66.9,
    } as unknown as GuestCustomer,
    shippingAddress: null as unknown as ShippingAddress,
    paymentInfo: {
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
      cedula: '1234567',
      phoneNumber: '04249428607',
      referenceCode: '998877',
      senderName: 'Carlos Pineda',
      receiptUrl: 'https://bucket.s3.amazonaws.com/receipts/abc.jpg',
      receiptKey: 'receipts/abc.jpg',
    } as unknown as PaymentInfo,

    items: [
      {
        uuid: 'item-uuid-1',
        productName: 'ANGULO H.NEGRO 50X50X4MM X6MT',
        productSku: '10943',
        quantity: 1,
        price: '37.12',
        priceVes: '17862.89',
        subtotal: '37.12',
        subtotalVes: '17862.89',
      } as unknown as OrderItem,
    ],
    ...overrides,
  }) as Order;

describe('toOrderTrackingDto', () => {
  it('expone el avance del pedido: estado, fechas, montos y renglones', () => {
    const dto = toOrderTrackingDto(makeOrder());

    expect(dto.orderNumber).toBe('ORD-MS8GATGP-UP2H');
    expect(dto.status).toBe(OrderStatus.ON_HOLD);
    expect(dto.deliveryMethod).toBe(DeliveryMethod.PICKUP);
    expect(dto.total).toBe('402.52');
    expect(dto.totalVes).toBe('193700.68');
    expect(dto.tax).toBe('55.52');
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0]).toMatchObject({
      productName: 'ANGULO H.NEGRO 50X50X4MM X6MT',
      productSku: '10943',
      quantity: 1,
      subtotal: '37.12',
    });
  });

  it('del pago sólo deja el método y el estado', () => {
    const dto = toOrderTrackingDto(makeOrder());

    expect(dto.paymentInfo).toEqual({
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
    });
  });

  // El corazón del arreglo: nada de esto puede viajar en una respuesta que se
  // obtiene con sólo el número de orden.
  it('no filtra datos del cliente, del pago ni internos', () => {
    const dto = toOrderTrackingDto(makeOrder({ discountCode: 'DESCUENTO10' }));
    const serializado = JSON.stringify(dto);

    const prohibidos = [
      '1234567', // cédula
      '04249428607', // teléfono
      'carlosp@gmail.com', // correo
      'Av. Bolívar 123', // domicilio
      '998877', // referencia del pago
      'receipts/abc.jpg', // comprobante en S3
      'OC-ORBIS-88213', // referencia del ERP
      'Cliente pidió factura', // notas internas
      'DESCUENTO10', // cupón: es funcional, no informativo
    ];

    for (const dato of prohibidos) {
      expect(serializado).not.toContain(dato);
    }

    expect(dto).not.toHaveProperty('guestCustomer');
    expect(dto).not.toHaveProperty('shippingAddress');
    expect(dto).not.toHaveProperty('adminNotes');
    expect(dto).not.toHaveProperty('orderKey');
    expect(dto).not.toHaveProperty('guestEmail');
    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('id');
    expect(dto).not.toHaveProperty('discountCode');
  });

  it('tolera una orden sin pago y sin renglones cargados', () => {
    const dto = toOrderTrackingDto(
      makeOrder({
        paymentInfo: null as unknown as PaymentInfo,
        items: undefined as unknown as OrderItem[],
      }),
    );

    expect(dto.paymentInfo).toBeNull();
    expect(dto.items).toEqual([]);
  });

  it('conserva los nulos de los montos en bolívares', () => {
    const dto = toOrderTrackingDto(
      makeOrder({
        exchangeRate: null,
        subtotalVes: null,
        taxVes: null,
        totalVes: null,
      }),
    );

    expect(dto.exchangeRate).toBeNull();
    expect(dto.totalVes).toBeNull();
    expect(dto.total).toBe('402.52');
  });
});
