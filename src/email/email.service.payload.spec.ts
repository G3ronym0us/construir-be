import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailPayloadBuilder } from './payload.builder';
import { Order, OrderStatus, DeliveryMethod } from '../orders/order.entity';
import { PaymentMethod, PaymentStatus } from '../orders/payment-info.entity';

const CONFIG: Record<string, string> = {
  'app.frontendUrl': 'https://constru-ir.com',
  'app.url': 'https://api.constru-ir.com',
  'app.storeName': 'Construir',
  'app.storeAddress': 'Av. Bolívar 123',
  'app.storeCity': 'Ciudad Bolívar',
  'app.storeHours': 'Lunes a Viernes 8-5',
  'app.storePhone': '+58 285 632 0178',
  'app.storeEmail': 'info@constru-ir.com',
  'app.storeMapUrl': 'https://maps.example/1',
  'app.storeWhatsappUrl': 'https://wa.me/584120000000',
  'app.storeRif': 'J-12345678-9',
  'email.from': '"Construir" <no-reply@constru-ir.com>',
  'email.adminNotificationEmail': 'admin@constru-ir.com',
};

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 35,
    // El fixture del brief no lo trae, pero `sendAdminNewOrder` arma
    // `adminUrl` con `order.uuid`: sin este campo el enlace queda con un
    // "undefined" literal, que es justo lo que `noQuedanHuecos` detecta.
    uuid: 'a63f9f0e-3f8a-4b8b-9b1e-8a2f6c9d4e11',
    orderNumber: 'ORD-MS92XZW4-ASXE',
    status: OrderStatus.ON_HOLD,
    deliveryMethod: DeliveryMethod.PICKUP,
    createdAt: new Date('2026-07-31T15:10:56.000Z'),
    subtotal: 65.0,
    tax: 10.4,
    shipping: 0,
    discountAmount: 0,
    discountCode: null,
    total: 75.4,
    exchangeRate: 481.22,
    exchangeRateDate: '2026-04-19',
    subtotalVes: 31279.3,
    taxVes: 5004.69,
    discountAmountVes: null,
    totalVes: 36283.99,
    guestEmail: 'carlosvas@gmail.com',
    user: null,
    guestCustomer: null,
    shippingAddress: null,
    paymentInfo: {
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
      referenceCode: '998877',
    },
    items: [
      {
        productName: 'TIJERA PODAR MEDIAN 3501-240',
        productSku: '29346',
        quantity: 1,
        price: 27.84,
        priceVes: 13396.16,
        subtotal: 27.84,
        subtotalVes: 13396.16,
        base: 24.0,
        iva: 3.84,
        product: { ivaType: 0 },
      },
    ],
    ...overrides,
  }) as unknown as Order;

describe('EmailService — payload de las plantillas', () => {
  let service: EmailService;
  let enviados: { to: string; subject: string; html: string }[];

  beforeEach(async () => {
    enviados = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        EmailPayloadBuilder,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => CONFIG[clave] },
        },
      ],
    }).compile();

    service = module.get(EmailService);

    // Se intercepta el envío: interesa el HTML, no el SMTP. `as any` (no
    // `as never`) porque con `never` TypeScript infiere la firma del método
    // espiado como `(...args: never) => never`, y ningún `mockImplementation`
    // real —que devuelve `Promise<void>`— es asignable a `never`.
    jest
      .spyOn(service as any, 'sendEmail')
      .mockImplementation((to: string, subject: string, html: string) => {
        enviados.push({ to, subject, html });
      });
  });

  const noQuedanHuecos = (html: string) => {
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
  };

  it('sendOrderConfirmation compone la plantilla sin huecos', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('carlosvas@gmail.com');
    expect(enviados[0].subject).toBeTruthy();
    noQuedanHuecos(enviados[0].html);
  });

  it('muestra el bolívar como protagonista y el dólar de referencia', async () => {
    await service.sendOrderConfirmation(makeOrder());

    const html = enviados[0].html;
    expect(html).toContain('36.283,99');
    expect(html).toContain('75.40');
  });

  it('muestra la tasa con su fecha, no con la del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain('481,22');
  });

  // Un pedido facturado sin tasa disponible no tiene montos en bolívares.
  it('no imprime bloques vacíos cuando no hubo tasa', async () => {
    await service.sendOrderConfirmation(
      makeOrder({
        exchangeRate: null,
        exchangeRateDate: null,
        subtotalVes: null,
        taxVes: null,
        totalVes: null,
      }),
    );

    const html = enviados[0].html;
    expect(html).not.toContain('Bs. null');
    expect(html).not.toContain('Bs. ,');
    noQuedanHuecos(html);
  });

  it('incluye el enlace de seguimiento del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain(
      'https://constru-ir.com/seguimiento/ORD-MS92XZW4-ASXE',
    );
  });

  it('sendPaymentConfirmed compone la plantilla sin huecos', async () => {
    await service.sendPaymentConfirmed(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  it('sendOrderShipped compone la plantilla sin huecos', async () => {
    await service.sendOrderShipped(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  it('sendAdminNewOrder va al correo del admin y no al del cliente', async () => {
    await service.sendAdminNewOrder(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('admin@constru-ir.com');
    noQuedanHuecos(enviados[0].html);
  });
});
