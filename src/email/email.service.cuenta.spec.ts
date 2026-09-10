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

describe('EmailService — correos de cuenta', () => {
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

  it('sendPasswordReset incluye el correo y el enlace', async () => {
    await service.sendPasswordReset({
      to: 'ana@example.com',
      firstName: 'Ana',
      resetUrl: 'https://constru-ir.com/reset-password?token=abc',
      storeName: 'Construir',
    });

    const html = enviados[0].html;
    expect(html).toContain('https://constru-ir.com/reset-password?token=abc');
    expect(html).toContain('ana@example.com');
    noQuedanHuecos(html);
  });

  it('sendEmailVerification incluye el enlace de verificación', async () => {
    await service.sendEmailVerification({
      to: 'ana@example.com',
      firstName: 'Ana',
      verificationUrl: 'https://constru-ir.com/verify-email?token=abc',
      storeName: 'Construir',
    });

    const html = enviados[0].html;
    // Mismo patrón que 'sendPasswordReset incluye el correo y el enlace': si
    // la plantilla pierde `{{{verificationUrl}}}`, el `href` queda vacío y
    // `noQuedanHuecos` no lo detecta (Handlebars no estricto renderiza la
    // variable ausente como cadena vacía, no como "undefined").
    expect(html).toContain('https://constru-ir.com/verify-email?token=abc');
    noQuedanHuecos(html);
  });

  it('sendWelcome compone la plantilla sin huecos', async () => {
    await service.sendWelcome({ to: 'ana@example.com', firstName: 'Ana' });

    expect(enviados[0].to).toBe('ana@example.com');
    noQuedanHuecos(enviados[0].html);
  });

  it('sendPaymentRejected compone la plantilla sin huecos', async () => {
    await service.sendPaymentRejected(makeOrder());

    noQuedanHuecos(enviados[0].html);
  });

  // El dato no se recoge en ninguna parte, así que ese renglón no debe pintarse.
  it('sendPaymentRejected omite el monto reportado, que no se recoge', async () => {
    await service.sendPaymentRejected(makeOrder());

    expect(enviados[0].html).not.toContain('Bs. </td>');
  });
});
