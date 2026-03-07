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

describe('OrdersService.completeOrder', () => {
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
      status: OrderStatus.PENDING,
      orderKey: 'OC-001',
      dateCompleted: null,
      ...overrides,
    }) as Order;

  const dateCompleted = new Date('2026-03-07T10:00:00Z');

  it('throws NotFoundException when order does not exist', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(
      service.completeOrder(100, 'OC-001 / FAC-001', dateCompleted),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when status is ON_HOLD', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.ON_HOLD }),
    );

    await expect(
      service.completeOrder(100, 'OC-001 / FAC-001', dateCompleted),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when status is COMPLETED (already completed)', async () => {
    orderRepo.findOne.mockResolvedValue(
      makeOrder({ status: OrderStatus.COMPLETED }),
    );

    await expect(
      service.completeOrder(100, 'OC-001 / FAC-001', dateCompleted),
    ).rejects.toThrow(BadRequestException);
  });

  it('saves the order with orderKey, status COMPLETED and dateCompleted', async () => {
    const order = makeOrder({ status: OrderStatus.PENDING });
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue({
      ...order,
      orderKey: 'OC-001 / FAC-001',
      status: OrderStatus.COMPLETED,
      dateCompleted,
    });

    await service.completeOrder(100, 'OC-001 / FAC-001', dateCompleted);

    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderKey: 'OC-001 / FAC-001',
        status: OrderStatus.COMPLETED,
        dateCompleted,
      }),
    );
  });

  it('returns the saved order', async () => {
    const order = makeOrder({ status: OrderStatus.PENDING });
    const updatedOrder = {
      ...order,
      orderKey: 'OC-001 / FAC-001',
      status: OrderStatus.COMPLETED,
      dateCompleted,
    };
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue(updatedOrder);

    const result = await service.completeOrder(
      100,
      'OC-001 / FAC-001',
      dateCompleted,
    );

    expect(result).toBe(updatedOrder);
  });
});
