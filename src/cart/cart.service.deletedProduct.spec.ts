import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { IvaType } from '../products/enums/iva-type.enum';

/**
 * Regresión: `Product` tiene `@DeleteDateColumn`, así que un producto borrado
 * (soft-delete) que sigue en el carrito de un usuario logueado hace que
 * TypeORM lo excluya del join y devuelva `item.product` en `null`.
 *
 * `CartService` leía `item.product.uuid` sin guarda en `addItem`, `updateItem`
 * y `syncCartPrices`. El caso grave era `addItem`: el `find` que busca si el
 * producto YA está en el carrito recorre TODOS los renglones, así que un solo
 * ítem huérfano dejaba al cliente sin poder agregar NADA más a su carrito
 * -- 500 genérico en cada intento, aunque el producto que estaba agregando no
 * tuviera nada que ver con el borrado.
 *
 * El fix hermano del lado de órdenes está en
 * `orders.service.deletedCartProduct.spec.ts`.
 */
describe('CartService — producto borrado en el carrito', () => {
  let service: CartService;
  let cartRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let cartItemRepository: { create: jest.Mock; save: jest.Mock };
  let productRepository: { findOne: jest.Mock };

  const productoVivo = (over: Partial<Product> = {}): Product =>
    ({
      id: 1,
      uuid: 'uuid-vivo',
      name: 'Cabilla 3/8',
      sku: 'CAB-001',
      price: 10,
      priceWithIva: 11.6,
      priceWithIvaVes: 2847.8,
      ivaType: IvaType.NORMAL,
      inventory: 10,
      published: true,
      ...over,
    }) as unknown as Product;

  /** Renglón cuyo producto fue borrado: TypeORM lo entrega con `product: null`. */
  const renglonHuerfano = (): CartItem =>
    ({
      id: 99,
      uuid: 'cart-item-huerfano',
      cartId: 7,
      quantity: 3,
      price: 9,
      product: null,
    }) as unknown as CartItem;

  const carritoCon = (items: CartItem[]): Cart =>
    ({ id: 7, uuid: 'cart-uuid', userId: 42, items }) as unknown as Cart;

  /** `create`/`save` devuelven el mismo renglón que reciben. */
  const devuelveLoQueRecibe = (data: Partial<CartItem>): CartItem =>
    data as CartItem;
  const guardaLoQueRecibe = (data: Partial<CartItem>): Promise<CartItem> =>
    Promise.resolve(data as CartItem);

  beforeEach(async () => {
    cartRepository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    cartItemRepository = { create: jest.fn(), save: jest.fn() };
    productRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepository },
        { provide: getRepositoryToken(CartItem), useValue: cartItemRepository },
        { provide: getRepositoryToken(Product), useValue: productRepository },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('addItem', () => {
    it('agrega un producto nuevo aunque el carrito tenga un renglón huérfano', async () => {
      const nuevo = productoVivo({ uuid: 'uuid-nuevo' });
      productRepository.findOne.mockResolvedValue(nuevo);
      cartRepository.findOne.mockResolvedValue(carritoCon([renglonHuerfano()]));
      cartItemRepository.create.mockImplementation(devuelveLoQueRecibe);
      cartItemRepository.save.mockImplementation(guardaLoQueRecibe);

      await expect(
        service.addItem(42, { productUuid: 'uuid-nuevo', quantity: 2 }),
      ).resolves.toBeDefined();

      // Se crea un renglón nuevo: el huérfano no puede "ser" el producto que
      // se está agregando, así que no lo deduplica contra él.
      expect(cartItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 7,
          quantity: 2,
          price: nuevo.priceWithIva,
        }),
      );
    });

    it('sigue deduplicando contra los renglones que SÍ tienen producto', async () => {
      const vivo = productoVivo({ uuid: 'uuid-vivo', inventory: 10 });
      const renglonVivo = {
        uuid: 'cart-item-vivo',
        quantity: 1,
        price: 11.6,
        product: vivo,
      } as unknown as CartItem;

      productRepository.findOne.mockResolvedValue(vivo);
      cartRepository.findOne.mockResolvedValue(
        carritoCon([renglonHuerfano(), renglonVivo]),
      );
      cartItemRepository.save.mockImplementation(guardaLoQueRecibe);

      await service.addItem(42, { productUuid: 'uuid-vivo', quantity: 2 });

      // Suma sobre el renglón existente en vez de crear uno duplicado: la
      // guarda del huérfano no puede haber roto el camino normal.
      expect(cartItemRepository.create).not.toHaveBeenCalled();
      expect(renglonVivo.quantity).toBe(3);
    });
  });

  describe('updateItem', () => {
    it('responde 404 identificando el renglón, en vez de reventar con 500', async () => {
      cartRepository.findOne.mockResolvedValue(carritoCon([renglonHuerfano()]));

      await expect(
        service.updateItem(42, 'cart-item-huerfano', { quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // El uuid del renglón es lo único que el frontend puede usar para
      // ofrecer quitarlo: el producto borrado ya no tiene uuid que mostrar.
      await expect(
        service.updateItem(42, 'cart-item-huerfano', { quantity: 1 }),
      ).rejects.toThrow(/cart-item-huerfano/);
    });
  });

  describe('syncCartPrices', () => {
    it('salta el renglón huérfano y sincroniza el resto', async () => {
      const vivo = productoVivo({ uuid: 'uuid-vivo', priceWithIva: 15 });
      const renglonVivo = {
        uuid: 'cart-item-vivo',
        quantity: 1,
        price: 11.6,
        product: { uuid: 'uuid-vivo' },
      } as unknown as CartItem;

      cartRepository.findOne.mockResolvedValue(
        carritoCon([renglonHuerfano(), renglonVivo]),
      );
      productRepository.findOne.mockResolvedValue(vivo);
      cartItemRepository.save.mockImplementation(guardaLoQueRecibe);

      await expect(service.syncCartPrices(42)).resolves.toBeDefined();

      expect(renglonVivo.price).toBe(15);
      // No se consulta ningún producto por el renglón huérfano.
      expect(productRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Regresión hermana: `productUuid` estaba validado con `@IsString()`, así que
 * un id numérico o un SKU pasaba la validación y llegaba a
 * `findOne({ where: { uuid } })`. `products.uuid` es de tipo `uuid` en
 * Postgres: la query no devuelve vacío, revienta con
 * `invalid input syntax for type uuid` -> 500 genérico en vez de un 400 que
 * el frontend pueda mostrar.
 */
describe('AddToCartDto — productUuid', () => {
  const validar = (payload: Record<string, unknown>) =>
    validate(plainToInstance(AddToCartDto, payload));

  it('rechaza un id numérico o un SKU', async () => {
    expect(await validar({ productUuid: '596', quantity: 1 })).toHaveLength(1);
    expect(await validar({ productUuid: '21415', quantity: 1 })).toHaveLength(
      1,
    );
  });

  it('acepta un uuid válido', async () => {
    const errores = await validar({
      productUuid: '7d0f55d5-cc39-4c23-a0e6-f47a939217a0',
      quantity: 1,
    });
    expect(errores).toHaveLength(0);
  });
});
