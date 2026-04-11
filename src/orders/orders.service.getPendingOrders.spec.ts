import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomersService } from './guest-customers.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

const mockService = () => ({});

describe('OrdersService.getPendingOrders', () => {
  let service: OrdersService;
  let mockQueryBuilder: {
    innerJoin: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let guestCustomersService: { findByEmail: jest.Mock };

  beforeEach(async () => {
    mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    guestCustomersService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        { provide: getRepositoryToken(PaymentInfo), useValue: {} },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: EmailService, useFactory: mockService },
        { provide: DiscountsService, useFactory: mockService },
        { provide: BanksService, useFactory: mockService },
        { provide: GuestCustomersService, useValue: guestCustomersService },
        { provide: ExchangeRatesService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  const makeItem = (
    overrides: Omit<Partial<OrderItem>, 'product'> & {
      product?: Product | null;
    } = {},
  ): OrderItem =>
    ({
      id: 1,
      productName: 'Cemento',
      product: { id: 10 } as Product,
      quantity: 2,
      subtotal: 20.0,
      productSku: 'CEM-001',
      price: 10.0,
      ...overrides,
    }) as OrderItem;

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      status: OrderStatus.ON_HOLD,
      createdAt: new Date('2026-03-07T10:00:00.000Z'),
      total: 20.0,
      tax: 0,
      deliveryMethod: DeliveryMethod.DELIVERY,
      notes: null,
      user: null,
      guestEmail: null,
      shippingAddress: {
        address: 'Av. Bolívar 123',
        city: 'Caracas',
        phone: '04121234567',
      } as ShippingAddress,
      items: [makeItem()],
      ...overrides,
    }) as Order;

  it('returns empty data array when no on-hold orders exist', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.getPendingOrders();

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('maps billing from authenticated user', async () => {
    const order = makeOrder({
      user: {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@test.com',
      } as User,
      guestEmail: null,
    });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.billing.first_name).toBe('Juan');
    expect(result.billing.last_name).toBe('Pérez');
    expect(result.billing.email).toBe('juan@test.com');
    expect(guestCustomersService.findByEmail).not.toHaveBeenCalled();
  });

  it('maps billing from guest customer when no user', async () => {
    const order = makeOrder({ user: null, guestEmail: 'guest@test.com' });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);
    guestCustomersService.findByEmail.mockResolvedValue({
      firstName: 'María',
      lastName: 'González',
    });

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(guestCustomersService.findByEmail).toHaveBeenCalledWith(
      'guest@test.com',
    );
    expect(result.billing.first_name).toBe('María');
    expect(result.billing.last_name).toBe('González');
    expect(result.billing.email).toBe('guest@test.com');
  });

  it('sets billing name to null when guest customer not found', async () => {
    const order = makeOrder({ user: null, guestEmail: 'unknown@test.com' });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);
    guestCustomersService.findByEmail.mockResolvedValue(null);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.billing.first_name).toBeNull();
    expect(result.billing.last_name).toBeNull();
    expect(result.billing.email).toBe('unknown@test.com');
  });

  it('sets billing address fields to null for pickup orders (no shippingAddress)', async () => {
    const order = makeOrder({
      deliveryMethod: DeliveryMethod.PICKUP,
      shippingAddress: null,
    });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.billing.address_1).toBeNull();
    expect(result.billing.city).toBeNull();
    expect(result.billing.phone).toBeNull();
    expect(result.payment_method_title).toBe(
      'Entrega y/o recogida en el local',
    );
  });

  it('sets payment_method_title for delivery orders', async () => {
    const order = makeOrder({ deliveryMethod: DeliveryMethod.DELIVERY });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.payment_method_title).toBe('Envío a domicilio');
  });

  it('returns correct shape for each order', async () => {
    const order = makeOrder();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result).toMatchObject({
      id: 100,
      status: 'on-hold',
      date_created: '2026-03-07T10:00:00',
      total: '20.00',
      total_tax: '0.00',
      number: '100',
      customer_note: null,
    });
  });

  it('returns correct line_items shape', async () => {
    const order = makeOrder();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]).toMatchObject({
      id: 1,
      name: 'Cemento',
      product_id: 10,
      quantity: 2,
      tax_class: '',
      total: '20.00',
      total_tax: '0',
      sku: 'CEM-001',
      price: 10,
    });
  });

  it('uses product_id 0 when item has no product relation', async () => {
    const order = makeOrder({ items: [makeItem({ product: null })] });
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const { data } = await service.getPendingOrders();
    const result = data[0];

    expect(result.line_items[0].product_id).toBe(0);
  });
});
