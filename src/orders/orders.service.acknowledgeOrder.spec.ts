import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const mockRepository = () => ({ findOne: jest.fn(), save: jest.fn() });
const mockService = () => ({});

describe('OrdersService.acknowledgeOrder', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
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
        { provide: GuestCustomersService, useFactory: mockService },
        { provide: ExchangeRatesService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
  });

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      status: OrderStatus.ON_HOLD,
      orderKey: null,
      ...overrides,
    }) as Order;

  it('throws NotFoundException when order does not exist', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.acknowledgeOrder(100, 'wc_key_abc')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when status is PENDING (already processed)', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.PENDING }),
    );

    await expect(service.acknowledgeOrder(100, 'wc_key_abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when status is CANCELLED', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.CANCELLED }),
    );

    await expect(service.acknowledgeOrder(100, 'wc_key_abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('saves the order with the given orderKey and status PENDING', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue({
      ...order,
      orderKey: 'wc_key_abc',
      status: OrderStatus.PENDING,
    });

    await service.acknowledgeOrder(100, 'wc_key_abc');

    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderKey: 'wc_key_abc',
        status: OrderStatus.PENDING,
      }),
    );
  });

  it('returns the saved order', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    const updatedOrder = {
      ...order,
      orderKey: 'wc_key_abc',
      status: OrderStatus.PENDING,
    };
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue(updatedOrder);

    const result = await service.acknowledgeOrder(100, 'wc_key_abc');

    expect(result).toBe(updatedOrder);
  });
});
