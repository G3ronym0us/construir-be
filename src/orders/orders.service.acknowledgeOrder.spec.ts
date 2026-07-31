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
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';

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

  it('registra la O/C en purchaseOrderKey además de orderKey', async () => {
    const order = makeOrder({ status: OrderStatus.ON_HOLD });
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockResolvedValue(order);

    await service.acknowledgeOrder(100, 'OC-ORBIS-88213');

    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orderKey: 'OC-ORBIS-88213',
        purchaseOrderKey: 'OC-ORBIS-88213',
      }),
    );
  });

  // El ERP escribe bien, pierde la respuesta por timeout y reintenta. Un 400
  // ahí es indistinguible de un fallo real.
  describe('reintentos del ERP', () => {
    it('devuelve la orden sin reescribir cuando se repite la misma O/C', async () => {
      const order = makeOrder({
        status: OrderStatus.PENDING,
        orderKey: 'OC-ORBIS-88213',
        purchaseOrderKey: 'OC-ORBIS-88213',
      });
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.acknowledgeOrder(100, 'OC-ORBIS-88213');

      expect(result).toBe(order);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('es idempotente aunque la orden ya se haya facturado', async () => {
      const order = makeOrder({
        status: OrderStatus.COMPLETED,
        orderKey: 'FAC-ORBIS-00457',
        purchaseOrderKey: 'OC-ORBIS-88213',
      });
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.acknowledgeOrder(100, 'OC-ORBIS-88213');

      expect(result).toBe(order);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza una O/C distinta de la ya registrada', async () => {
      const order = makeOrder({
        status: OrderStatus.PENDING,
        orderKey: 'OC-ORBIS-88213',
        purchaseOrderKey: 'OC-ORBIS-88213',
      });
      orderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.acknowledgeOrder(100, 'OC-ORBIS-99999'),
      ).rejects.toThrow(BadRequestException);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    // La orden se acusó, después se anuló, y el ERP reintenta el acuse con la
    // misma O/C. No es un reintento exitoso: es un acuse tardío de algo que
    // ya no existe en el flujo, y debe seguir dando 400 en vez de un 200 que
    // el ERP lea como "sincronizada, seguí a facturar".
    it('rechaza el reintento del acuse cuando la orden ya fue anulada', async () => {
      const order = makeOrder({
        status: OrderStatus.CANCELLED,
        orderKey: 'OC-ORBIS-88213',
        purchaseOrderKey: 'OC-ORBIS-88213',
      });
      orderRepo.findOne.mockResolvedValue(order);

      await expect(
        service.acknowledgeOrder(100, 'OC-ORBIS-88213'),
      ).rejects.toThrow(BadRequestException);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });
  });
});
