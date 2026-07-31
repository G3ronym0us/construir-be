import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
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
import { OrderPricingService } from './order-pricing.service';

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
        { provide: OrderPricingService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      status: OrderStatus.ON_HOLD,
      createdAt: new Date('2026-03-07T10:00:00.000Z'),
      total: 20.0,
      items: [{ id: 1, quantity: 2 }],
      ...overrides,
    }) as Order;

  it('devuelve vacío cuando no hay órdenes on-hold', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.getPendingOrders();

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.lastPage).toBe(1);
  });

  // El servicio ya no traduce al contrato del ERP: eso es del serializador.
  it('devuelve las entidades sin transformar', async () => {
    const order = makeOrder();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const result = await service.getPendingOrders();

    expect(result.data).toEqual([order]);
  });

  it('filtra por on-hold', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await service.getPendingOrders();

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'order.status = :status',
      { status: OrderStatus.ON_HOLD },
    );
  });

  it('pagina con skip y take', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 25]);

    const result = await service.getPendingOrders(3, 10);

    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.lastPage).toBe(3);
  });
});
