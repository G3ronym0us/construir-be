import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentStatus } from './payment-info.entity';
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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const mockRepository = () => ({ findOne: jest.fn(), save: jest.fn() });
const mockService = () => ({});

describe('OrdersService.updateOrderStatus — aviso de pago rechazado', () => {
  let service: OrdersService;
  let orderRepo: ReturnType<typeof mockRepository>;
  let emailService: {
    sendPaymentConfirmed: jest.Mock;
    sendPaymentRejected: jest.Mock;
  };

  beforeEach(async () => {
    emailService = {
      sendPaymentConfirmed: jest.fn(),
      sendPaymentRejected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useFactory: mockRepository },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        {
          provide: getRepositoryToken(PaymentInfo),
          useFactory: mockRepository,
        },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: EmailService, useValue: emailService },
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

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      uuid: 'order-uuid-100',
      status: OrderStatus.ON_HOLD,
      paymentInfo: { status: PaymentStatus.PENDING } as PaymentInfo,
      ...overrides,
    }) as Order;

  it('avisa al cliente cuando el pago pasa a rechazado', async () => {
    const order = makeOrder({
      paymentInfo: { status: PaymentStatus.PENDING } as PaymentInfo,
    });
    const actualizada = {
      ...order,
      paymentInfo: { status: PaymentStatus.REJECTED },
    };

    orderRepo.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(actualizada);
    orderRepo.save.mockResolvedValue(actualizada);

    await service.updateOrderStatus('order-uuid-100', {
      paymentStatus: PaymentStatus.REJECTED,
    } as UpdateOrderStatusDto);

    expect(emailService.sendPaymentRejected).toHaveBeenCalledWith(actualizada);
  });

  it('no reenvía el aviso si el pago ya estaba rechazado', async () => {
    const order = makeOrder({
      paymentInfo: { status: PaymentStatus.REJECTED } as PaymentInfo,
    });

    orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(order);
    orderRepo.save.mockResolvedValue(order);

    await service.updateOrderStatus('order-uuid-100', {
      paymentStatus: PaymentStatus.REJECTED,
    } as UpdateOrderStatusDto);

    expect(emailService.sendPaymentRejected).not.toHaveBeenCalled();
  });
});
