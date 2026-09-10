// `uuid` se publica sólo como ESM y jest lo carga como CommonJS; llega acá
// arrastrado por `invitations.service`, no porque esta prueba lo use. Mismo
// apaño que en `categories.service.listing.spec.ts`.
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));

import { instanceToPlain } from 'class-transformer';
import { UsersController } from './users.controller';
import { User, UserRole } from './user.entity';

/**
 * Regresión: los `@Exclude()` de `User` no llegaban a aplicarse.
 *
 * Cada ruta de este controlador devolvía `const { password, ...result } =
 * user`. Ese desarmado quita la clase: lo que sale es un `Object` pelado, y
 * `ClassSerializerInterceptor` —que es quien arma de verdad la respuesta HTTP,
 * con `instanceToPlain`— sólo recorta lo que los metadatos de la CLASE le
 * dicen. Sin clase no recorta nada.
 *
 * Medido contra el servidor antes del arreglo, `GET /users/profile` y
 * `GET /users/admin/users` respondían con `id`, `emailVerificationToken`,
 * `passwordResetToken` y `passwordResetExpiresAt` dentro de cada usuario, los
 * tres primeros marcados con `@Exclude()`. Se salvaba `password` sólo porque
 * era el campo que el propio desarmado nombraba a mano — y esa lista escrita a
 * mano, repetida en once rutas, era justamente lo frágil.
 *
 * Lo que estas pruebas sujetan, y por qué así:
 *
 *  - Se comprueba sobre `instanceToPlain(...)`, NO sobre lo que devuelve el
 *    método. Sobre el valor devuelto la prueba pasaría igual con el spread
 *    puesto —el objeto tiene los mismos campos— y no vigilaría nada. Lo que
 *    cambia con el fallo es el recorte, y el recorte lo hace `instanceToPlain`.
 *
 *  - El usuario que devuelve el servicio falso es una instancia REAL de `User`
 *    con los secretos POBLADOS. Si se armara con un literal `{ ... }`, la
 *    prueba pasaría por el motivo equivocado (un literal nunca tiene clase, así
 *    que nunca se recorta y el `expect` de "no está" sería trivial). Y si los
 *    tokens fueran `null`, `instanceToPlain` los omitiría por vacíos y la
 *    prueba volvería a pasar con el agujero abierto: hay un caso al final que
 *    sabotea exactamente eso.
 */
