import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, FindOneOptions } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentMethod } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomersService } from './guest-customers.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';
import { ExchangeRate } from '../exchange-rates/exchange-rate.entity';
import { BCVService } from '../exchange-rates/bcv.service';
import { IvaType } from '../products/enums/iva-type.enum';
import { CreateOrderDto } from './dto/create-order.dto';

const localIso = (d: Date): string =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

const isoDay = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localIso(d);
};

const TODAY = isoDay(0);
const TOMORROW = isoDay(1);

const TASA_VIGENTE = 744.22;
const TASA_PUBLICADA = 750.0;

/**
 * Repo de tasas que interpreta el `where`, para que el test dependa de la
 * consulta real de `findCurrent()` y no de un mock complaciente.
 */
const makeRatesRepo = (rows: ExchangeRate[]) => ({
  findOne: jest.fn((options: FindOneOptions<ExchangeRate>) => {
    const where = (options.where ?? {}) as { date?: FindOperator<Date> | Date };
    let candidates = [...rows];

    if (where.date instanceof FindOperator) {
      const limit = localIso(where.date.value);
      candidates = candidates.filter((r) => String(r.date) <= limit);
    }

    candidates.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return Promise.resolve(candidates[0] ?? null);
  }),
});

describe('OrdersService.createOrder — tasa de la orden', () => {
  let service: OrdersService;
  let orderRepo: { save: jest.Mock; findOne: jest.Mock };
  let orderItemRepo: { create: jest.Mock; save: jest.Mock };

  const product = {
    id: 1,
    uuid: 'prod-uuid-1',
    name: 'Cemento',
    sku: 'CEM-001',
    published: true,
    inventory: 100,
    price: 10,
    priceWithIva: 11.6,
    ivaType: IvaType.NORMAL,
  } as unknown as Product;

  const dto = {
    deliveryMethod: DeliveryMethod.PICKUP,
    paymentMethod: PaymentMethod.PAGOMOVIL,
    paymentDetails: { senderName: 'Ana', referenceNumber: '123' },
    customerInfo: {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      phone: '04141234567',
    },
    items: [{ productUuid: 'prod-uuid-1', quantity: 2 }],
  } as unknown as CreateOrderDto;

  const build = async (rows: ExchangeRate[]) => {
    orderRepo = {
      save: jest.fn((o: Order) => {
        o.uuid = o.uuid ?? 'order-uuid-1';
        o.id = o.id ?? 1;
        return Promise.resolve(o);
      }),
      findOne: jest.fn(() =>
        Promise.resolve({ uuid: 'order-uuid-1' } as Order),
      ),
    };
    orderItemRepo = {
      create: jest.fn((item: OrderItem) => item),
      save: jest.fn((items: OrderItem[]) => Promise.resolve(items)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        ExchangeRatesService, // servicio real: el test recorre findCurrent()
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        {
          provide: getRepositoryToken(PaymentInfo),
          useValue: {
            create: jest.fn((p: PaymentInfo) => p),
            save: jest.fn((p: PaymentInfo) => Promise.resolve(p)),
          },
        },
        { provide: getRepositoryToken(Cart), useValue: {} },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(() => Promise.resolve(product)),
            decrement: jest.fn(),
          },
        },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: makeRatesRepo(rows),
        },
        { provide: BCVService, useValue: { getBCVRate: jest.fn() } },
        {
          provide: EmailService,
          useValue: {
            sendOrderConfirmation: jest.fn(),
            sendAdminNewOrder: jest.fn(),
          },
        },
        { provide: DiscountsService, useValue: {} },
        { provide: BanksService, useValue: {} },
        {
          provide: GuestCustomersService,
          useValue: {
            createOrUpdate: jest.fn(() => Promise.resolve({ id: 7 })),
          },
        },
        OrderPricingService, // servicio real: el test recorre el cálculo entero
      ],
    }).compile();

    service = module.get(OrdersService);
  };

  const rateRow = (date: string, rate: number): ExchangeRate =>
    ({ id: date, date, rate, source: 'bcv' }) as unknown as ExchangeRate;

  it('usa la tasa publicada (fila futura) para los VES de la orden y sus items', async () => {
    await build([
      rateRow(TODAY, TASA_VIGENTE),
      rateRow(TOMORROW, TASA_PUBLICADA),
    ]);

    await service.createOrder(dto, null);

    const orderSaves = orderRepo.save.mock.calls as Array<[Order]>;
    const savedOrder = orderSaves[0][0];
    expect(Number(savedOrder.exchangeRate)).toBe(TASA_PUBLICADA);

    // subtotal = base sin IVA = 20 USD => 20 * 750 = 15000 Bs
    expect(savedOrder.subtotalVes).toBe(15000);
    // El total en USD lo arma createOrder (no es lo que se testea acá); lo que
    // importa es que se convierta con la tasa publicada.
    expect(savedOrder.totalVes).toBe(
      Number((Number(savedOrder.total) * TASA_PUBLICADA).toFixed(2)),
    );

    // Lo que ve el cliente en el catálogo y lo que se le factura tienen que
    // ser el mismo número: 11.6 * 750 = 8700 por unidad.
    const itemSaves = orderItemRepo.save.mock.calls as Array<[OrderItem[]]>;
    const items = itemSaves[0][0];
    expect(items[0].priceVes).toBe(8700);
    expect(items[0].subtotalVes).toBe(17400);

    // Y explícitamente: NO la tasa vigente de hoy.
    expect(Number(savedOrder.exchangeRate)).not.toBe(TASA_VIGENTE);
    expect(items[0].priceVes).not.toBe(
      Number((11.6 * TASA_VIGENTE).toFixed(2)),
    );
  });

  it('sin fila futura, factura con la tasa vigente de hoy', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(dto, null);

    const orderSaves = orderRepo.save.mock.calls as Array<[Order]>;
    expect(Number(orderSaves[0][0].exchangeRate)).toBe(TASA_VIGENTE);
  });

  it('no suma el IVA dos veces en el total', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(dto, null);

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];

    // Producto de base 10.00 al 16% => priceWithIva 11.60, cantidad 2.
    // El total debe ser 23.20; el doble conteo daba 26.40
    // (subtotal inclusivo 23.20 + IVA extraído 3.20).
    expect(Number(savedOrder.subtotal)).toBe(20);
    expect(Number(savedOrder.tax)).toBe(3.2);
    expect(Number(savedOrder.total)).toBe(23.2);
    expect(Number(savedOrder.subtotal) + Number(savedOrder.tax)).toBe(
      Number(savedOrder.total),
    );
  });

  it('persiste el desglose en VES y hace que sus partes sumen', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(dto, null);

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];

    // 20 × 744.22 = 14884.40 ; 3.2 × 744.22 = 2381.50 ; suma = 17265.90
    expect(Number(savedOrder.subtotalVes)).toBe(14884.4);
    expect(Number(savedOrder.taxVes)).toBe(2381.5);
    expect(Number(savedOrder.totalVes)).toBe(17265.9);
    expect(Number(savedOrder.totalVes)).toBe(
      Number(savedOrder.subtotalVes) + Number(savedOrder.taxVes),
    );
  });

  it('rechaza con 409 si la tasa cambió desde el quote', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await expect(
      service.createOrder(
        { ...dto, expectedExchangeRate: 700 } as CreateOrderDto,
        null,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('acepta la orden si expectedExchangeRate coincide con la tasa de facturación', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(
      { ...dto, expectedExchangeRate: TASA_VIGENTE } as CreateOrderDto,
      null,
    );

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];
    expect(Number(savedOrder.total)).toBe(23.2);
  });
});
