import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderPricingService } from './order-pricing.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Product } from '../products/product.entity';
import { IvaType } from '../products/enums/iva-type.enum';
import { round2 } from '../products/iva.util';

// El driver de Postgres devuelve las columnas `decimal` como string, aunque
// la entidad las declare `number`. Los mocks imitan eso a propósito: si algún
// llamador dejara de envolver el valor en `Number(...)`, estos tests tienen
// que fallar en vez de pasar de casualidad con un `number` de TypeScript.
const producto = (priceWithIva: string, ivaType: IvaType): Product =>
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
        rate: '245.50',
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
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.itemsTotal).toBe(23.2);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(3.2);
    expect(result.total).toBe(23.2);
  });

  it('extrae el IVA por línea, sin inflar los productos exentos', async () => {
    const result = await service.price({
      items: [
        { product: producto('10.00', IvaType.EXENTO), quantity: 1 },
        { product: producto('11.60', IvaType.NORMAL), quantity: 1 },
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
    discountsService.findByCode.mockResolvedValue({
      id: 7,
      uuid: 'discount-uuid-7',
      code: 'PROMO10',
    });

    const result = await service.price({
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 2 }],
      discountCode: 'PROMO10',
    });

    expect(result.discount).toBe(2.32);
    expect(result.discountId).toBe(7);
    expect(result.discountUuid).toBe('discount-uuid-7');
    expect(result.discountCode).toBe('PROMO10');
    expect(result.subtotal).toBe(18);
    expect(result.tax).toBe(2.88);
    expect(result.total).toBe(20.88);
    expect(result.lines[0].discount).toBe(2.32);
    // Campos que alimentan columnas que la tarea 6 va a persistir: no
    // quedan sin cubrir en ningún caso.
    expect(result.lines[0].unitPrice).toBe(11.6);
    expect(result.lines[0].lineTotal).toBe(23.2);
    expect(result.discountVes).toBe(569.56); // round2(2.32 * 245.5)
  });

  it('asigna el céntimo residual del prorrateo a la línea de mayor monto', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 0.01 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto('30.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('10.00', IvaType.NORMAL), quantity: 1 },
      ],
      discountCode: 'X',
    });

    const asignado = result.lines[0].discount + result.lines[1].discount;
    expect(asignado).toBe(0.01);
    expect(result.lines[0].discount).toBe(0.01);
    expect(result.lines[1].discount).toBe(0);
  });

  // Nota: con [30, 10] y descuento 0.01 los shares proporcionales ya dan
  // exacto (0.01 y 0.00) sin pasar por la rama de reasignación del residuo:
  // ese caso, arriba, no la ejerce. Este sí: con líneas iguales el redondeo
  // proporcional deja un residuo de más de un céntimo, así que la rama que
  // reparte el sobrante por monto descendente entra en juego de verdad.
  // (Borrar esa rama, o asignarla a la línea equivocada, tira este test.)
  it('reparte el residuo de más de un céntimo entre varias líneas cuando hace falta', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 99.41 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto('20.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('20.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('20.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('20.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('20.00', IvaType.NORMAL), quantity: 1 },
      ],
      discountCode: 'X',
    });

    expect(result.lines[0].discount).toBe(19.89);
    expect(result.lines[1].discount).toBe(19.88);
    expect(result.lines[2].discount).toBe(19.88);
    expect(result.lines[3].discount).toBe(19.88);
    expect(result.lines[4].discount).toBe(19.88);
    const asignado = round2(
      result.lines.reduce((sum, line) => sum + line.discount, 0),
    );
    expect(asignado).toBe(99.41);
  });

  it('nunca deja la porción de una línea por encima de su propio monto (5 líneas iguales)', async () => {
    // Regresión: antes, el residuo del prorrateo se volcaba entero en la
    // línea "mayor" sin topar contra su monto. Con líneas empatadas en 1.00 y
    // un cupón de 4.97, esto dejaba una línea en 1.01 (más que su propio
    // precio), y por lo tanto con neto e IVA negativos.
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 4.97 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: Array.from({ length: 5 }, () => ({
        product: producto('1.00', IvaType.NORMAL),
        quantity: 1,
      })),
      discountCode: 'X',
    });

    const totalDiscount = round2(
      result.lines.reduce((sum, line) => sum + line.discount, 0),
    );
    expect(totalDiscount).toBe(4.97);

    for (const line of result.lines) {
      // Ninguna porción puede superar el monto de su propia línea.
      expect(line.discount).toBeLessThanOrEqual(line.lineTotal);
      // Y por lo tanto ningún renglón queda con neto o IVA negativos.
      expect(line.total).toBeGreaterThanOrEqual(0);
      expect(line.base).toBeGreaterThanOrEqual(0);
      expect(line.iva).toBeGreaterThanOrEqual(0);
    }
  });

  it('nunca deja la porción de una línea por encima de su propio monto (10 líneas iguales)', async () => {
    // Variante con más líneas: los diez shares proporcionales ya redondean a
    // 1.00 cada uno (10.00 en total, por encima del cupón de 9.95), así que
    // el ajuste tiene que *restar*, no sumar. Antes del fix la resta también
    // se volcaba entera en una sola línea, sin verificar que no la dejara
    // negativa por otro camino; este caso ejercita esa rama.
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 9.95 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: Array.from({ length: 10 }, () => ({
        product: producto('1.00', IvaType.NORMAL),
        quantity: 1,
      })),
      discountCode: 'X',
    });

    const totalDiscount = round2(
      result.lines.reduce((sum, line) => sum + line.discount, 0),
    );
    expect(totalDiscount).toBe(9.95);

    for (const line of result.lines) {
      expect(line.discount).toBeLessThanOrEqual(line.lineTotal);
      expect(line.total).toBeGreaterThanOrEqual(0);
      expect(line.base).toBeGreaterThanOrEqual(0);
      expect(line.iva).toBeGreaterThanOrEqual(0);
    }
  });

  it('no revienta en NaN cuando el share de una línea es menor a medio centavo', async () => {
    // Regresión del bug en round2: una línea que vale una fracción ínfima del
    // pedido (aquí, 0.09 sobre 1000.09) recibe un share de prorrateo con
    // magnitud menor a 1e-6, que round2 convertía en NaN por culpa de la
    // notación exponencial de JS. Un cupón de monto fijo tan chico como 0.01
    // es creable desde la API de admin, así que esto es alcanzable en
    // producción, no sólo teórico.
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 0.01 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto('1000.00', IvaType.NORMAL), quantity: 1 },
        { product: producto('0.09', IvaType.NORMAL), quantity: 1 },
      ],
      discountCode: 'X',
    });

    expect(Number.isNaN(result.subtotal)).toBe(false);
    expect(Number.isNaN(result.tax)).toBe(false);
    expect(Number.isNaN(result.total)).toBe(false);
    for (const line of result.lines) {
      expect(Number.isNaN(line.discount)).toBe(false);
      expect(Number.isNaN(line.base)).toBe(false);
      expect(Number.isNaN(line.iva)).toBe(false);
    }
    const asignado = round2(
      result.lines.reduce((sum, line) => sum + line.discount, 0),
    );
    expect(asignado).toBe(0.01);
  });

  it('nunca deja el total por debajo de cero si el descuento excede el pedido', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 500 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 1 }],
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
        items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 1 }],
        discountCode: 'MALO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calcula el total en VES sumando sus partes, para que el desglose cuadre', async () => {
    const result = await service.price({
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.exchangeRate).toBe(245.5);
    expect(result.rateDate).toBe('2026-07-29');
    expect(result.subtotalVes).toBe(4910);
    expect(result.taxVes).toBe(785.6);
    expect(result.totalVes).toBe(5695.6);
    // Comparación redondeada a propósito: sumar dos floats sin redondear
    // puede no caer exacto en el valor esperado por punto flotante, aunque
    // en este caso particular coincida.
    expect(result.totalVes).toBe(round2(result.subtotalVes! + result.taxVes!));
  });

  it('agrega los montos VES desde las líneas, así los renglones suman el total', async () => {
    // Tres líneas con alícuotas distintas: si los agregados se calcularan
    // convirtiendo los totales en USD en vez de sumando las líneas, la suma de
    // los renglones podría diferir del total por centavos.
    const result = await service.price({
      items: [
        { product: producto('11.60', IvaType.NORMAL), quantity: 3 },
        { product: producto('10.80', IvaType.REDUCIDO), quantity: 2 },
        { product: producto('7.77', IvaType.EXENTO), quantity: 1 },
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
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 1 }],
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
      rate: '245.50',
      date: new Date('2026-07-29T00:00:00.000Z'),
    });

    const result = await service.price({
      items: [{ product: producto('11.60', IvaType.NORMAL), quantity: 1 }],
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
        { product: producto('11.60', IvaType.NORMAL), quantity: 3 },
        { product: producto('10.80', IvaType.REDUCIDO), quantity: 2 },
        { product: producto('7.00', IvaType.EXENTO), quantity: 1 },
        { product: producto('12.40', IvaType.LUJO), quantity: 1 },
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
