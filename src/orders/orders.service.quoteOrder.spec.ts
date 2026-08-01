import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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

describe('OrdersService.quoteOrder', () => {
  let service: OrdersService;
  let productRepository: { findOne: jest.Mock };
  let pricingService: { price: jest.Mock };
  let cartRepository: { findOne: jest.Mock };

  const producto = (over: Partial<Product> = {}): Product =>
    ({
      id: 1,
      uuid: 'uuid-1',
      name: 'Martillo 16oz',
      sku: 'MART-001',
      priceWithIva: 11.6,
      priceWithIvaVes: 2847.8,
      ivaType: IvaType.NORMAL,
      inventory: 10,
      published: true,
      ...over,
    }) as unknown as Product;

  beforeEach(async () => {
    productRepository = { findOne: jest.fn() };
    pricingService = { price: jest.fn() };
    cartRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: UsersService, useValue: { create: jest.fn(), findByEmail: jest.fn() } },
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

  const pricingDe = (p: Product) => ({
    lines: [
      {
        product: p,
        quantity: 2,
        unitPrice: 11.6,
        lineTotal: 23.2,
        discount: 0,
        base: 20,
        iva: 3.2,
        total: 23.2,
        baseVes: 4910,
        ivaVes: 785.6,
        totalVes: 5695.6,
      },
    ],
    itemsTotal: 23.2,
    discount: 0,
    discountCode: null,
    discountId: null,
    subtotal: 20,
    tax: 3.2,
    shipping: 0,
    total: 23.2,
    exchangeRate: 245.5,
    rateDate: '2026-07-29',
    subtotalVes: 4910,
    taxVes: 785.6,
    discountVes: 0,
    totalVes: 5695.6,
  });

  it('devuelve el desglose completo sin persistir nada', async () => {
    const p = producto();
    productRepository.findOne.mockResolvedValue(p);
    pricingService.price.mockResolvedValue(pricingDe(p));

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 2 }],
    });

    expect(quote.canCheckout).toBe(true);
    expect(quote.exchangeRate).toBe(245.5);
    expect(quote.rateDate).toBe('2026-07-29');
    expect(quote.totals.subtotal).toBe(20);
    expect(quote.totals.tax).toBe(3.2);
    expect(quote.totals.total).toBe(23.2);
    expect(quote.totals.totalVes).toBe(5695.6);
    expect(quote.items).toHaveLength(1);
    expect(quote.items[0]).toMatchObject({
      productUuid: 'uuid-1',
      name: 'Martillo 16oz',
      sku: 'MART-001',
      quantity: 2,
      ivaRate: 16,
      unitPrice: 11.6,
      base: 20,
      iva: 3.2,
      total: 23.2,
      issue: null,
    });
  });

  it('marca el producto inexistente sin tumbar el resto del quote', async () => {
    productRepository.findOne.mockResolvedValue(null);
    pricingService.price.mockResolvedValue({
      ...pricingDe(producto()),
      lines: [],
      itemsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    });

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'no-existe', quantity: 1 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({ code: 'NOT_FOUND' });
    expect(quote.items[0].unitPrice).toBeNull();
  });

  it('marca el producto despublicado y no lo cotiza', async () => {
    productRepository.findOne.mockResolvedValue(producto({ published: false }));
    pricingService.price.mockResolvedValue({
      ...pricingDe(producto()),
      lines: [],
      itemsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    });

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 1 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({ code: 'NOT_PUBLISHED' });
  });

  it('cotiza el ítem sin stock suficiente pero informa lo disponible', async () => {
    const p = producto({ inventory: 1 });
    productRepository.findOne.mockResolvedValue(p);
    pricingService.price.mockResolvedValue(pricingDe(p));

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 2 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({
      code: 'INSUFFICIENT_INVENTORY',
      available: 1,
    });
    // Se cotiza igual: el cliente necesita ver el monto del resto del pedido.
    expect(quote.items[0].total).toBe(23.2);
  });

  // Regresión: un `Map` por UUID de producto colapsaba las líneas y cada
  // renglón terminaba mostrando el monto del otro, con la suma sin cuadrar
  // contra `totals.total`. `price()` genera una línea por entrada, en el
  // mismo orden que `priceable`; la asociación tiene que respetar ese orden.
  //
  // El caso original usaba el MISMO producto dos veces. Eso ya no puede
  // llegar acá: `resolveOrderItems` suma por producto antes de validar (ver
  // `agruparPorProducto`), porque comparar cada renglón por separado contra
  // el mismo inventario vendía más de lo que hay. La garantía sigue
  // haciendo falta igual, así que se cubre con dos productos distintos y
  // cantidades distintas, que es donde la asociación por posición todavía
  // decide.
  it('cotiza cada producto con el monto de su propia línea', async () => {
    const p = producto();
    const otro = producto({ id: 2, uuid: 'uuid-2', name: 'Cemento gris' });
    productRepository.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.uuid === 'uuid-1' ? p : otro),
    );
    pricingService.price.mockResolvedValue({
      lines: [
        {
          product: p,
          quantity: 1,
          unitPrice: 11.6,
          lineTotal: 11.6,
          discount: 0,
          base: 10,
          iva: 1.6,
          total: 11.6,
          baseVes: 2455,
          ivaVes: 392.8,
          totalVes: 2847.8,
        },
        {
          product: otro,
          quantity: 5,
          unitPrice: 11.6,
          lineTotal: 58,
          discount: 0,
          base: 50,
          iva: 8,
          total: 58,
          baseVes: 12275,
          ivaVes: 1964,
          totalVes: 14239,
        },
      ],
      itemsTotal: 69.6,
      discount: 0,
      discountCode: null,
      discountId: null,
      subtotal: 60,
      tax: 9.6,
      shipping: 0,
      total: 69.6,
      exchangeRate: 245.5,
      rateDate: '2026-07-29',
      subtotalVes: 14730,
      taxVes: 2356.8,
      discountVes: 0,
      totalVes: 17086.8,
    });

    const quote = await service.quoteOrder({
      items: [
        { productUuid: 'uuid-1', quantity: 1 },
        { productUuid: 'uuid-2', quantity: 5 },
      ],
    });

    expect(quote.items).toHaveLength(2);
    // Cada ítem muestra el monto de SU propia cantidad, no el del otro.
    expect(quote.items[0]).toMatchObject({ quantity: 1, total: 11.6 });
    expect(quote.items[1]).toMatchObject({ quantity: 5, total: 58 });

    const itemsTotalSum = quote.items.reduce(
      (sum, item) => sum + (item.total ?? 0),
      0,
    );
    expect(itemsTotalSum).toBeCloseTo(quote.totals.total, 2);

    const itemsTotalVesSum = quote.items.reduce(
      (sum, item) => sum + (item.totalVes ?? 0),
      0,
    );
    expect(itemsTotalVesSum).toBeCloseTo(quote.totals.totalVes ?? 0, 2);
  });

  // Regresión del review final de rama (I-1): `quoteOrder` leía SÓLO
  // `dto.items`, incluso para un usuario autenticado. `createOrder`, para el
  // mismo usuario, ignora `dto.items` y factura el carrito del servidor. Un
  // cliente logueado podía cotizar 11.60 con un `items[]` armado a mano y
  // que se le facturara el contenido real de su carrito — un número distinto,
  // sin ningún guard que lo detectara.
  it('para un usuario autenticado, cotiza el carrito del servidor e ignora dto.items', async () => {
    const cartProduct = producto({
      uuid: 'uuid-carrito',
      name: 'Cabilla 3/8',
      sku: 'CAB-001',
    });
    cartRepository.findOne.mockResolvedValue({
      items: [{ product: cartProduct, quantity: 3 }],
    });
    productRepository.findOne.mockResolvedValue(cartProduct);
    pricingService.price.mockResolvedValue(pricingDe(cartProduct));

    await service.quoteOrder(
      {
        // Un `items[]` distinto al carrito: si el fix no está, esto es lo
        // que se cotiza.
        items: [{ productUuid: 'uuid-no-es-del-carrito', quantity: 99 }],
      },
      42,
    );

    expect(cartRepository.findOne).toHaveBeenCalledWith({
      where: { userId: 42 },
      relations: { items: { product: true } },
    });
    // Se buscó el producto del carrito (cantidad 3), no el del body.
    expect(productRepository.findOne).toHaveBeenCalledWith({
      where: { uuid: 'uuid-carrito' },
    });
    expect(productRepository.findOne).not.toHaveBeenCalledWith({
      where: { uuid: 'uuid-no-es-del-carrito' },
    });
    expect(pricingService.price).toHaveBeenCalledWith({
      items: [{ product: cartProduct, quantity: 3 }],
      discountCode: undefined,
    });
  });

  it('rechaza con el mismo mensaje que createOrder cuando el carrito del usuario autenticado está vacío', async () => {
    cartRepository.findOne.mockResolvedValue({ items: [] });

    await expect(
      service.quoteOrder({ items: [{ productUuid: 'x', quantity: 1 }] }, 42),
    ).rejects.toThrow('Cart is empty');
  });
});
