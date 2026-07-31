import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrderPricingService } from './order-pricing.service';
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
import { IvaType } from '../products/enums/iva-type.enum';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * Regresión: un producto borrado (soft-delete) que sigue en el carrito de un
 * usuario logueado hacía que `resolveOrderItems` leyera `item.product.uuid`
 * sobre un `product` que TypeORM devuelve en `null` (el join lo excluye por
 * el `@DeleteDateColumn`). Eso era un `TypeError` sin capturar -> 500
 * genérico, tanto en `POST /orders/quote` como en `POST /orders`. El diseño
 * de `quote` es "nunca fallar duro"; el de `createOrder` es "nunca facturar
 * un producto inexistente". Este archivo cubre las dos rutas.
 */
describe('OrdersService — producto borrado en el carrito', () => {
  const productoVivo = (over: Partial<Product> = {}): Product =>
    ({
      id: 1,
      uuid: 'uuid-vivo',
      name: 'Cabilla 3/8',
      sku: 'CAB-001',
      priceWithIva: 11.6,
      priceWithIvaVes: 2847.8,
      ivaType: IvaType.NORMAL,
      inventory: 10,
      published: true,
      ...over,
    }) as unknown as Product;

  describe('quoteOrder', () => {
    let service: OrdersService;
    let cartRepository: { findOne: jest.Mock };
    let productRepository: { findOne: jest.Mock };
    let pricingService: { price: jest.Mock };

    beforeEach(async () => {
      cartRepository = { findOne: jest.fn() };
      productRepository = { findOne: jest.fn() };
      pricingService = { price: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
        { provide: UsersService, useValue: { create: jest.fn(), findByEmail: jest.fn() } },
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

    it('cotiza el resto del carrito y marca el ítem borrado como NOT_FOUND, sin 500', async () => {
      const vivo = productoVivo();
      cartRepository.findOne.mockResolvedValue({
        items: [
          { uuid: 'cart-item-vivo', product: vivo, quantity: 2 },
          // Producto borrado: TypeORM excluye la fila del join y deja
          // `product` en null. Antes del fix, esto tiraba un TypeError al
          // leer `item.product.uuid` dentro de `resolveOrderItems`.
          { uuid: 'cart-item-borrado', product: null, quantity: 1 },
        ],
      });
      productRepository.findOne.mockResolvedValue(vivo);
      pricingService.price.mockResolvedValue({
        lines: [
          {
            product: vivo,
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

      // No debe lanzar -- ésa es la regresión.
      const quote = await service.quoteOrder({}, 42);

      expect(quote.items).toHaveLength(2);
      expect(quote.canCheckout).toBe(false);

      const okItem = quote.items.find((i) => i.productUuid === 'uuid-vivo');
      expect(okItem).toMatchObject({ issue: null, quantity: 2, total: 23.2 });

      const missingItem = quote.items.find((i) => i.productUuid === null);
      expect(missingItem).toMatchObject({
        cartItemUuid: 'cart-item-borrado',
        quantity: 1,
        issue: { code: 'NOT_FOUND' },
        total: null,
      });

      // El resto del pedido se sigue cotizando: los totales son los del ítem
      // vivo únicamente, no ceros ni un error global.
      expect(quote.totals.total).toBe(23.2);

      // El producto borrado nunca llegó al calculador de precios.
      expect(pricingService.price).toHaveBeenCalledWith({
        items: [{ product: vivo, quantity: 2 }],
        discountCode: undefined,
      });
    });
  });

  describe('createOrder', () => {
    let service: OrdersService;
    let cartRepository: { findOne: jest.Mock };
    let orderRepo: { save: jest.Mock; findOne: jest.Mock };
    let productRepository: { findOne: jest.Mock };

    const dto = {
      deliveryMethod: DeliveryMethod.PICKUP,
      paymentMethod: PaymentMethod.PAGOMOVIL,
      paymentDetails: { senderName: 'Ana', referenceNumber: '123' },
    } as unknown as CreateOrderDto;

    beforeEach(async () => {
      cartRepository = { findOne: jest.fn() };
      orderRepo = { save: jest.fn(), findOne: jest.fn() };
      productRepository = { findOne: jest.fn() };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
        { provide: UsersService, useValue: { create: jest.fn(), findByEmail: jest.fn() } },
          { provide: OrderPricingService, useValue: { price: jest.fn() } },
          { provide: getRepositoryToken(Order), useValue: orderRepo },
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

    it('rechaza con 400 en vez de 500 cuando el carrito tiene un producto borrado', async () => {
      cartRepository.findOne.mockResolvedValue({
        items: [
          {
            uuid: 'cart-item-vivo',
            product: productoVivo(),
            quantity: 2,
          },
          { uuid: 'cart-item-borrado', product: null, quantity: 1 },
        ],
      });

      await expect(service.createOrder(dto, 42)).rejects.toThrow(
        BadRequestException,
      );

      // No se factura nada: el pedido nunca llega a validar inventario ni a
      // persistir la orden con un producto que ya no existe.
      expect(productRepository.findOne).not.toHaveBeenCalled();
      expect(orderRepo.save).not.toHaveBeenCalled();
    });
  });
});
