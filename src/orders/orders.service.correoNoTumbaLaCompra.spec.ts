import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, FindOneOptions } from 'typeorm';
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

/**
 * `createOrder` mandaba sus dos correos con `await` pelado y sin `try/catch`,
 * en la ÚLTIMA línea de un método que ya guardó el pedido, creó sus renglones,
 * **descontó inventario real**, vació el carrito, quizá dio de alta una cuenta
 * y consumió un uso del cupón. Nada de eso está en una transacción.
 *
 * Si esa última línea lanza, el cliente recibe un 500 y da por fallada una
 * compra que SÍ existe y que ya le apartó la mercancía: va a volver a
 * intentarlo, y el inventario se descuenta otra vez. Es exactamente la trampa
 * de orden de operaciones que ya se arregló para el alta de cuenta del checkout
 * —el `createAccount` corría después de todas las escrituras y un correo
 * repetido lo reventaba ahí mismo— y la que documenta `EmailService.render`.
 *
 * **Un matiz que conviene dejar escrito**, porque cambia lo que hay que probar:
 * `EmailService` ya se traga por su cuenta los fallos de SMTP y de plantilla
 * (`sendEmail` y `render` tienen su propio `try/catch`). Se comprobó midiendo:
 * con el servidor de correo apagado, `POST /orders` seguía devolviendo 201. O
 * sea que el 500 por SMTP caído NO era reproducible.
 *
 * Lo que sí queda es la forma del fallo: la garantía vive entera en la otra
 * clase, en dos `catch` que cualquiera puede mover al refactorizar, y este
 * método no tiene nada que lo proteja. Cualquier excepción que se escape de
 * `sendOrderConfirmation` —un `order.items` nulo en el `.some()` que corre
 * antes del `try`, un fallo del constructor de payloads, un `transporter` sin
 * inicializar— convierte una compra hecha en un 500. Estas pruebas fijan que
 * el pedido sobrevive al correo pase lo que pase en el correo, sin depender de
 * cómo se porte `EmailService`.
 */
describe('OrdersService.createOrder — un correo fallido no tumba la compra', () => {
  let service: OrdersService;
  let orderRepo: { save: jest.Mock; findOne: jest.Mock };
  let productRepo: { findOne: jest.Mock; decrement: jest.Mock };
  let emailService: {
    sendOrderConfirmation: jest.Mock;
    sendAdminNewOrder: jest.Mock;
  };

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

  const dto = {
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

  const hoy = (): string => {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const filaDeTasa = { id: hoy(), date: hoy(), rate: 744.22, source: 'bcv' };

  const build = async () => {
    orderRepo = {
      save: jest.fn((o: Order) => {
        o.uuid = o.uuid ?? 'order-uuid-1';
        o.id = o.id ?? 1;
        return Promise.resolve(o);
      }),
      findOne: jest.fn(() =>
        Promise.resolve({
          uuid: 'order-uuid-1',
          orderNumber: 'ORD-0001',
        } as Order),
      ),
    };
    productRepo = {
      findOne: jest.fn(() => Promise.resolve(product)),
      decrement: jest.fn(),
    };
    emailService = {
      sendOrderConfirmation: jest.fn(),
      sendAdminNewOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        ExchangeRatesService,
        OrderPricingService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn((i: OrderItem) => i),
            save: jest.fn((i: OrderItem[]) => Promise.resolve(i)),
          },
        },
        {
          provide: getRepositoryToken(ShippingAddress),
          useValue: { create: jest.fn((a) => a), save: jest.fn((a) => a) },
        },
        {
          provide: getRepositoryToken(PaymentInfo),
          useValue: {
            create: jest.fn((p: PaymentInfo) => p),
            save: jest.fn((p: PaymentInfo) => Promise.resolve(p)),
          },
        },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: {
            findOne: jest.fn((o: FindOneOptions<ExchangeRate>) => {
              const where = (o.where ?? {}) as {
                date?: FindOperator<Date> | Date;
              };
              void where;
              return Promise.resolve(filaDeTasa as unknown as ExchangeRate);
            }),
          },
        },
        { provide: BCVService, useValue: { getBCVRate: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: DiscountsService, useValue: {} },
        { provide: BanksService, useValue: {} },
        {
          provide: GuestCustomersService,
          useValue: {
            createOrUpdate: jest.fn(() => Promise.resolve({ id: 7 })),
          },
        },
        {
          provide: UsersService,
          useValue: { create: jest.fn(), findByEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await build();
  });

  it('devuelve el pedido aunque falle el correo al cliente', async () => {
    emailService.sendOrderConfirmation.mockRejectedValue(
      new Error('SMTP caído'),
    );

    const orden = await service.createOrder(dto, null);

    expect(orden).toBeDefined();
    expect(orden.uuid).toBe('order-uuid-1');
    // Y el pedido está guardado de verdad: no es que se haya devuelto algo
    // desde un camino de error.
    expect(orderRepo.save).toHaveBeenCalled();
  });

  it('devuelve el pedido aunque falle el aviso al administrador', async () => {
    emailService.sendAdminNewOrder.mockRejectedValue(new Error('SMTP caído'));

    const orden = await service.createOrder(dto, null);

    expect(orden.uuid).toBe('order-uuid-1');
  });

  it('devuelve el pedido aunque fallen los dos correos', async () => {
    emailService.sendOrderConfirmation.mockRejectedValue(new Error('caído'));
    emailService.sendAdminNewOrder.mockRejectedValue(new Error('caído'));

    const orden = await service.createOrder(dto, null);

    expect(orden.uuid).toBe('order-uuid-1');
  });

  /**
   * Los dos correos van con su `try` cada uno, no con uno solo alrededor de
   * los dos. Si el del cliente falla, el administrador tiene que enterarse
   * igual de que hay un pedido nuevo que cobrar — con un `try` compartido, el
   * primer fallo se llevaba el segundo por delante y la tienda no se enteraba
   * de una venta.
   */
  it('el fallo del correo al cliente no se lleva por delante el aviso al administrador', async () => {
    emailService.sendOrderConfirmation.mockRejectedValue(
      new Error('SMTP caído'),
    );

    await service.createOrder(dto, null);

    expect(emailService.sendAdminNewOrder).toHaveBeenCalledTimes(1);
  });

  /**
   * El descuento de inventario ocurre ANTES de los correos y no se toca:
   * tragarse el fallo del correo no puede convertirse, por accidente, en
   * tragarse también el resto del método.
   */
  it('con el correo caído el inventario sigue descontándose una sola vez', async () => {
    emailService.sendOrderConfirmation.mockRejectedValue(new Error('caído'));
    emailService.sendAdminNewOrder.mockRejectedValue(new Error('caído'));

    await service.createOrder(dto, null);

    expect(productRepo.decrement).toHaveBeenCalledTimes(1);
    expect(productRepo.decrement).toHaveBeenCalledWith(
      { uuid: product.uuid },
      'inventory',
      2,
    );
  });

  /**
   * La otra mitad: tragarse los fallos no puede haber apagado el envío. Sin
   * esto, un `avisaPorCorreo` vacío pasaría todas las pruebas de arriba y la
   * tienda dejaría de mandar confirmaciones sin que salte nada.
   */
  it('cuando el correo funciona, los dos salen', async () => {
    const orden = await service.createOrder(dto, null);

    expect(emailService.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(emailService.sendAdminNewOrder).toHaveBeenCalledTimes(1);
    expect(orden.uuid).toBe('order-uuid-1');
  });
});
