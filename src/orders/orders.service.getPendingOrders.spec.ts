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

const mockRepository = () => ({ find: jest.fn() });
const mockService = () => ({});

describe('OrdersService.getPendingOrders', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepository>;
  let guestCustomersService: { findByEmail: jest.Mock };

  beforeEach(async () => {
    guestCustomersService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useFactory: mockRepository },
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
    orderRepo = module.get(getRepositoryToken(Order));
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

  it('queries orders with ON_HOLD status ordered by createdAt DESC', async () => {
    orderRepo.find.mockResolvedValue([]);

    await service.getPendingOrders();

    expect(orderRepo.find).toHaveBeenCalledWith({
      where: { status: OrderStatus.ON_HOLD },
      relations: [
        'items',
        'items.product',
        'shippingAddress',
        'paymentInfo',
        'user',
      ],
      order: { createdAt: 'DESC' },
    });
  });

  it('returns empty array when no on-hold orders exist', async () => {
    orderRepo.find.mockResolvedValue([]);

    const result = await service.getPendingOrders();

    expect(result).toEqual([]);
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
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

    expect(result.billing.first_name).toBe('Juan');
    expect(result.billing.last_name).toBe('Pérez');
    expect(result.billing.email).toBe('juan@test.com');
    expect(guestCustomersService.findByEmail).not.toHaveBeenCalled();
  });

  it('maps billing from guest customer when no user', async () => {
    const order = makeOrder({ user: null, guestEmail: 'guest@test.com' });
    orderRepo.find.mockResolvedValue([order]);
    guestCustomersService.findByEmail.mockResolvedValue({
      firstName: 'María',
      lastName: 'González',
    });

    const [result] = await service.getPendingOrders();

    expect(guestCustomersService.findByEmail).toHaveBeenCalledWith(
      'guest@test.com',
    );
    expect(result.billing.first_name).toBe('María');
    expect(result.billing.last_name).toBe('González');
    expect(result.billing.email).toBe('guest@test.com');
  });

  it('sets billing name to null when guest customer not found', async () => {
    const order = makeOrder({ user: null, guestEmail: 'unknown@test.com' });
    orderRepo.find.mockResolvedValue([order]);
    guestCustomersService.findByEmail.mockResolvedValue(null);

    const [result] = await service.getPendingOrders();

    expect(result.billing.first_name).toBeNull();
    expect(result.billing.last_name).toBeNull();
    expect(result.billing.email).toBe('unknown@test.com');
  });

  it('sets billing address fields to null for pickup orders (no shippingAddress)', async () => {
    const order = makeOrder({
      deliveryMethod: DeliveryMethod.PICKUP,
      shippingAddress: null,
    });
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

    expect(result.billing.address_1).toBeNull();
    expect(result.billing.city).toBeNull();
    expect(result.billing.phone).toBeNull();
    expect(result.payment_method_title).toBe(
      'Entrega y/o recogida en el local',
    );
  });

  it('sets payment_method_title for delivery orders', async () => {
    const order = makeOrder({ deliveryMethod: DeliveryMethod.DELIVERY });
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

    expect(result.payment_method_title).toBe('Envío a domicilio');
  });

  it('returns correct shape for each order', async () => {
    const order = makeOrder();
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

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
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

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
    orderRepo.find.mockResolvedValue([order]);

    const [result] = await service.getPendingOrders();

    expect(result.line_items[0].product_id).toBe(0);
  });
});
