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

const mockService = () => ({});

describe('OrdersService.cancelPendingOrder', () => {
  let service: OrdersService;
  let orderRepo: { findOne: jest.Mock; save: jest.Mock };
  let productRepo: { increment: jest.Mock };

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), save: jest.fn() };
    productRepo = { increment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        { provide: getRepositoryToken(PaymentInfo), useValue: {} },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: EmailService, useFactory: mockService },
        { provide: DiscountsService, useFactory: mockService },
        { provide: BanksService, useFactory: mockService },
        { provide: GuestCustomersService, useFactory: mockService },
        { provide: ExchangeRatesService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      status: OrderStatus.PENDING,
      items: [
        { id: 1, productId: 10, quantity: 2 },
        { id: 2, productId: 20, quantity: 3 },
      ],
      dateCompleted: null,
      ...overrides,
    }) as unknown as Order;

  const dateCompleted = new Date('2026-03-07T10:00:00Z');

  it('throws NotFoundException when order does not exist', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(
      service.cancelPendingOrder(100, dateCompleted),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when status is ON_HOLD', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.ON_HOLD }),
    );

    await expect(
      service.cancelPendingOrder(100, dateCompleted),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when status is CANCELLED', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.CANCELLED }),
    );

    await expect(
      service.cancelPendingOrder(100, dateCompleted),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls productRepo.increment once per item to restore inventory', async () => {
    const order = makeOrder();
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      dateCompleted,
    });
    productRepo.increment.mockResolvedValue(undefined);

    await service.cancelPendingOrder(100, dateCompleted);

    expect(productRepo.increment).toHaveBeenCalledTimes(2);
    expect(productRepo.increment).toHaveBeenCalledWith(
      { id: 10 },
      'inventory',
      2,
    );
    expect(productRepo.increment).toHaveBeenCalledWith(
      { id: 20 },
      'inventory',
      3,
    );
  });

  it('saves the order with status CANCELLED and dateCompleted', async () => {
    const order = makeOrder();
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      dateCompleted,
    });
    productRepo.increment.mockResolvedValue(undefined);

    await service.cancelPendingOrder(100, dateCompleted);

    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OrderStatus.CANCELLED,
        dateCompleted,
      }),
    );
  });

  it('returns the saved order', async () => {
    const order = makeOrder();
    const updatedOrder = {
      ...order,
      status: OrderStatus.CANCELLED,
      dateCompleted,
    };
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue(updatedOrder);
    productRepo.increment.mockResolvedValue(undefined);

    const result = await service.cancelPendingOrder(100, dateCompleted);

    expect(result).toBe(updatedOrder);
  });
});
