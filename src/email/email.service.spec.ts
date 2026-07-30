import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';
import { Order, DeliveryMethod, OrderStatus } from '../orders/order.entity';
import { PaymentMethod } from '../orders/payment-info.entity';
import { OrderPricingService } from '../orders/order-pricing.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Product } from '../products/product.entity';
import { IvaType } from '../products/enums/iva-type.enum';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

// El precio unitario y la alícuota son los del ejemplo real de
// docs/pricing-iva.md (3 unidades a 11.60, cupón de 3.48): 3 × 11.60 = 34.80,
// descuento 3.48, neto 31.32 -> base 27.00 + IVA 4.32.
const producto = (priceWithIva: string, ivaType: IvaType): Product =>
  ({ priceWithIva, ivaType, id: 1 }) as unknown as Product;

describe('EmailService.sendOrderConfirmation', () => {
  let service: EmailService;
  let sendMailMock: jest.Mock;
  let pricingService: OrderPricingService;
  let discountsService: { validateDiscount: jest.Mock; findByCode: jest.Mock };

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

    discountsService = {
      validateDiscount: jest.fn(),
      findByCode: jest.fn(),
    };
    const exchangeRatesService = {
      // Sin tasa: el correo no renderiza montos en bolívares, así que no
      // hace falta simular una.
      findCurrent: jest.fn().mockRejectedValue(new Error('no rate')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        OrderPricingService,
        { provide: DiscountsService, useValue: discountsService },
        { provide: ExchangeRatesService, useValue: exchangeRatesService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => configValues[key]) },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    pricingService = module.get<OrderPricingService>(OrderPricingService);
  });

  /**
   * Arma la orden con los montos que produciría `OrderPricingService` de
   * verdad, no números inventados a mano. El test anterior usaba
   * subtotal 4.53 + tax 0.72 = 5.25 al lado de un total 8.98 -- una
   * combinación que ningún pedido real de este calculador puede producir, y
   * que por lo tanto no podía detectar el bug de doble conteo del descuento.
   */
  async function buildOrderFromPricing(withDiscount: boolean): Promise<Order> {
    if (withDiscount) {
      discountsService.validateDiscount.mockResolvedValue({
        valid: true,
        discount: { discountAmount: 3.48 },
      });
      discountsService.findByCode.mockResolvedValue({
        id: 1,
        uuid: 'discount-uuid-1',
        code: 'PROMO10',
      });
    }

    const pricing = await pricingService.price({
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 3 }],
      discountCode: withDiscount ? 'PROMO10' : undefined,
    });

    const line = pricing.lines[0];

    return {
      orderNumber: 'ORD-TEST-0001',
      createdAt: new Date('2026-07-29T00:00:00Z'),
      status: OrderStatus.ON_HOLD,
      deliveryMethod: DeliveryMethod.PICKUP,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      shipping: pricing.shipping,
      total: pricing.total,
      discountAmount: pricing.discount,
      discountCode: pricing.discountCode,
      notes: null,
      guestEmail: 'cliente@example.com',
      user: null,
      shippingAddress: null,
      paymentInfo: { method: PaymentMethod.PAGOMOVIL },
      items: [
        {
          productName: 'Tornillo 1/4',
          quantity: line.quantity,
          price: line.unitPrice,
          subtotal: line.total,
          product: { ivaType: IvaType.NORMAL },
        },
      ],
    } as unknown as Order;
  }

  it('el comprobante cierra con cupón: renglones, descuento, base, IVA y total suman entre sí', async () => {
    const order = await buildOrderFromPricing(true);

    // Confirma que los montos de fixture son los del ejemplo real documentado
    // en docs/pricing-iva.md, y no un cambio silencioso en OrderPricingService.
    expect(order.subtotal).toBe(27);
    expect(order.tax).toBe(4.32);
    expect(order.total).toBe(31.32);
    expect(order.discountAmount).toBe(3.48);

    const itemsGrossTotal = order.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0,
    );
    // La identidad que el bug rompía: bruto de renglones menos el descuento
    // tiene que dar el total facturado.
    expect(
      Math.round((itemsGrossTotal - Number(order.discountAmount)) * 100) / 100,
    ).toBe(Number(order.total));
    // La identidad fiscal: base + IVA tiene que dar el total, exacto.
    expect(
      Math.round((Number(order.subtotal) + Number(order.tax)) * 100) / 100,
    ).toBe(Number(order.total));

    await service.sendOrderConfirmation(order);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const html: string = sendMailMock.mock.calls[0][0].html;

    // El renglón: cantidad × precio unitario, que es lo que el cliente puede
    // verificar a mano.
    expect(html).toContain('Cantidad: 3 × $11.60');
    expect(html).toContain('$34.80');

    // El bloque de totales completo, con las dos sumas que tienen que cerrar:
    // 34.80 − 3.48 = 31.32 (arriba) y 27.00 + 4.32 = 31.32 (fiscal).
    expect(html).toContain('Subtotal (con IVA): $34.80');
    expect(html).toContain('Descuento (PROMO10): -$3.48');
    expect(html).toContain('Base imponible: $27.00');
    expect(html).toContain('IVA (16%): $4.32');
    expect(html).toContain('Total: $31.32');

    // El error original: el total mostrado como si fuera base − descuento +
    // IVA (27.00 − 3.48 + 4.32 = 27.84) no debe aparecer en ningún lado.
    expect(html).not.toContain('27.84');
  });

  it('sin cupón, el bloque de totales queda Base imponible / IVA / Total y también cierra', async () => {
    const order = await buildOrderFromPricing(false);

    expect(order.discountAmount).toBe(0);
    expect(Number(order.subtotal) + Number(order.tax)).toBeCloseTo(
      Number(order.total),
      2,
    );

    await service.sendOrderConfirmation(order);

    const html: string = sendMailMock.mock.calls[0][0].html;

    // Sin descuento no tiene sentido un segundo "subtotal" idéntico: no debe
    // aparecer la fila de "Subtotal (con IVA)" ni la de "Descuento".
    expect(html).not.toContain('Subtotal (con IVA)');
    expect(html).not.toContain('Descuento');
    expect(html).toContain('Base imponible: $30.00');
    expect(html).toContain('IVA (16%): $4.80');
    expect(html).toContain('Total: $34.80');
  });
});
