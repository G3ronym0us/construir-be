import { instanceToPlain } from 'class-transformer';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';
import { User, UserRole } from '../users/user.entity';

/**
 * Regresión de seguridad: `GET /cart` serializaba la entidad `Cart` cruda, y
 * `User.password` no tenía `@Exclude()` (sólo `id` lo tenía). Como
 * `Cart.user` era `eager: true`, cada lectura del carrito devolvía el hash
 * bcrypt del propio usuario -- y, potencialmente, sus tokens de un solo uso
 * de verificación de email / reseteo de contraseña -- en la respuesta HTTP.
 *
 * El test corre sobre `instanceToPlain`, la misma función que usa
 * `ClassSerializerInterceptor` (vía el alias `classToPlain`) para armar la
 * respuesta real -- no sobre un objeto plano armado a mano, que no ejercería
 * los decoradores `@Exclude()` en absoluto.
 */
describe('Cart — serialización de GET /cart', () => {
  const buildUser = (): User => {
    const user = new User();
    user.uuid = 'user-uuid-1';
    user.firstName = 'Ana';
    user.lastName = 'Pérez';
    user.email = 'ana@example.com';
    user.password = '$2b$10$hashDeContrasenaSecreto';
    user.role = UserRole.CUSTOMER;
    user.emailVerificationToken = 'token-verificacion-secreto';
    user.passwordResetToken = 'token-reset-secreto';
    return user;
  };

  const buildCart = (): Cart => {
    const product = new Product();
    product.uuid = 'product-uuid-1';
    product.name = 'Cabilla 3/8';

    const item = new CartItem();
    item.uuid = 'cart-item-uuid-1';
    item.quantity = 2;
    item.price = 11.6;
    item.product = product;

    const cart = new Cart();
    cart.uuid = 'cart-uuid-1';
    cart.userId = 1;
    cart.items = [item];
    // Se asigna aunque hoy `Cart.user` ya no sea `eager`: la entidad SIGUE
    // pudiendo traer el usuario si algún día alguien pide la relación
    // explícitamente, y en ese caso `@Exclude()` en `User` tiene que
    // sostener la garantía por sí solo -- es la segunda capa de defensa,
    // no la única.
    cart.user = buildUser();

    return cart;
  };

  it('no incluye el hash de contraseña ni los tokens del usuario', () => {
    const plain = instanceToPlain(buildCart());
    const serialized = JSON.stringify(plain);

    expect(serialized).not.toContain('hashDeContrasenaSecreto');
    expect(serialized).not.toContain('token-verificacion-secreto');
    expect(serialized).not.toContain('token-reset-secreto');

    expect(plain.user).toBeDefined();
    expect(plain.user.password).toBeUndefined();
    expect(plain.user.emailVerificationToken).toBeUndefined();
    expect(plain.user.passwordResetToken).toBeUndefined();

    // Confirma que el resto del usuario SÍ se sigue viendo -- el fix no es
    // "no serializar el usuario", es "no serializar sus secretos".
    expect(plain.user.email).toBe('ana@example.com');
    expect(plain.user.firstName).toBe('Ana');
  });

  it('sigue mostrando los datos no sensibles del carrito', () => {
    const plain = instanceToPlain(buildCart());

    expect(plain.uuid).toBe('cart-uuid-1');
    expect(plain.items).toHaveLength(1);
    expect(plain.items[0].quantity).toBe(2);
  });

  /**
   * Los totales del carrito son getters del prototipo, y `instanceToPlain`
   * sólo los incluye si llevan `@Expose()`. Sin eso, `GET /cart` respondía sin
   * `subtotal` ni `totalItems`, y el frontend —que hace `cart?.subtotal ?? 0`—
   * le mostraba **Bs. 0,00** a todo cliente con sesión iniciada.
   *
   * No se prueba sobre la entidad directamente, donde el getter siempre
   * funciona: se prueba sobre `instanceToPlain`, que es lo que arma la
   * respuesta HTTP de verdad.
   */
  it('expone los totales calculados del carrito', () => {
    const plain = instanceToPlain(buildCart());

    expect(plain.totalItems).toBe(2);
    // 2 unidades a 11,60 con IVA incluido
    expect(plain.subtotal).toBe(23.2);
    expect(plain.subtotalVes).toBeDefined();
  });

  it('expone el subtotal de cada renglón', () => {
    const plain = instanceToPlain(buildCart());

    expect(plain.items[0].subtotal).toBe(23.2);
    expect(plain.items[0].subtotalVes).toBeDefined();
  });
});
