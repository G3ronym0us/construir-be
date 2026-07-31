import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentMethod, PaymentStatus } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { GuestCustomersService } from './guest-customers.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';

const mockService = () => ({});

describe('OrdersService.getAdminOrders', () => {
  let service: OrdersService;
  let mockQueryBuilder: {
    leftJoinAndSelect: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getCount: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      getMany: jest.fn().mockResolvedValue([]),
    };

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
        { provide: GuestCustomersService, useFactory: mockService },
        { provide: UsersService, useFactory: mockService },
        { provide: ExchangeRatesService, useFactory: mockService },
        { provide: OrderPricingService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      uuid: 'e82c2c14-0000-0000-0000-0000000602bb',
      orderNumber: 'ORD-1042',
      status: OrderStatus.PENDING,
      createdAt: new Date('2026-07-28T08:42:00.000Z'),
      deliveryMethod: DeliveryMethod.DELIVERY,
      total: '383.46',
      totalVes: '25098.07',
      exchangeRate: '65.45',
      userId: null,
      user: null,
      guestEmail: null,
      guestCustomer: null,
      shippingAddress: null,
      paymentInfo: {
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.PAGOMOVIL,
        referenceCode: '004871',
      } as PaymentInfo,
      items: [
        { quantity: 20 } as OrderItem,
        { quantity: 12 } as OrderItem,
        { quantity: 150 } as OrderItem,
      ],
      get totalItems() {
        return this.items.reduce(
          (sum: number, item: OrderItem) => sum + item.quantity,
          0,
        );
      },
      ...overrides,
    }) as Order;

  const firstRow = async () => {
    const { orders } = await service.getAdminOrders({});
    return orders[0];
  };

  it('devuelve los montos como números, no como los strings del decimal', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([makeOrder()]);

    const row = await firstRow();

    expect(row.total).toBe(383.46);
    expect(row.totalVes).toBe(25098.07);
    expect(row.exchangeRate).toBe(65.45);
  });

  it('suma las unidades de todos los artículos', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([makeOrder()]);

    expect((await firstRow()).totalItems).toBe(182);
  });

  it('deja los montos en Bs. nulos cuando la orden no fijó tasa', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({ totalVes: null, exchangeRate: null }),
    ]);

    const row = await firstRow();

    expect(row.totalVes).toBeNull();
    expect(row.exchangeRate).toBeNull();
    expect(row.total).toBe(383.46);
  });

  it('toma al comprador del invitado cuando la orden es de invitado', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({
        guestCustomer: {
          firstName: 'Luis',
          lastName: 'Pérez',
          email: 'luis.perez@correo.com',
          identificationType: IdentificationType.V,
          identificationNumber: '18402117',
        } as GuestCustomer,
      }),
    ]);

    const row = await firstRow();

    expect(row.customerName).toBe('Luis Pérez');
    expect(row.customerIdentification).toBe('V-18402117');
    expect(row.customerEmail).toBe('luis.perez@correo.com');
    expect(row.isGuest).toBe(true);
  });

  it('toma al comprador del usuario registrado cuando la orden tiene dueño', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({
        userId: 7,
        user: {
          firstName: 'María',
          lastName: 'González',
          email: 'maria@construir.com',
          identificationType: IdentificationType.V,
          identificationNumber: '15309774',
        } as User,
      }),
    ]);

    const row = await firstRow();

    expect(row.customerName).toBe('María González');
    expect(row.customerIdentification).toBe('V-15309774');
    expect(row.isGuest).toBe(false);
  });

  it('cae a la dirección de envío en órdenes viejas sin invitado ni usuario', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({
        guestEmail: 'rosaura@correo.com',
        shippingAddress: {
          firstName: 'Rosaura',
          lastName: 'Piñango',
          email: 'rosaura@correo.com',
          identificationType: IdentificationType.V,
          identificationNumber: '11402336',
        } as ShippingAddress,
      }),
    ]);

    const row = await firstRow();

    expect(row.customerName).toBe('Rosaura Piñango');
    expect(row.customerIdentification).toBe('V-11402336');
  });

  it('deja al comprador nulo cuando no hay ninguna de las tres fuentes', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([makeOrder()]);

    const row = await firstRow();

    expect(row.customerName).toBeNull();
    expect(row.customerIdentification).toBeNull();
    expect(row.customerEmail).toBeNull();
  });

  it('omite el guion cuando hay número de identificación pero no tipo', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({
        shippingAddress: {
          firstName: 'Deivis',
          lastName: 'Colmenares',
          identificationNumber: '27118904',
        } as ShippingAddress,
      }),
    ]);

    expect((await firstRow()).customerIdentification).toBe('27118904');
  });

  it('usa la referencia de transferencia cuando no hay código de pago móvil', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([
      makeOrder({
        paymentInfo: {
          status: PaymentStatus.PENDING,
          method: PaymentMethod.TRANSFERENCIA,
          referenceNumber: '99881122',
          receiptUrl: 'https://s3/comprobante.jpg',
        } as PaymentInfo,
      }),
    ]);

    const row = await firstRow();

    expect(row.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(row.paymentReference).toBe('99881122');
    expect(row.hasReceipt).toBe(true);
  });

  it('busca también por nombre, identificación y referencia de pago', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await service.getAdminOrders({ search: 'V-18.402.117' });

    const [condition, params] = mockQueryBuilder.andWhere.mock.calls[0];
    expect(condition).toContain("CONCAT(guestCustomer.firstName, ' '");
    expect(condition).toContain('paymentInfo.referenceCode');
    // Se comparan los dígitos contra la columna también sin puntos ni guiones:
    // el admin teclea "V-18.402.117" y en la base está cruda como "18402117".
    expect(condition).toContain(
      "REPLACE(REPLACE(guestCustomer.identificationNumber, '.', ''), '-', '') ILIKE :identification",
    );
    expect(params).toEqual({
      search: '%V-18.402.117%',
      identification: '%18402117%',
    });
  });

  it('no busca por identificación cuando lo tecleado no trae dígitos suficientes', async () => {
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await service.getAdminOrders({ search: 'Pérez' });

    const [condition, params] = mockQueryBuilder.andWhere.mock.calls[0];
    expect(condition).not.toContain('identification');
    expect(params).toEqual({ search: '%Pérez%' });
  });
});
