import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthErrorCode } from '../auth/auth-error-code.enum';

/**
 * Regresión: la recuperación de contraseña no le servía a los administradores.
 *
 * La regla de "¿hace falta verificar el correo?" estaba escrita dos veces. El
 * login exceptuaba a los roles de la tienda —`admin`, `order_admin`— porque a
 * ésos los da de alta otro administrador y nunca reciben enlace de
 * verificación. `requestPasswordReset` no hacía esa excepción: comprobaba
 * `!user.emailVerified` a secas y se iba sin enviar nada.
 *
 * Medido en producción el 11-09-2026: las tres cuentas de administrador tenían
 * `email_verified = false`, así que podían entrar al panel y no podían
 * recuperar su contraseña jamás. El fallo era mudo dos veces —la función hacía
 * `return` sin registrar nada, y el endpoint responde éxito siempre para no
 * revelar qué correos existen—, así que desde fuera era idéntico a "el correo
 * se envió y no llegó". Fue así como se reportó.
 *
 * Estas pruebas atacan las dos mitades: que el administrador reciba su enlace,
 * y que el cliente sin verificar siga sin recibirlo. Una sola de las dos se
 * puede satisfacer borrando la condición entera, que sería volver a abrir la
 * puerta por el otro lado.
 */
describe('UsersService.requestPasswordReset', () => {
  let service: UsersService;
  const repo = { findOne: jest.fn(), save: jest.fn() };
  const emailService = { sendPasswordReset: jest.fn() };
  const configService = {
    get: jest.fn((clave: string) =>
      clave === 'app.frontendUrl' ? 'https://www.constru-ir.com' : 'Construir',
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((u) => Promise.resolve(u));
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = mod.get(UsersService);
  });

  /** Una cuenta como la que devuelve el repositorio, con los campos que miran las dos puertas. */
  const cuenta = (cambios: Partial<User>): User =>
    Object.assign(new User(), {
      id: 8,
      uuid: '146daeb0-dbba-4792-9159-7c92014e1521',
      email: 'quien@ejemplo.com',
      firstName: 'Carmen',
      role: UserRole.CUSTOMER,
      isActive: true,
      emailVerified: false,
      ...cambios,
    });

  it('le manda el enlace al administrador aunque no tenga el correo verificado', async () => {
    repo.findOne.mockResolvedValue(
      cuenta({ role: UserRole.ADMIN, emailVerified: false }),
    );

    await service.requestPasswordReset('quien@ejemplo.com');

    expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    // El enlace tiene que llevar un token de verdad: sin él, "se envió el
    // correo" no significa que nadie pueda recuperar nada.
    const enviado = emailService.sendPasswordReset.mock.calls[0][0];
    expect(enviado.resetUrl).toMatch(/\/reset-password\?token=[0-9a-f]{96}$/);
    expect(enviado.to).toBe('quien@ejemplo.com');
  });

  it('también al order_admin, que tampoco verifica nunca', async () => {
    repo.findOne.mockResolvedValue(
      cuenta({ role: UserRole.ORDER_ADMIN, emailVerified: false }),
    );

    await service.requestPasswordReset('quien@ejemplo.com');

    expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('guarda el token antes de mandar el correo, o el enlace no valdría', async () => {
    repo.findOne.mockResolvedValue(cuenta({ role: UserRole.ADMIN }));

    await service.requestPasswordReset('quien@ejemplo.com');

    // Se comprueba sobre lo GUARDADO, no sobre el objeto en memoria: si el
    // `save` no llegara a la base, el enlace del correo apuntaría a un token
    // que no existe y el fallo sería igual de mudo que el que originó todo.
    expect(repo.save).toHaveBeenCalledTimes(1);
    const guardado = repo.save.mock.calls[0][0];
    expect(guardado.passwordResetToken).toHaveLength(96);
    expect(guardado.passwordResetExpiresAt.getTime()).toBeGreaterThan(
      Date.now(),
    );

    const enviado = emailService.sendPasswordReset.mock.calls[0][0];
    expect(enviado.resetUrl).toContain(guardado.passwordResetToken);
  });

  it('NO le manda nada al cliente que no ha verificado su correo', async () => {
    repo.findOne.mockResolvedValue(
      cuenta({ role: UserRole.CUSTOMER, emailVerified: false }),
    );

    await service.requestPasswordReset('quien@ejemplo.com');

    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    // Y tampoco le escribe un token a la cuenta: dejarlo puesto sin mandar
    // nada sería un token vivo que nadie pidió.
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('sí al cliente que ya verificó', async () => {
    repo.findOne.mockResolvedValue(
      cuenta({ role: UserRole.CUSTOMER, emailVerified: true }),
    );

    await service.requestPasswordReset('quien@ejemplo.com');

    expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('no le manda nada a una cuenta desactivada, aunque sea administradora', async () => {
    repo.findOne.mockResolvedValue(
      cuenta({ role: UserRole.ADMIN, isActive: false }),
    );

    await service.requestPasswordReset('quien@ejemplo.com');

    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('no revienta cuando el correo no tiene cuenta', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset('nadie@ejemplo.com'),
    ).resolves.toBeUndefined();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });
});

/**
 * Las dos puertas leen la MISMA regla.
 *
 * Es la prueba que faltaba: cada puerta por separado estaba probada y las dos
 * pasaban: el error no vivía dentro de ninguna de las dos, sino en que una
 * dejó de parecerse a la otra. Acá se le hace a las dos la misma pregunta con
 * la misma cuenta y se exige que respondan lo mismo.
 */
describe('login y recuperación aplican la misma regla de verificación', () => {
  const casos: Array<{ role: UserRole; verificado: boolean; pasa: boolean }> = [
    { role: UserRole.ADMIN, verificado: false, pasa: true },
    { role: UserRole.ORDER_ADMIN, verificado: false, pasa: true },
    { role: UserRole.CUSTOMER, verificado: false, pasa: false },
    { role: UserRole.USER, verificado: false, pasa: false },
    { role: UserRole.CUSTOMER, verificado: true, pasa: true },
  ];

  it.each(casos)(
    'rol $role verificado=$verificado → las dos puertas dicen $pasa',
    async ({ role, verificado, pasa }) => {
      const usuario = Object.assign(new User(), {
        id: 3,
        uuid: 'e8a3d3d0-0000-4000-8000-000000000003',
        email: 'quien@ejemplo.com',
        firstName: 'Carmen',
        // Un hash cualquiera, y da igual que no case con la contraseña: esta
        // prueba no mira si el login tiene éxito, mira si RECHAZA POR FALTA DE
        // VERIFICACIÓN. Un rechazo por contraseña mala cuenta como "esta
        // puerta lo dejó pasar", que es lo que comprueba el `catch` de abajo.
        password: '$2b$10$unhashcualquieraquenovaacasarconnada000000000000000000',
        role,
        isActive: true,
        emailVerified: verificado,
      });

      // Puerta 1: la recuperación.
      const repo = {
        findOne: jest.fn().mockResolvedValue(usuario),
        save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
      const emailService = { sendPasswordReset: jest.fn() };
      const modUsuarios = await Test.createTestingModule({
        providers: [
          UsersService,
          { provide: getRepositoryToken(User), useValue: repo },
          { provide: EmailService, useValue: emailService },
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => 'https://www.constru-ir.com') },
          },
        ],
      }).compile();
      await modUsuarios
        .get(UsersService)
        .requestPasswordReset('quien@ejemplo.com');
      const recuperacionPasa =
        emailService.sendPasswordReset.mock.calls.length > 0;

      // Puerta 2: el login.
      const modAuth = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UsersService,
            useValue: { findByEmail: jest.fn().mockResolvedValue(usuario) },
          },
          { provide: JwtService, useValue: { sign: () => 'jwt' } },
        ],
      }).compile();

      let loginPasa = true;
      try {
        await modAuth
          .get(AuthService)
          .login({ email: 'quien@ejemplo.com', password: 'secret' });
      } catch (e) {
        // Sólo cuenta como "la puerta lo frenó" el rechazo POR FALTA DE
        // VERIFICACIÓN. Cualquier otro rechazo (contraseña mala, por ejemplo)
        // haría pasar esta prueba por el motivo equivocado.
        loginPasa =
          e.response?.code !== AuthErrorCode.EMAIL_NOT_VERIFIED &&
          e.getResponse?.()?.code !== AuthErrorCode.EMAIL_NOT_VERIFIED;
      }

      expect({ recuperacion: recuperacionPasa, login: loginPasa }).toEqual({
        recuperacion: pasa,
        login: pasa,
      });
    },
  );
});
