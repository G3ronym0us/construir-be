import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomersService } from './guest-customers.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';

const mockRepository = () => ({ findOne: jest.fn(), save: jest.fn() });
const mockService = () => ({});

describe('OrdersService.findOneForErp', () => {
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
        { provide: UsersService, useFactory: mockService },
        { provide: ExchangeRatesService, useFactory: mockService },
        { provide: OrderPricingService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
  });

  const order = {
    id: 13,
    uuid: 'b2c3d4e5-f6a7-4901-bcde-234567890abc',
  } as Order;

  it('busca por id cuando el identificador es numérico', async () => {
    orderRepo.findOne.mockResolvedValue(order);

    const result = await service.findOneForErp('13');

    expect(orderRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 13 } }),
    );
    expect(result).toBe(order);
  });

  it('busca por uuid cuando el identificador es un uuid', async () => {
    orderRepo.findOne.mockResolvedValue(order);

    await service.findOneForErp('b2c3d4e5-f6a7-4901-bcde-234567890abc');

    expect(orderRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: 'b2c3d4e5-f6a7-4901-bcde-234567890abc' },
      }),
    );
  });

  it('responde 404 cuando no existe', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.findOneForErp('999')).rejects.toThrow(
      NotFoundException,
    );
  });

  // Sin esta guarda, un valor que no es ni id ni uuid llega a Postgres y el
  // casteo fallido sale como 500 — el mismo error que esto corrige.
  it('responde 404 sin consultar la base cuando no es ni id ni uuid', async () => {
    await expect(service.findOneForErp('abc')).rejects.toThrow(
      NotFoundException,
    );
    expect(orderRepo.findOne).not.toHaveBeenCalled();
  });
});
