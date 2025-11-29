import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.images'],
    });

    if (!cart) {
      cart = await this.createCart(userId);
    }

    return cart;
  }

  async addItem(userId: number, addToCartDto: AddToCartDto): Promise<Cart> {
    const { productUuid, quantity } = addToCartDto;

    // Verificar que el producto existe y está disponible
    const product = await this.productRepository.findOne({
      where: { uuid: productUuid },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productUuid} not found`);
    }

    if (!product.published) {
      throw new BadRequestException('Product is not available for purchase');
    }

    if (product.inventory < quantity) {
      throw new BadRequestException(
        `Insufficient inventory. Available: ${product.inventory}`,
      );
    }

    // Obtener o crear el carrito
    const cart = await this.getCart(userId);

    // Verificar si el producto ya está en el carrito
    const existingItem = cart.items?.find(
      (item) => item.product.uuid === productUuid,
    );

    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + quantity;

      if (product.inventory < newQuantity) {
        throw new BadRequestException(
          `Cannot add ${quantity} more items. Available: ${product.inventory - existingItem.quantity}`,
        );
      }

      existingItem.quantity = newQuantity;
      existingItem.price = product.price;
      await this.cartItemRepository.save(existingItem);
    } else {
      // Crear nuevo item
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        quantity,
        price: product.price,
        product,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Recargar el carrito con items actualizados
    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    itemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getCart(userId);

    const cartItem = cart.items?.find((item) => item.id === itemId);

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    // Verificar inventario
    const product = await this.productRepository.findOne({
      where: { uuid: cartItem.product.uuid },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${cartItem.product.uuid} not found`,
      );
    }

    if (product.inventory < updateCartItemDto.quantity) {
      throw new BadRequestException(
        `Insufficient inventory. Available: ${product.inventory}`,
      );
    }

    cartItem.quantity = updateCartItemDto.quantity;
    cartItem.price = product.price; // Actualizar precio por si cambió
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const cart = await this.getCart(userId);

    const cartItem = cart.items?.find((item) => item.id === itemId);

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    await this.cartItemRepository.remove(cartItem);

    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getCart(userId);

    if (cart.items?.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    return this.getCart(userId);
  }

  private async createCart(userId: number): Promise<Cart> {
    const cart = this.cartRepository.create({ userId });
    return this.cartRepository.save(cart);
  }

  async syncCartPrices(userId: number): Promise<Cart> {
    const cart = await this.getCart(userId);

    if (cart.items?.length > 0) {
      for (const item of cart.items) {
        const product = await this.productRepository.findOne({
          where: { uuid: item.product.uuid },
        });

        if (product && item.price !== product.price) {
          item.price = product.price;
          await this.cartItemRepository.save(item);
        }
      }
    }

    return this.getCart(userId);
  }
}
