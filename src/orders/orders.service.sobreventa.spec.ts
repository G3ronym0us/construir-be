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
  /** El `where` con el que se armó cada UPDATE de reserva, en orden. */
  let condicionesDeReserva: string[];
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
    condicionesDeReserva = [];
    productRepository = {
      findOne: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, jest.Mock> = {};
        for (const m of ['update', 'set', 'setParameter']) {
          qb[m] = jest.fn(() => qb);
        }
        // La condición del UPDATE se anota tal cual: es LA garantía de
        // atomicidad y hay una prueba abajo que la exige literalmente.
        qb.where = jest.fn((condicion: string) => {
          condicionesDeReserva.push(condicion);
          return qb;
        });
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
  /**
   * El renglón repetido no llega sólo por el DTO del invitado: el carrito del
   * servidor puede traer el mismo producto en dos filas, y esa es la ruta del
   * cliente con sesión. `agruparPorProducto` se aplica a los dos caminos de
   * `resolveOrderItems`, pero sólo el del DTO estaba cubierto: quitar la
   * llamada de la rama del carrito dejaba la suite entera en verde
   * (comprobado). Sin esto, la sobreventa vuelve para el usuario registrado y
   * nada avisa.
   */
  describe('el carrito del usuario con sesión', () => {
    it('suma las filas repetidas del carrito antes de validar', async () => {
      const p = producto();
      productRepository.findOne.mockResolvedValue(p);
      cartRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 7,
        items: [
          { uuid: 'ci-1', quantity: 2, product: p },
          { uuid: 'ci-2', quantity: 3, product: p },
        ],
      });
      pricingService.price.mockResolvedValue(pricingVacio());

      // 2 + 3 = 5 sobre un inventario de 4: sin agrupar, cada fila pasaba su
      // comprobación por separado («2 ≤ 4» y «3 ≤ 4») y se vendían 5 de 4.
      await expect(
        service.createOrder(
          {
            deliveryMethod: 'pickup',
            paymentMethod: 'pagomovil',
            paymentDetails: { referenceCode: '000111' },
          } as never,
          7,
        ),
      ).rejects.toThrow(BadRequestException);

      // Y no llegó a tocar el stock: el rechazo es anterior a toda escritura.
      expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

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

    /**
     * La atomicidad entera vive en esa condición del UPDATE, y en ningún otro
     * sitio: sin ella el `SET inventory = inventory - :cantidad` sigue
     * corriendo, sigue devolviendo `affected: 1` y todas las demás pruebas de
     * este fichero siguen en verde — mientras el inventario se va a negativo
     * en producción. Comprobado borrándola a propósito: la suite no se
     * inmutaba. Por eso se exige aquí la cadena literal.
     *
     * Si hay que cambiar la forma del `where`, esta prueba tiene que cambiar
     * con él A PROPÓSITO. Que duela es justamente lo que se busca.
     */
    it('el UPDATE lleva la condición que impide bajar de cero', async () => {
      productRepository.findOne.mockResolvedValue(producto());
      pricingService.price.mockResolvedValue(pricingVacio());
      reservas = [1];

      await expect(service.createOrder(pedidoSimple())).rejects.toThrow();

      expect(condicionesDeReserva).toEqual([
        'uuid = :uuid AND inventory >= :cantidad',
      ]);
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