describe('serialización del controlador de usuarios', () => {
  const SECRETOS = [
    'password',
    'emailVerificationToken',
    'passwordResetToken',
  ] as const;

  /**
   * Un `User` como el que devuelve el repositorio: instancia de la clase y con
   * todas las columnas cargadas, secretos incluidos. TypeORM hidrata así —está
   * comprobado contra el servidor: en `GET /orders` la relación `order.user`
   * llega recortada, que es justo lo que prueba que el repositorio devuelve
   * instancias de verdad.
   */
  const usuarioCargado = (): User => {
    const usuario = new User();
    usuario.id = 8;
    usuario.uuid = '146daeb0-dbba-4792-9159-7c92014e1521';
    usuario.firstName = 'Carmen';
    usuario.lastName = 'Pineda';
    usuario.email = 'carmen@ejemplo.com';
    usuario.password = '$2b$10$hashbcryptdelusuario';
    usuario.role = UserRole.CUSTOMER;
    usuario.isActive = true;
    usuario.emailVerified = false;
    usuario.emailVerificationToken = 'token-de-verificacion-en-curso';
    usuario.emailVerificationExpiresAt = new Date('2026-09-11T00:00:00Z');
    usuario.passwordResetToken = 'token-de-recuperacion-en-curso';
    usuario.passwordResetExpiresAt = new Date('2026-09-11T00:00:00Z');
    usuario.createdAt = new Date('2026-07-31T15:52:44Z');
    usuario.updatedAt = new Date('2026-07-31T17:37:21Z');
    return usuario;
  };

  const controlador = (): UsersController => {
    const usuario = usuarioCargado();
    const usersService = {
      create: jest.fn().mockResolvedValue(usuario),
      findByUuid: jest.fn().mockResolvedValue(usuario),
      update: jest.fn().mockResolvedValue(usuario),
      updateByAdmin: jest.fn().mockResolvedValue(usuario),
      updateRole: jest.fn().mockResolvedValue(usuario),
      createByAdmin: jest.fn().mockResolvedValue(usuario),
      findAllPaginated: jest
        .fn()
        .mockResolvedValue({ data: [usuario], total: 1, page: 1, lastPage: 1 }),
    };
    const invitationsService = {
      completeRegistration: jest.fn().mockResolvedValue(usuario),
    };
    return new UsersController(
      usersService as never,
      invitationsService as never,
    );
  };

  /** Recorre la respuesta entera: los secretos pueden venir anidados. */
  const clavesDe = (valor: unknown, prefijo = ''): string[] => {
    if (!valor || typeof valor !== 'object') return [];
    if (Array.isArray(valor)) {
      return valor.flatMap((elemento, i) =>
        clavesDe(elemento, `${prefijo}[${i}]`),
      );
    }
    return Object.keys(valor as Record<string, unknown>).flatMap((clave) => [
      `${prefijo}.${clave}`,
      ...clavesDe(
        (valor as Record<string, unknown>)[clave],
        `${prefijo}.${clave}`,
      ),
    ]);
  };

  const secretosEnLaRespuesta = (respuesta: unknown): string[] =>
    clavesDe(instanceToPlain(respuesta)).filter((ruta) =>
      SECRETOS.some((secreto) => ruta.endsWith(`.${secreto}`)),
    );

  const peticion = { user: { uuid: '146daeb0-dbba-4792-9159-7c92014e1521' } };

  const rutas: [string, (c: UsersController) => Promise<unknown>][] = [
    ['POST /users/register', (c) => c.register({} as never)],
    ['GET /users/profile', (c) => c.getProfile(peticion)],
    ['PATCH /users/profile', (c) => c.updateProfile(peticion, {} as never)],
    ['GET /users/admin/users', (c) => c.findAll({} as never)],
    ['GET /users/admin/users/:uuid', (c) => c.findOne('146daeb0')],
    ['POST /users/admin/users', (c) => c.createByAdmin({} as never)],
    [
      'PATCH /users/admin/users/:uuid',
      (c) => c.updateByAdmin('146daeb0', {} as never),
    ],
    [
      'PATCH /users/admin/users/:uuid/role',
      (c) => c.updateRole('146daeb0', {} as never),
    ],
    [
      'POST /users/register/invitation',
      (c) => c.completeInvitation({} as never),
    ],
    [
      'GET /users/order-admin/users',
      (c) => c.findAllForOrderAdmin({} as never),
    ],
    [
      'GET /users/order-admin/users/:uuid',
      (c) => c.findOneForOrderAdmin('146daeb0'),
    ],
  ];

  it.each(rutas)(
    '%s no entrega ningún secreto del usuario',
    async (_, llamar) => {
      const respuesta = await llamar(controlador());

      expect(secretosEnLaRespuesta(respuesta)).toEqual([]);
    },
  );

  it('tampoco entrega el id interno, que también lleva @Exclude()', async () => {
    const perfil = instanceToPlain(await controlador().getProfile(peticion));

    // El `id` es la prueba menos ambigua de que el recorte corre: nunca es
    // nulo, así que si aparece es porque los decoradores no se aplicaron.
    expect(perfil).not.toHaveProperty('id');
    expect(perfil).toHaveProperty('uuid');
  });

  it('sigue entregando lo que el panel y la tienda sí consumen', async () => {
    const perfil = instanceToPlain(await controlador().getProfile(peticion));

    // Los campos que declara `User` en `construir-fe/src/types/index.ts`. Si
    // el arreglo se pasara de recorte, la pantalla se rompería en silencio.
    for (const campo of [
      'uuid',
      'firstName',
      'lastName',
      'email',
      'role',
      'isActive',
      'createdAt',
      'updatedAt',
    ]) {
      expect(perfil).toHaveProperty(campo);
    }
  });

  it('la comprobación falla si el secreto viaja (sabotaje)', () => {
    // Sin este caso, todo lo de arriba pasaría también con los tokens en
    // `null` —`instanceToPlain` los omite por vacíos— o si `secretosEnLaRespuesta`
    // dejara de mirar donde debe. Acá se le da a propósito lo que devolvía el
    // controlador ANTES del arreglo: el usuario desarmado, sin clase.
    const { password: _sinContrasena, ...desarmado } = usuarioCargado();
    void _sinContrasena;

    expect(secretosEnLaRespuesta(desarmado)).toEqual([
      '.emailVerificationToken',
      '.passwordResetToken',
    ]);
  });
});
