import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';

/**
 * Regresión: al cerrar la filtración del hash de contraseña se le quitó
 * `eager: true` a `Cart.user`, pero `getCart` nunca pidió la relación de
 * forma explícita. Resultado: `GET /cart` dejó de devolver `user`, y el
 * checkout se quedó sin los datos del comprador logueado.
 *
 * El test afirma sobre las `relations` que se le piden al repositorio, que es
 * exactamente lo que se rompió. Los secretos del usuario los cubre
 * `cart.serialization.spec.ts`: acá se carga la relación, allá se verifica
 * que la serialización no deje escapar la contraseña ni los tokens.
 */
describe('CartService.getCart', () => {
  let service: CartService;
  let cartRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const carritoExistente = (): Cart => {
    const cart = new Cart();
    cart.id = 1;
    cart.userId = 7;
    cart.items = [];
    return cart;
  };

  beforeEach(async () => {
    cartRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepository },
        {
          provide: getRepositoryToken(CartItem),
          useValue: { save: jest.fn(), remove: jest.fn(), create: jest.fn() },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('carga la relación `user` junto con los ítems', async () => {
    cartRepository.findOne.mockResolvedValue(carritoExistente());

    await service.getCart(7);

    const calls = cartRepository.findOne.mock.calls as Array<
      [{ where: { userId: number }; relations: string[] }]
    >;
    const options = calls[0][0];

    expect(options.where).toEqual({ userId: 7 });
    expect(options.relations).toContain('user');
    expect(options.relations).toContain('items');
    expect(options.relations).toContain('items.product');
    expect(options.relations).toContain('items.product.images');
  });

  it('devuelve el usuario que trajo el repositorio', async () => {
    const cart = carritoExistente();
    cart.user = {
      uuid: 'user-uuid-1',
      email: 'ana@example.com',
    } as Cart['user'];
    cartRepository.findOne.mockResolvedValue(cart);

    const result = await service.getCart(7);

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('ana@example.com');
  });

  it('relee el carrito recién creado para que también traiga al usuario', async () => {
    const nuevo = carritoExistente();
    nuevo.user = { uuid: 'user-uuid-1' } as Cart['user'];

    // Primera lectura: el usuario todavía no tiene carrito. Segunda lectura:
    // la que ocurre después del insert. Sin esa relectura se devolvía la
    // instancia cruda de `save()`, sin `user` ni `items`.
    cartRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(nuevo);
    cartRepository.create.mockReturnValue({ userId: 7 });
    cartRepository.save.mockResolvedValue({ id: 1, userId: 7 });

    const result = await service.getCart(7);

    expect(cartRepository.save).toHaveBeenCalled();
    expect(cartRepository.findOne).toHaveBeenCalledTimes(2);
    expect(result.user).toBeDefined();
  });
});
