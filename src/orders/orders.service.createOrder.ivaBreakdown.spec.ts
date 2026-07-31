import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentMethod } from './payment-info.entity';
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
import { ExchangeRate } from '../exchange-rates/exchange-rate.entity';
import { BCVService } from '../exchange-rates/bcv.service';
import { IvaType } from '../products/enums/iva-type.enum';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService.createOrder — desglose de IVA por línea', () => {
  let service: OrdersService;
  let orderPricingService: { price: jest.Mock };
  let orderItemRepo: { create: jest.Mock; save: jest.Mock };

  const product = {
    id: 1,
    uuid: 'prod-uuid-1',
    name: 'Cemento',
    sku: 'CEM-001',
    published: true,
    inventory: 100,
    price: 10,
    priceWithIva: 11.6,
    ivaType: IvaType.NORMAL,
  } as unknown as Product;

  const createOrderDto = {
    deliveryMethod: DeliveryMethod.PICKUP,
    paymentMethod: PaymentMethod.PAGOMOVIL,
    paymentDetails: { senderName: 'Ana', referenceNumber: '123' },
    customerInfo: {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      phone: '04141234567',
    },
    items: [{ productUuid: 'prod-uuid-1', quantity: 2 }],
  } as unknown as CreateOrderDto;

  beforeEach(async () => {
    const orderRepo = {
      save: jest.fn((o: Order) => {
        o.uuid = o.uuid ?? 'order-uuid-1';
        o.id = o.id ?? 1;
        return Promise.resolve(o);
      }),
      findOne: jest.fn(() =>
        Promise.resolve({ uuid: 'order-uuid-1' } as Order),
      ),
    };
    orderItemRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(),
    };
    const shippingAddressRepo = {
      create: jest.fn((addr: Partial<ShippingAddress>) => addr),
      save: jest.fn((addr: ShippingAddress) => Promise.resolve(addr)),
    };
    const guestCustomersServiceMock = {
      createOrUpdate: jest.fn(() => Promise.resolve({ id: 7 })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        {
          provide: getRepositoryToken(ShippingAddress),
          useValue: shippingAddressRepo,
        },
        {
          provide: getRepositoryToken(PaymentInfo),
          useValue: {
            create: jest.fn((p: PaymentInfo) => p),
            save: jest.fn((p: PaymentInfo) => Promise.resolve(p)),
          },
        },
        { provide: getRepositoryToken(Cart), useValue: {} },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(() => Promise.resolve(product)),
            decrement: jest.fn(),
          },
        },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(ExchangeRate), useValue: {} },
        { provide: BCVService, useValue: { getBCVRate: jest.fn() } },
        {
          provide: EmailService,
          useValue: {
            sendOrderConfirmation: jest.fn(),
            sendAdminNewOrder: jest.fn(),
          },
        },
        { provide: DiscountsService, useValue: {} },
        { provide: BanksService, useValue: {} },
        { provide: GuestCustomersService, useValue: guestCustomersServiceMock },
        { provide: UsersService, useValue: { create: jest.fn(), findByEmail: jest.fn() } },
        { provide: ExchangeRatesService, useValue: {} },
        { provide: OrderPricingService, useValue: { price: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrdersService);
    orderPricingService = module.get(OrderPricingService);
  });

  it('persiste base e iva de cada línea, y base + iva === subtotal', async () => {
    // `pricing.lines` trae el desglose ya calculado; hasta ahora se descartaba.
    orderPricingService.price.mockResolvedValue({
      lines: [
        {
          product: { id: 10, name: 'Cemento', sku: 'CEM-001' },
          quantity: 2,
          unitPrice: 11.6,
          lineTotal: 23.2,
          discount: 0,
          base: 20.0,
          iva: 3.2,
          total: 23.2,
          baseVes: null,
          ivaVes: null,
          totalVes: null,
        },
      ],
      subtotal: 20.0,
      tax: 3.2,
      shipping: 0,
      discount: 0,
      discountId: null,
      discountCode: null,
      discountUuid: null,
      total: 23.2,
      exchangeRate: null,
      rateDate: null,
      subtotalVes: null,
      taxVes: null,
      discountVes: null,
      totalVes: null,
    });

    await service.createOrder(createOrderDto, null);

    const [persistedItems] = orderItemRepo.save.mock.calls[0];
    expect(persistedItems[0]).toMatchObject({ base: 20.0, iva: 3.2 });
    expect(persistedItems[0].base + persistedItems[0].iva).toBeCloseTo(
      persistedItems[0].subtotal,
      2,
    );
  });
});
