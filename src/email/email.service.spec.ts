import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import { Order, DeliveryMethod, OrderStatus } from '../orders/order.entity';
import { PaymentMethod } from '../orders/payment-info.entity';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService.sendOrderConfirmation', () => {
  let service: EmailService;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue(undefined);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });

    const configValues: Record<string, unknown> = {
      'app.url': 'http://localhost:3000',
      'app.frontendUrl': 'http://localhost:4000',
      'app.storeName': 'Construir',
      'app.storeAddress': 'Av. Principal',
      'app.storeCity': 'Caracas',
      'app.storePhone': '0212-1234567',
      'app.storeHours': 'Lun-Vie 8-5',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => configValues[key]) },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  // Reproduce el escenario del review final: un pedido con cupón donde
  // `order_items.subtotal` viene NETO de la porción de descuento de la línea
  // (post-branch), mientras `price` sigue siendo el precio unitario bruto de
  // catálogo. Antes del arreglo, el template renderizaba "3 × $3.00" al lado
  // de un monto de renglón que ya no era 9.00 (el neto), y el descuento no
  // aparecía en ningún lado.
  const buildOrder = (): Order =>
    ({
      orderNumber: 'ORD-TEST-0001',
      createdAt: new Date('2026-07-29T00:00:00Z'),
      status: OrderStatus.ON_HOLD,
      deliveryMethod: DeliveryMethod.PICKUP,
      subtotal: 4.53,
      tax: 0.72,
      shipping: 0,
      total: 8.98,
      discountAmount: 4.27,
      discountCode: 'PROMO5',
      notes: null,
      guestEmail: 'cliente@example.com',
      user: null,
      shippingAddress: null,
      paymentInfo: { method: PaymentMethod.PAGOMOVIL },
      items: [
        {
          productName: 'Tornillo 1/4',
          quantity: 3,
          price: 3.0, // precio unitario bruto (con IVA), de catálogo
          subtotal: 4.73, // neto de la porción de descuento de la línea
        },
      ],
    }) as unknown as Order;

  it('incluye el descuento en el contexto y el monto de renglón es coherente con el precio unitario', async () => {
    const order = buildOrder();

    await service.sendOrderConfirmation(order);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const html: string = sendMailMock.mock.calls[0][0].html;

    // El renglón cierra a la vista: cantidad × precio unitario, no el
    // `subtotal` neto de descuento.
    expect(html).toContain('Cantidad: 3 × $3.00');
    expect(html).toContain('$9.00');
    // El monto neto (post-descuento) de la línea NO debe aparecer como si
    // fuera cantidad × precio: sería la aritmética rota que el bug producía.
    expect(html).not.toContain('$4.73');

    // El descuento aparece, con su código, en el bloque de totales.
    expect(html).toContain('Descuento (PROMO5): -$4.27');
  });

  it('no muestra la fila de descuento cuando el pedido no tiene cupón', async () => {
    const order = buildOrder();
    order.discountAmount = 0 as unknown as number;
    order.discountCode = null;

    await service.sendOrderConfirmation(order);

    const html: string = sendMailMock.mock.calls[0][0].html;
    expect(html).not.toContain('Descuento');
  });
});
