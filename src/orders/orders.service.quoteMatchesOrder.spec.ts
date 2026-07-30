import { Test, TestingModule } from '@nestjs/testing';
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

/**
 * Regresión del review final de rama (I-1): antes de este arreglo,
 * `quoteOrder` leía sólo `dto.items`, mientras que `createOrder`, para un
 * usuario autenticado, ignoraba `dto.items` y facturaba el carrito del
 * servidor. Este test recorre `OrderPricingService` real (no mockeado) para
 * verificar que, dado el MISMO carrito y el MISMO usuario, el total que
 * devuelve el quote es exactamente el que termina persistido en la orden —
 * la garantía que el checkout necesita para poder mostrarle al cliente un
 * número y cobrarle ese mismo número.
 */
describe('OrdersService — el total del quote coincide con el de la orden creada', () => {
  const USER_ID = 42;
  const TASA = 100;

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

  const makeRatesRepo = (rows: ExchangeRate[]) => ({
    findOne: jest.fn((options: FindOneOptions<ExchangeRate>) => {
      const where = (options.where ?? {}) as {
        date?: FindOperator<Date> | Date;
      };
      let candidates = [...rows];
      if (where.date instanceof FindOperator) {
        candidates = candidates.filter(
          (r) => String(r.date) <= String(where.date),
        );
      }
      candidates.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return Promise.resolve(candidates[0] ?? null);
    }),
  });

  const rateRow = (date: string, rate: number): ExchangeRate =>
    ({ id: date, date, rate, source: 'bcv' }) as unknown as ExchangeRate;

  const build = async () => {
    const cartRepository = {
      findOne: jest.fn(() =>
        Promise.resolve({
          items: [{ product, quantity: 2 }],
        }),
      ),
      remove: jest.fn(),
    };

    const orderRepo = {
      save: jest.fn((o: Order) => {
        o.uuid = o.uuid ?? 'order-uuid-1';
        o.id = o.id ?? 1;
        return Promise.resolve(o);
      }),
      findOne: jest.fn(() =>
        Promise.resolve({ uuid: 'order-uuid-1' } as Order),
      ),
    };
    const orderItemRepo = {
      create: jest.fn((item: OrderItem) => item),
      save: jest.fn((items: OrderItem[]) => Promise.resolve(items)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        ExchangeRatesService, // real: se recorre resolveRate()
        OrderPricingService, // real: se recorre el cálculo entero
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
        { provide: getRepositoryToken(Cart), useValue: cartRepository },
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
          useValue: makeRatesRepo([rateRow('2026-07-29', TASA)]),
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
        { provide: GuestCustomersService, useValue: {} },
      ],
    }).compile();

    return {
      service: module.get<OrdersService>(OrdersService),
      orderRepo,
    };
  };

  it('el total cotizado y el total facturado son el mismo número, para el mismo usuario y el mismo carrito', async () => {
    const { service, orderRepo } = await build();

    // El body trae un `items[]` deliberadamente distinto al carrito real: si
    // `quoteOrder` no aplicara la misma regla de resolución que
    // `createOrder`, cotizaría esto en vez del carrito.
    const bogusItems = [{ productUuid: 'no-es-el-carrito', quantity: 50 }];

    const quote = await service.quoteOrder({ items: bogusItems }, USER_ID);

    const dto = {
      deliveryMethod: DeliveryMethod.PICKUP,
      paymentMethod: PaymentMethod.PAGOMOVIL,
      paymentDetails: { senderName: 'Ana', referenceNumber: '123' },
      items: bogusItems,
    } as unknown as CreateOrderDto;

    await service.createOrder(dto, USER_ID);

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];

    expect(quote.totals.total).toBe(Number(savedOrder.total));
    expect(quote.totals.subtotal).toBe(Number(savedOrder.subtotal));
    expect(quote.totals.tax).toBe(Number(savedOrder.tax));
    // Y explícitamente NO es el total que hubiera salido de cotizar
    // `bogusItems` (2 unidades del carrito real, no 50 de un producto que ni
    // siquiera se busca).
    expect(quote.totals.total).toBe(23.2);
  });
});
