import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersV1Controller } from './orders-v1.controller';
import { OrdersService } from '../../orders/orders.service';
import { Order, OrderStatus, DeliveryMethod } from '../../orders/order.entity';
import { UpdateOrderExternalDto } from '../../orders/dto/update-order-external.dto';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { PaginationLinkInterceptor } from '../common/interceptors/pagination-link.interceptor';

const TZ = 'America/Caracas';

const mockOrdersService = () => ({
  findAll: jest.fn(),
  getPendingOrders: jest.fn(),
  findOneForErp: jest.fn(),
  acknowledgeOrder: jest.fn(),
  completeOrder: jest.fn(),
  cancelPendingOrder: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn().mockReturnValue(TZ),
});

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 34,
    status: OrderStatus.ON_HOLD,
    createdAt: new Date('2026-07-31T04:37:03.000Z'),
    total: 23.2,
    tax: 3.2,
    deliveryMethod: DeliveryMethod.PICKUP,
    notes: null,
    user: null,
    guestEmail: null,
    guestCustomer: null,
    shippingAddress: null,
    items: [],
    ...overrides,
  }) as Order;

describe('OrdersV1Controller', () => {
  let controller: OrdersV1Controller;
  let ordersService: ReturnType<typeof mockOrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersV1Controller],
      providers: [
        { provide: OrdersService, useFactory: mockOrdersService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    })
      // El controlador lleva @UseGuards(ApiKeyGuard) y
      // @UseInterceptors(WebhookInterceptor, PaginationLinkInterceptor) a
      // nivel de clase; Nest los resuelve por tipo al armar el módulo aunque
      // las pruebas llamen los métodos directo, sin pasar por HTTP, así que
      // hace falta reemplazarlos explícitamente para no arrastrar
      // ApiKeysService/WebhooksService completos a una prueba de controlador.
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(WebhookInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .overrideInterceptor(PaginationLinkInterceptor)
      .useValue({
        intercept: (_ctx: unknown, next: { handle: () => unknown }) =>
          next.handle(),
      })
      .compile();

    controller = module.get(OrdersV1Controller);
    ordersService = module.get(OrdersService);
  });

  // Regresión del hallazgo #1: GET /:id tiene que emitir la misma forma que
  // /on-hold, no la entidad cruda.
  describe('findOne', () => {
    it('serializa la orden con toWooOrder, igual que findPending', async () => {
      ordersService.findOneForErp.mockResolvedValue(makeOrder());

      const result = await controller.findOne('34');

      // La entidad cruda no tiene `line_items`; la forma Woo sí.
      expect(result).toHaveProperty('line_items');
      expect(result).toHaveProperty('date_created');
      expect(result).not.toHaveProperty('items');
      expect(result).not.toHaveProperty('createdAt');
    });
  });

  describe('updateByExternal', () => {
    const dto = (overrides: Partial<UpdateOrderExternalDto> = {}) =>
      ({
        status: OrderStatus.CANCELLED,
        ...overrides,
      }) as UpdateOrderExternalDto;

    it('pending sin order_key rechaza con 400', async () => {
      await expect(
        controller.updateByExternal(34, dto({ status: OrderStatus.PENDING })),
      ).rejects.toThrow(BadRequestException);
      expect(ordersService.acknowledgeOrder).not.toHaveBeenCalled();
    });

    it('pending con order_key llama a acknowledgeOrder', async () => {
      ordersService.acknowledgeOrder.mockResolvedValue(makeOrder());

      await controller.updateByExternal(
        34,
        dto({ status: OrderStatus.PENDING, order_key: 'OC-1' }),
      );

      expect(ordersService.acknowledgeOrder).toHaveBeenCalledWith(34, 'OC-1');
    });

    it('completed sin date_completed rechaza con 400', async () => {
      await expect(
        controller.updateByExternal(
          34,
          dto({ status: OrderStatus.COMPLETED, order_key: 'FAC-1' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(ordersService.completeOrder).not.toHaveBeenCalled();
    });

    it('completed con order_key y date_completed llama a completeOrder', async () => {
      ordersService.completeOrder.mockResolvedValue(makeOrder());

      await controller.updateByExternal(
        34,
        dto({
          status: OrderStatus.COMPLETED,
          order_key: 'FAC-1',
          date_completed: '2026-03-07T10:00:00.000Z',
        }),
      );

      expect(ordersService.completeOrder).toHaveBeenCalledWith(
        34,
        'FAC-1',
        new Date('2026-03-07T10:00:00.000Z'),
      );
    });

    it('cancelled sin date_completed rechaza con 400', async () => {
      await expect(
        controller.updateByExternal(34, dto({ status: OrderStatus.CANCELLED })),
      ).rejects.toThrow(BadRequestException);
      expect(ordersService.cancelPendingOrder).not.toHaveBeenCalled();
    });

    // El punto del hallazgo: OrbisNet documenta `canceled` (una L) y nuestro
    // enum usa `cancelled` (dos L). Ambas grafías tienen que terminar en el
    // mismo lugar: `cancelPendingOrder`.
    it.each([OrderStatus.CANCELLED, 'canceled'] as const)(
      'status "%s" llama a cancelPendingOrder',
      async (status) => {
        ordersService.cancelPendingOrder.mockResolvedValue(makeOrder());

        await controller.updateByExternal(
          34,
          dto({ status, date_completed: '2026-03-07T10:00:00.000Z' }),
        );

        expect(ordersService.cancelPendingOrder).toHaveBeenCalledWith(
          34,
          new Date('2026-03-07T10:00:00.000Z'),
        );
      },
    );
  });
});
