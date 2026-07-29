import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderPricingService } from './order-pricing.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Product } from '../products/product.entity';
import { IvaType } from '../products/enums/iva-type.enum';
import { round2 } from '../products/iva.util';

const producto = (priceWithIva: number, ivaType: IvaType): Product =>
  ({ priceWithIva, ivaType, id: 1 }) as unknown as Product;

describe('OrderPricingService', () => {
  let service: OrderPricingService;
  let discountsService: { validateDiscount: jest.Mock; findByCode: jest.Mock };
  let exchangeRatesService: { findCurrent: jest.Mock };

  beforeEach(async () => {
    discountsService = {
      validateDiscount: jest.fn(),
      findByCode: jest.fn(),
    };
    exchangeRatesService = {
      findCurrent: jest.fn().mockResolvedValue({
        rate: 245.5,
        date: '2026-07-29',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPricingService,
        { provide: DiscountsService, useValue: discountsService },
        { provide: ExchangeRatesService, useValue: exchangeRatesService },
      ],
    }).compile();

    service = module.get<OrderPricingService>(OrderPricingService);
  });

  it('desglosa un ítem al 16% sin sumar el IVA dos veces', async () => {
    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.itemsTotal).toBe(23.2);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(3.2);
    expect(result.total).toBe(23.2);
  });

  it('extrae el IVA por línea, sin inflar los productos exentos', async () => {
    const result = await service.price({
      items: [
        { product: producto(10, IvaType.EXENTO), quantity: 1 },
        { product: producto(11.6, IvaType.NORMAL), quantity: 1 },
      ],
    });

    expect(result.itemsTotal).toBe(21.6);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(1.6);
    expect(result.total).toBe(21.6);
  });

  it('prorratea el descuento por línea y recalcula el IVA sobre el neto', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 2.32 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 7, code: 'PROMO10' });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
      discountCode: 'PROMO10',
    });

    expect(result.discount).toBe(2.32);
    expect(result.discountId).toBe(7);
    expect(result.discountCode).toBe('PROMO10');
    expect(result.subtotal).toBe(18);
    expect(result.tax).toBe(2.88);
    expect(result.total).toBe(20.88);
    expect(result.lines[0].discount).toBe(2.32);
  });

  it('asigna el céntimo residual del prorrateo a la línea de mayor monto', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 0.01 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto(30, IvaType.NORMAL), quantity: 1 },
        { product: producto(10, IvaType.NORMAL), quantity: 1 },
      ],
      discountCode: 'X',
    });

    const asignado = result.lines[0].discount + result.lines[1].discount;
    expect(asignado).toBe(0.01);
    expect(result.lines[0].discount).toBe(0.01);
    expect(result.lines[1].discount).toBe(0);
  });

  it('nunca deja el total por debajo de cero si el descuento excede el pedido', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 500 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
      discountCode: 'X',
    });

    expect(result.discount).toBe(11.6);
    expect(result.total).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('rechaza un código de descuento inválido', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: false,
      error: 'Este cupón no está activo',
    });

    await expect(
      service.price({
        items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
        discountCode: 'MALO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calcula el total en VES sumando sus partes, para que el desglose cuadre', async () => {
    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.exchangeRate).toBe(245.5);
    expect(result.rateDate).toBe('2026-07-29');
    expect(result.subtotalVes).toBe(4910);
    expect(result.taxVes).toBe(785.6);
    expect(result.totalVes).toBe(5695.6);
    expect(result.totalVes).toBe(result.subtotalVes! + result.taxVes!);
  });

  it('agrega los montos VES desde las líneas, así los renglones suman el total', async () => {
    // Tres líneas con alícuotas distintas: si los agregados se calcularan
    // convirtiendo los totales en USD en vez de sumando las líneas, la suma de
    // los renglones podría diferir del total por centavos.
    const result = await service.price({
      items: [
        { product: producto(11.6, IvaType.NORMAL), quantity: 3 },
        { product: producto(10.8, IvaType.REDUCIDO), quantity: 2 },
        { product: producto(7.77, IvaType.EXENTO), quantity: 1 },
      ],
    });

    const sumaBases = round2(
      result.lines.reduce((s, l) => s + (l.baseVes ?? 0), 0),
    );
    const sumaIvas = round2(
      result.lines.reduce((s, l) => s + (l.ivaVes ?? 0), 0),
    );
    const sumaTotales = round2(
      result.lines.reduce((s, l) => s + (l.totalVes ?? 0), 0),
    );

    expect(result.subtotalVes).toBe(sumaBases);
    expect(result.taxVes).toBe(sumaIvas);
    expect(result.totalVes).toBe(sumaTotales);

    // Y cada línea cuadra internamente.
    for (const line of result.lines) {
      expect(line.totalVes).toBe(round2(line.baseVes! + line.ivaVes!));
    }
  });

  it('sigue calculando en USD si no hay tasa de cambio disponible', async () => {
    exchangeRatesService.findCurrent.mockRejectedValue(
      new Error('No exchange rate found'),
    );

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
    });

    expect(result.total).toBe(11.6);
    expect(result.exchangeRate).toBeNull();
    expect(result.totalVes).toBeNull();
    expect(result.taxVes).toBeNull();
    expect(result.lines[0].baseVes).toBeNull();
    expect(result.lines[0].ivaVes).toBeNull();
    expect(result.lines[0].totalVes).toBeNull();
  });

  it('normaliza rateDate cuando el driver devuelve un Date', async () => {
    exchangeRatesService.findCurrent.mockResolvedValue({
      rate: 245.5,
      date: new Date('2026-07-29T00:00:00.000Z'),
    });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
    });

    expect(result.rateDate).toBe('2026-07-29');
  });

  it('mantiene la invariante subtotal + tax === itemsTotal - discount', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 3.77 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto(11.6, IvaType.NORMAL), quantity: 3 },
        { product: producto(10.8, IvaType.REDUCIDO), quantity: 2 },
        { product: producto(7, IvaType.EXENTO), quantity: 1 },
        { product: producto(12.4, IvaType.LUJO), quantity: 1 },
      ],
      discountCode: 'X',
    });

    expect(result.subtotal + result.tax).toBeCloseTo(
      result.itemsTotal - result.discount,
      2,
    );
    expect(result.total).toBeCloseTo(result.itemsTotal - result.discount, 2);
  });
});
