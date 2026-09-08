import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthErrorCode } from './auth-error-code.enum';

/**
 * El frontend le muestra al cliente por qué no pudo entrar, en el idioma que
 * eligió. Antes pintaba tal cual el `message` de esta API, así que le salía
 * "Invalid credentials" o "Account is deactivated": en inglés y con redacción
 * de log, aunque tuviera la tienda en español.
 *
 * Ahora traduce por `code`. Estas pruebas fijan ese contrato: si alguien
 * reescribe un mensaje, el `code` tiene que seguir siendo el mismo, porque es
 * lo único que el frontend sabe interpretar.
 */
describe('AuthService.login — código del motivo de rechazo', () => {
  let service: AuthService;
  const usersService = { findByEmail: jest.fn() };

  const cuenta = (over: Record<string, unknown> = {}) => ({
    id: 1,
    uuid: 'user-uuid',
    email: 'cliente@correo.com',
    password: 'hash',
    firstName: 'Ana',
    lastName: 'Pérez',
    role: 'customer',
    isActive: true,
    emailVerified: true,
    deletedAt: null,
    ...over,
  });

  const credenciales = { email: 'cliente@correo.com', password: 'secreta' };

  /** El `code` del cuerpo del 401. */
  const codigoDe = async (): Promise<string> => {
    try {
      await service.login(credenciales);
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      return (e as UnauthorizedException).getResponse()['code'];
    }
    throw new Error('se esperaba un rechazo');
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();
    service = mod.get(AuthService);
  });

  it('correo inexistente → INVALID_CREDENTIALS', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(codigoDe()).resolves.toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('contraseña equivocada → INVALID_CREDENTIALS', async () => {
    usersService.findByEmail.mockResolvedValue(cuenta());
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
    await expect(codigoDe()).resolves.toBe(AuthErrorCode.INVALID_CREDENTIALS);
  });

  it('cuenta desactivada → ACCOUNT_DEACTIVATED', async () => {
    usersService.findByEmail.mockResolvedValue(cuenta({ isActive: false }));
    await expect(codigoDe()).resolves.toBe(AuthErrorCode.ACCOUNT_DEACTIVATED);
  });

  it('correo sin confirmar → EMAIL_NOT_VERIFIED', async () => {
    usersService.findByEmail.mockResolvedValue(cuenta({ emailVerified: false }));
    await expect(codigoDe()).resolves.toBe(AuthErrorCode.EMAIL_NOT_VERIFIED);
  });

  it('cuenta eliminada → ACCOUNT_NOT_FOUND', async () => {
    usersService.findByEmail.mockResolvedValue(cuenta({ deletedAt: new Date() }));
    await expect(codigoDe()).resolves.toBe(AuthErrorCode.ACCOUNT_NOT_FOUND);
  });

  it('conserva el `message` de siempre, para clientes anteriores al `code`', async () => {
    usersService.findByEmail.mockResolvedValue(cuenta({ isActive: false }));

    await expect(service.login(credenciales)).rejects.toThrow(
      'Account is deactivated',
    );
  });
});
