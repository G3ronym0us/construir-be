import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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

describe('OrdersService.cancelOrder', () => {
  let service: OrdersService;
  let orderRepo: { findOne: jest.Mock; save: jest.Mock };
  let productRepo: { increment: jest.Mock };
  let emailService: { sendOrderCanceled: jest.Mock };

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), save: jest.fn() };
    productRepo = { increment: jest.fn().mockResolvedValue(undefined) };
    emailService = { sendOrderCanceled: jest.fn().mockResolvedValue(undefined) };

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
        { provide: EmailService, useValue: emailService },
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
      uuid: 'order-uuid-100',
      userId: 1,
      status: OrderStatus.ON_HOLD,
      items: [
        { id: 1, productId: 10, quantity: 1 },
        { id: 2, productId: 20, quantity: 4 },
      ],
      ...overrides,
    }) as unknown as Order;

  it('throws BadRequestException when status is PENDING', async () => {
    orderRepo.findOne.mockResolvedValue(makeOrder({ status: OrderStatus.PENDING }));

    await expect(service.cancelOrder('order-uuid-100')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException when status is COMPLETED', async () => {
    orderRepo.findOne.mockResolvedValue(makeOrder({ status: OrderStatus.COMPLETED }));

    await expect(service.cancelOrder('order-uuid-100')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('restores inventory for each item', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    const savedOrder = { ...order, status: OrderStatus.CANCELLED };

    orderRepo.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(savedOrder);
    orderRepo.save.mockResolvedValue(savedOrder);

    await service.cancelOrder('order-uuid-100');

    expect(productRepo.increment).toHaveBeenCalledTimes(2);
    expect(productRepo.increment).toHaveBeenCalledWith({ id: 10 }, 'inventory', 1);
    expect(productRepo.increment).toHaveBeenCalledWith({ id: 20 }, 'inventory', 4);
  });

  it('saves the order with status CANCELLED', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    const savedOrder = { ...order, status: OrderStatus.CANCELLED };

    orderRepo.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(savedOrder);
    orderRepo.save.mockResolvedValue(savedOrder);

    await service.cancelOrder('order-uuid-100');

    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.CANCELLED }),
    );
  });

  it('calls sendOrderCanceled with the full order after cancelling', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    const savedOrder = { ...order, status: OrderStatus.CANCELLED };

    orderRepo.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(savedOrder);
    orderRepo.save.mockResolvedValue(savedOrder);

    await service.cancelOrder('order-uuid-100');

    expect(emailService.sendOrderCanceled).toHaveBeenCalledTimes(1);
    expect(emailService.sendOrderCanceled).toHaveBeenCalledWith(savedOrder);
  });

  it('throws BadRequestException when status is CANCELLED (already cancelled)', async () => {
    orderRepo.findOne.mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED }));

    await expect(service.cancelOrder('order-uuid-100')).rejects.toThrow(
      BadRequestException,
    );
  });
});
