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

  /**
   * El carrito tal como se le responde al cliente.
   *
   * `Product` tiene `@DeleteDateColumn`, asi que cuando un admin borra un
   * producto que estaba en el carrito de alguien, TypeORM lo excluye del join
   * y el renglon queda con `product` en `null`. Ese `null` viajaba en el JSON
   * y reventaba al frontend: la ficha de producto consulta el carrito para
   * saber cuanto lleva de cada articulo, leia `item.product.uuid` de un
   * renglon huerfano y se caia el render de TODO el catalogo. El sintoma para
   * el cliente era que, con la sesion iniciada, los botones de "Agregar"
   * desaparecian y no podia meter nada al carrito -- sin ningun error visible
   * y sin relacion aparente con el producto que si habia sido borrado.
   *
   * Un renglon sin producto ademas no se puede comprar ni quitar: el frontend
   * identifica los renglones por el uuid del producto, que ya no existe. Se
   * filtra de la respuesta, no se borra: si el admin restaura el producto
   * (`deleted_at` a null), el renglon vuelve a aparecer con su cantidad
   * intacta. Las mutaciones internas siguen viendo el carrito completo via
   * `loadCart()`, para que vaciarlo lo vacie de verdad y para no duplicar un
   * renglon al re-agregar un producto restaurado.
   */
  async getCart(userId: number): Promise<Cart> {
    const cart = await this.loadCart(userId);
    cart.items = (cart.items ?? []).filter((item) => item.product);
    return cart;
  }

  /** El carrito completo, huerfanos incluidos. Solo para uso interno. */
  private async loadCart(userId: number): Promise<Cart> {
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

    // Obtener o crear el carrito. `loadCart` y no `getCart`: hace falta ver
    // tambien los renglones huerfanos, porque si el producto que se esta
    // agregando es uno que fue borrado y despues restaurado, su renglon
    // existe y hay que sumarle la cantidad en vez de crear uno duplicado.
    const cart = await this.loadCart(userId);

    // Verificar si el producto ya está en el carrito.
    //
    // `item.product?.uuid` y no `item.product.uuid`: `Product` tiene
    // `@DeleteDateColumn`, así que si un admin borra (soft-delete) un producto
    // que estaba en el carrito de un cliente, TypeORM excluye esa fila del
    // join y `item.product` llega en `null`. Sin la guarda, ese renglón
    // huérfano rompía con un TypeError el `find` de CUALQUIER alta posterior:
    // el cliente quedaba sin poder agregar nada más a su carrito, con un 500
    // genérico y sin pista de que el culpable era un ítem que ya tenía.
    // Un renglón sin producto simplemente no puede ser el mismo producto que
    // se está agregando, así que no coincide y se crea el ítem nuevo.
    const existingItem = cart.items?.find(
      (item) => item.product?.uuid === productUuid,
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
      existingItem.price = product.priceWithIva;
      await this.cartItemRepository.save(existingItem);
    } else {
      // Crear nuevo item
      // El carrito guarda el precio con IVA incluido: es el que el cliente
      // vio en el catálogo y el que se le facturará. Guardar la base acá
      // hacía que el monto saltara entre carrito y checkout.
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        quantity,
        price: product.priceWithIva,
        product,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Recargar el carrito con items actualizados
    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    // `loadCart`: el carrito completo, para poder responderle al frontend con
    // el mensaje especifico de abajo si el renglon que quiere cambiar es uno
    // huerfano, en vez de un "no existe" a secas.
    const cart = await this.loadCart(userId);

    const cartItem = cart.items?.find((item) => item.uuid === itemId);

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    // Mismo caso que en `addItem`: el producto pudo borrarse después de
    // agregarse al carrito y entonces `cartItem.product` llega en `null`.
    // Se responde 404 identificando el renglón por su propio uuid — el del
    // producto ya no existe — para que el frontend pueda ofrecer quitarlo
    // (`DELETE /cart/items/:id` sigue funcionando: resuelve por el uuid del
    // ítem, sin tocar el producto).
    if (!cartItem.product) {
      throw new NotFoundException(
        `Cart item ${itemId} references a product that no longer exists. Remove it from the cart.`,
      );
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
    cartItem.price = product.priceWithIva; // Actualizar precio por si cambió
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: string): Promise<Cart> {
    // `loadCart`: quitar un renglon huerfano tiene que seguir funcionando
    // aunque `getCart` ya no se lo muestre al cliente.
    const cart = await this.loadCart(userId);

    const cartItem = cart.items?.find((item) => item.uuid === itemId);

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    await this.cartItemRepository.remove(cartItem);

    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    // `loadCart`: vaciar el carrito tiene que vaciarlo entero, huerfanos
    // incluidos, y no dejar filas invisibles atras.
    const cart = await this.loadCart(userId);

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
    const cart = await this.loadCart(userId);

    if (cart.items?.length > 0) {
      for (const item of cart.items) {
        // Un renglón cuyo producto fue borrado no tiene precio que
        // sincronizar; se salta en vez de reventar la sincronización entera
        // del carrito (ver la guarda equivalente en `addItem`).
        if (!item.product) {
          continue;
        }

        const product = await this.productRepository.findOne({
          where: { uuid: item.product.uuid },
        });

        if (product && item.price !== product.priceWithIva) {
          item.price = product.priceWithIva;
          await this.cartItemRepository.save(item);
        }
      }
    }

    return this.getCart(userId);
  }
}
