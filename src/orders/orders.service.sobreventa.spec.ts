import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderPricingService } from './order-pricing.service';
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
import { IvaType } from '../products/enums/iva-type.enum';

/**
 * El renglón repetido vendía más de lo que hay.
 *
 * La validación de inventario compara cada renglón contra el mismo
 * `product.inventory`, sin acumular lo que ya comprometieron los anteriores.
 * Con 4 unidades en existencia, un carrito de 2 + 3 del mismo producto pasaba
 * las dos comprobaciones por separado y dejaba el inventario en −1.
 *
 * Reproducido contra el servidor real antes de arreglarlo: el pedido se creó
 * con 201 y `products.inventory` quedó en −1.
 */
describe('OrdersService — sobreventa por renglón repetido', () => {
  let service: OrdersService;
  let productRepository: {
    findOne: jest.Mock;
    increment: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  /** Cuántas filas dice haber tocado cada reserva, en orden de llamada. */
  let reservas: number[];
  let cartRepository: { findOne: jest.Mock };
  let pricingService: { price: jest.Mock };

  const INVENTARIO = 4;

  const producto = (over: Partial<Product> = {}): Product =>
    ({
      id: 1,
      uuid: 'uuid-1',
      name: 'Pintura esmalte 1/4 galón',
      sku: '30656',
      priceWithIva: 10.44,
      priceWithIvaVes: 5023.91,
      ivaType: IvaType.NORMAL,
      inventory: INVENTARIO,
      published: true,
      ...over,
    }) as unknown as Product;

  beforeEach(async () => {
    reservas = [];
    productRepository = {
      findOne: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, jest.Mock> = {};
        for (const m of ['update', 'set', 'where', 'setParameter']) {
          qb[m] = jest.fn(() => qb);
        }
        qb.execute = jest.fn(() =>
          Promise.resolve({ affected: reservas.shift() ?? 1 }),
        );
        return qb;
      }),
    };
    cartRepository = { findOne: jest.fn() };
    pricingService = { price: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: UsersService,
          useValue: { create: jest.fn(), findByEmail: jest.fn() },
        },
        { provide: OrderPricingService, useValue: pricingService },
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        { provide: getRepositoryToken(PaymentInfo), useValue: {} },
        { provide: getRepositoryToken(Cart), useValue: cartRepository },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: GuestCustomersService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: DiscountsService, useValue: {} },
        { provide: BanksService, useValue: {} },
        { provide: ExchangeRatesService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  const pricingVacio = () => ({
    lines: [],
    itemsTotal: 0,
    discount: 0,
    discountCode: null,
    discountId: null,
    discountUuid: null,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    exchangeRate: 481.22,
    rateDate: '2026-08-01',
    subtotalVes: 0,
    taxVes: 0,
    discountVes: 0,
    totalVes: 0,
  });

  describe('la cotización', () => {
    it('suma los renglones del mismo producto en uno solo', async () => {
      const p = producto();
      productRepository.findOne.mockResolvedValue(p);
      pricingService.price.mockResolvedValue({
        lines: [],
        itemsTotal: 0,
        discount: 0,
        discountCode: null,
        discountId: null,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        exchangeRate: 481.22,
        rateDate: '2026-08-01',
        subtotalVes: 0,
        taxVes: 0,
        discountVes: 0,
        totalVes: 0,
      });

      const quote = await service.quoteOrder({
        items: [
          { productUuid: 'uuid-1', quantity: 2 },
          { productUuid: 'uuid-1', quantity: 3 },
        ],
      });

      expect(quote.items).toHaveLength(1);
      expect(quote.items[0].quantity).toBe(5);
    });

    it('marca inventario insuficiente cuando la suma pasa las existencias', async () => {
      const p = producto();
      productRepository.findOne.mockResolvedValue(p);
      pricingService.price.mockResolvedValue({
        lines: [],
        itemsTotal: 0,
        discount: 0,
        discountCode: null,
        discountId: null,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        exchangeRate: 481.22,
        rateDate: '2026-08-01',
        subtotalVes: 0,
        taxVes: 0,
        discountVes: 0,
        totalVes: 0,
      });

      const quote = await service.quoteOrder({
        items: [
          { productUuid: 'uuid-1', quantity: 2 },
          { productUuid: 'uuid-1', quantity: 3 },
        ],
      });

      expect(quote.canCheckout).toBe(false);
      expect(quote.items[0].issue).toEqual({
        code: 'INSUFFICIENT_INVENTORY',
        available: INVENTARIO,
      });
    });

    it('no estorba cuando la suma sí alcanza', async () => {
      const p = producto();
      productRepository.findOne.mockResolvedValue(p);
      pricingService.price.mockResolvedValue({
        lines: [],
        itemsTotal: 0,
        discount: 0,
        discountCode: null,
        discountId: null,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        exchangeRate: 481.22,
        rateDate: '2026-08-01',
        subtotalVes: 0,
        taxVes: 0,
        discountVes: 0,
        totalVes: 0,
      });

      const quote = await service.quoteOrder({
        items: [
          { productUuid: 'uuid-1', quantity: 1 },
          { productUuid: 'uuid-1', quantity: 3 },
        ],
      });

      expect(quote.items).toHaveLength(1);
      expect(quote.items[0].quantity).toBe(4);
      expect(quote.items[0].issue).toBeNull();
      expect(quote.canCheckout).toBe(true);
    });

    it('deja separados los productos distintos', async () => {
      const p1 = producto();
      const p2 = producto({ id: 2, uuid: 'uuid-2', sku: '30365' });
      productRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(where.uuid === 'uuid-1' ? p1 : p2),
      );
      pricingService.price.mockResolvedValue({
        lines: [],
        itemsTotal: 0,
        discount: 0,
        discountCode: null,
        discountId: null,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        exchangeRate: 481.22,
        rateDate: '2026-08-01',
        subtotalVes: 0,
        taxVes: 0,
        discountVes: 0,
        totalVes: 0,
      });

      const quote = await service.quoteOrder({
        items: [
          { productUuid: 'uuid-1', quantity: 2 },
          { productUuid: 'uuid-2', quantity: 2 },
        ],
      });

      expect(quote.items).toHaveLength(2);
      expect(quote.items.map((i) => i.quantity)).toEqual([2, 2]);
    });
  });

  describe('la creación del pedido', () => {
    const pedido = (items: Array<{ productUuid: string; quantity: number }>) =>
      ({
        items,
        customerInfo: {
          identificationType: 'V',
          identificationNumber: '12345678',
          firstName: 'Prueba',
          lastName: 'Sobreventa',
          email: 'prueba@ejemplo.test',
          phone: '04121234567',
        },
        deliveryMethod: 'pickup',
        paymentMethod: 'pagomovil',
        paymentDetails: { referenceCode: '000111' },
      }) as never;

    it('rechaza el pedido cuando los renglones repetidos superan el inventario', async () => {
      productRepository.findOne.mockResolvedValue(producto());

      await expect(
        service.createOrder(
          pedido([
            { productUuid: 'uuid-1', quantity: 2 },
            { productUuid: 'uuid-1', quantity: 3 },
          ]),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('el mensaje de rechazo informa las existencias reales', async () => {
      productRepository.findOne.mockResolvedValue(producto());

      await expect(
        service.createOrder(
          pedido([
            { productUuid: 'uuid-1', quantity: 2 },
            { productUuid: 'uuid-1', quantity: 3 },
          ]),
        ),
      ).rejects.toThrow(`Available: ${INVENTARIO}`);
    });
  });

  /**
   * La segunda mitad del problema: la comprobación del paso 2 lee el
   * inventario y no vuelve a mirarlo hasta descontar, ~200 líneas después.
   * Dos checkouts simultáneos del mismo producto veían ambos "alcanza".
   *
   * Reproducido contra el servidor: cuatro pedidos concurrentes de 4 unidades
   * sobre un stock de 4 se aceptaban los cuatro y dejaban el inventario
   * en −12.
   */
  describe('la reserva atómica', () => {
    const pedidoSimple = () =>
      ({
        items: [{ productUuid: 'uuid-1', quantity: 4 }],
        customerInfo: {
          identificationType: 'V',
          identificationNumber: '12345678',
          firstName: 'Prueba',
          lastName: 'Concurrencia',
          email: 'prueba@ejemplo.test',
          phone: '04121234567',
        },
        deliveryMethod: 'pickup',
        paymentMethod: 'pagomovil',
        paymentDetails: { referenceCode: '000111' },
      }) as never;

    it('descuenta comprobando en la misma instrucción, no con decrement()', async () => {
      productRepository.findOne.mockResolvedValue(producto());
      pricingService.price.mockRejectedValue(new Error('corte'));

      await expect(service.createOrder(pedidoSimple())).rejects.toThrow();

      // El precio se calcula ANTES de reservar: si se llegó a reservar acá,
      // el orden de las operaciones se rompió.
      expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rechaza cuando otro pedido se llevó las últimas unidades', async () => {
      // El paso 2 lee 4 y da el visto bueno; para cuando se reserva, otro
      // checkout ya se las llevó. Ese es exactamente el hueco que se cerró.
      productRepository.findOne.mockResolvedValue(producto());
      pricingService.price.mockResolvedValue(pricingVacio());
      reservas = [0]; // la reserva no encontró existencias

      await expect(service.createOrder(pedidoSimple())).rejects.toThrow(
        ConflictException,
      );
    });

    it('informa las existencias reales al rechazar, no las que leyó antes', async () => {
      productRepository.findOne
        .mockResolvedValueOnce(producto())
        .mockResolvedValue(producto({ inventory: 1 }));
      pricingService.price.mockResolvedValue(pricingVacio());
      reservas = [0];

      await expect(service.createOrder(pedidoSimple())).rejects.toThrow(
        'Available: 1',
      );
    });

    it('devuelve lo ya reservado cuando falla un producto posterior', async () => {
      const p1 = producto();
      const p2 = producto({ id: 2, uuid: 'uuid-2', name: 'Cemento gris' });
      productRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(where.uuid === 'uuid-1' ? p1 : p2),
      );
      pricingService.price.mockResolvedValue(pricingVacio());
      reservas = [1, 0]; // el primero reserva, el segundo no alcanza

      await expect(
        service.createOrder({
          ...(pedidoSimple() as object),
          items: [
            { productUuid: 'uuid-1', quantity: 2 },
            { productUuid: 'uuid-2', quantity: 2 },
          ],
        } as never),
      ).rejects.toThrow(ConflictException);

      // Las 2 unidades del primero no las respalda ningún pedido: vuelven.
      expect(productRepository.increment).toHaveBeenCalledWith(
        { uuid: 'uuid-1' },
        'inventory',
        2,
      );
    });

    it('devuelve el inventario si el pedido revienta después de reservar', async () => {
      productRepository.findOne.mockResolvedValue(producto());
      pricingService.price.mockResolvedValue(pricingVacio());
      reservas = [1];

      // El repositorio de órdenes está vacío: guardar la orden revienta
      // después de que el inventario ya quedó comprometido.
      await expect(service.createOrder(pedidoSimple())).rejects.toThrow();

      expect(productRepository.increment).toHaveBeenCalledWith(
        { uuid: 'uuid-1' },
        'inventory',
        4,
      );
    });
  });
});
