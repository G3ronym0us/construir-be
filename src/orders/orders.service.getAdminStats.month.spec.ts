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

const mockService = () => ({});

/**
 * El bloque "Ventas e Ingresos del Mes" del panel salía siempre en "No hay
 * datos disponibles": el frontend exigía `currentMonth` y `previousMonth`, y
 * este endpoint —el único que consulta— nunca los mandó. Estas pruebas fijan
 * que existan y, sobre todo, QUÉ cuentan, porque una cifra de ventas mal
 * definida engaña más que una tarjeta vacía:
 *
 *  - sólo pagos verificados y no cancelados, igual que `verifiedRevenue`;
 *  - el mes lo decide la fecha del pedido, no la de la verificación;
 *  - las variaciones van en USD, y son `null` —no 0— si el mes anterior fue
 *    cero, para que el panel no diga "vendiste lo mismo" contra la nada.
 */
describe('OrdersService.getAdminStats — bloque mensual de ventas', () => {
  let service: OrdersService;
  /** Los `where`/`andWhere` de la última consulta de órdenes por pago. */
  let paramsVerificadas: Record<string, unknown>;
  let ordenesVerificadas: Partial<Order>[];

  const orden = (
    createdAt: Date,
    total: string,
    totalVes: string | null,
  ): Partial<Order> =>
    ({ createdAt, total, totalVes }) as unknown as Partial<Order>;

  const crearQueryBuilder = () => {
    const params: Record<string, unknown> = {};
    const qb: Record<string, jest.Mock> = {
      select: jest.fn(() => qb),
      addSelect: jest.fn(() => qb),
      groupBy: jest.fn(() => qb),
      innerJoin: jest.fn(() => qb),
      where: jest.fn((_sql: string, p?: Record<string, unknown>) => {
        Object.assign(params, p);
        return qb;
      }),
      andWhere: jest.fn((_sql: string, p?: Record<string, unknown>) => {
        Object.assign(params, p);
        return qb;
      }),
      getRawMany: jest.fn().mockResolvedValue([
        { status: OrderStatus.COMPLETED, count: '3' },
      ]),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn(() => {
        if (params.status !== PaymentStatus.VERIFIED) return Promise.resolve([]);
        paramsVerificadas = { ...params };
        // El servicio pide a la BD las verificadas YA sin canceladas, así que
        // el doble devuelve esa lista; que el filtro se pida de verdad se
        // comprueba aparte, sobre `paramsVerificadas`.
        return Promise.resolve(ordenesVerificadas);
      }),
    };
    return qb;
  };

  const construir = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: { createQueryBuilder: jest.fn(crearQueryBuilder) },
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
        {
          provide: ExchangeRatesService,
          useValue: { findLatest: jest.fn().mockResolvedValue(null) },
        },
        { provide: OrderPricingService, useFactory: mockService },
      ],
    }).compile();
    service = module.get(OrdersService);
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 9, 10, 0, 0));
    paramsVerificadas = {};
    ordenesVerificadas = [];
    await construir();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('separa el mes en curso del anterior y deja fuera lo más viejo', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'), // septiembre
      orden(new Date(2026, 8, 8, 9, 0), '50.00', '24000.00'), // septiembre
      orden(new Date(2026, 7, 15, 9, 0), '80.00', '38000.00'), // agosto
      orden(new Date(2026, 6, 20, 9, 0), '999.00', '480000.00'), // julio: fuera
    ];

    const stats = await service.getAdminStats();

    expect(stats.currentMonth.month).toBe('2026-09');
    expect(stats.currentMonth.verifiedOrders).toBe(2);
    expect(stats.currentMonth.verifiedRevenue).toBe(150);
    expect(stats.currentMonth.verifiedRevenueVes).toBe(72000);

    expect(stats.previousMonth.month).toBe('2026-08');
    expect(stats.previousMonth.verifiedOrders).toBe(1);
    expect(stats.previousMonth.verifiedRevenue).toBe(80);
  });

  it('incluye el último día del mes anterior y no lo cuenta en el actual', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 7, 31, 23, 59, 59), '80.00', '38000.00'),
      orden(new Date(2026, 8, 1, 0, 0, 0), '100.00', '48000.00'),
    ];

    const stats = await service.getAdminStats();

    expect(stats.currentMonth.verifiedRevenue).toBe(100);
    expect(stats.previousMonth.verifiedRevenue).toBe(80);
  });

  it('calcula la variación en USD y en número de pedidos', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'),
      orden(new Date(2026, 8, 8, 9, 0), '50.00', '24000.00'),
      orden(new Date(2026, 7, 15, 9, 0), '100.00', '20000.00'),
    ];

    const stats = await service.getAdminStats();

    // 150 contra 100 en USD: +50%. En bolívares habría dado +260%, que es la
    // tasa BCV subiendo y no una venta más — por eso no se compara en Bs.
    expect(stats.currentMonth.percentageChangeRevenue).toBe(50);
    // 2 pedidos contra 1.
    expect(stats.currentMonth.percentageChangeOrders).toBe(100);
    // Ticket medio: 75 contra 100.
    expect(stats.currentMonth.percentageChangeAverageTicket).toBe(-25);
  });

  it('deja la variación en null cuando el mes anterior no tuvo ventas', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'),
    ];

    const stats = await service.getAdminStats();

    expect(stats.previousMonth.verifiedOrders).toBe(0);
    expect(stats.currentMonth.percentageChangeRevenue).toBeNull();
    expect(stats.currentMonth.percentageChangeOrders).toBeNull();
    expect(stats.currentMonth.percentageChangeAverageTicket).toBeNull();
  });

  it('promedia en Bs. sólo entre las órdenes que tienen monto en Bs.', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'),
      // Anterior a que se guardara la tasa: sin monto en Bs.
      orden(new Date(2026, 8, 3, 9, 0), '100.00', null),
    ];

    const stats = await service.getAdminStats();

    expect(stats.currentMonth.verifiedRevenueVes).toBe(48000);
    // 48000 entre 1, no entre 2: dividir entre todas daría 24000, un ticket
    // medio en Bs. que no existió.
    expect(stats.currentMonth.averageTicketVes).toBe(48000);
    expect(stats.currentMonth.averageTicket).toBe(100);
  });

  it('deja el monto en Bs. en null si ninguna orden del mes lo tiene', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', null),
    ];

    const stats = await service.getAdminStats();

    expect(stats.currentMonth.verifiedRevenueVes).toBeNull();
    expect(stats.currentMonth.averageTicketVes).toBeNull();
  });

  it('pide a la BD sólo pagos verificados y sin canceladas', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'),
    ];

    await service.getAdminStats();

    expect(paramsVerificadas.status).toBe(PaymentStatus.VERIFIED);
    expect(paramsVerificadas.cancelled).toBe(OrderStatus.CANCELLED);
  });

  it('el mes en curso cuadra con el ingreso verificado total si no hay nada más viejo', async () => {
    ordenesVerificadas = [
      orden(new Date(2026, 8, 2, 9, 0), '100.00', '48000.00'),
      orden(new Date(2026, 8, 8, 9, 0), '50.00', '24000.00'),
    ];

    const stats = await service.getAdminStats();

    // Las dos cifras salen de la misma lista: el panel no puede enseñar dos
    // números de ventas distintos para el mismo dinero.
    expect(stats.currentMonth.verifiedRevenue).toBe(stats.verifiedRevenue);
    expect(stats.currentMonth.verifiedOrders).toBe(stats.verifiedOrders);
  });
});
