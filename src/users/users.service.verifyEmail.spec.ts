import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { EmailService } from '../email/email.service';
import { EmailVerificationErrorCode } from './email-verification-error-code.enum';

/**
 * La pantalla de verificación clasificaba el fallo buscando trozos del texto
 * del mensaje (`msg.includes('expirado')`), así que reescribir un mensaje acá
 * la rompía en silencio. Lo que se fija en estas pruebas es el `code`, que es
 * el contrato, y el caso que antes no existía: el enlace abierto dos veces.
 */
describe('UsersService.verifyEmail', () => {
  let service: UsersService;
  const repo = { findOne: jest.fn(), save: jest.fn() };
  const emailService = { sendWelcome: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((u: unknown) => Promise.resolve(u));
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    service = mod.get(UsersService);
  });

  const vigente = () => new Date(Date.now() + 60 * 60 * 1000);
  const vencido = () => new Date(Date.now() - 60 * 1000);

  const codigoDe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      const res = (err as BadRequestException).getResponse();
      return (res as { code?: string }).code;
    }
    return undefined;
  };

  it('activa la cuenta con un enlace vigente', async () => {
    const user = {
      email: 'jose@correo.com',
      firstName: 'José',
      emailVerified: false,
      emailVerificationToken: 'tok',
      emailVerificationExpiresAt: vigente(),
    };
    repo.findOne.mockResolvedValue(user);

    const res = await service.verifyEmail('tok');

    expect(res.alreadyVerified).toBe(false);
    expect(user.emailVerified).toBe(true);
    expect(emailService.sendWelcome).toHaveBeenCalled();
  });

  it('trata el enlace ya usado como éxito, no como error', async () => {
    // Abrir el correo dos veces —o que el antivirus del proveedor visite el
    // enlace antes que la persona— daba "Token de verificación inválido", el
    // mismo texto que un enlace inventado. El cliente creía que su cuenta no
    // había quedado activa cuando sí lo estaba.
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      emailVerified: true,
      emailVerificationToken: 'tok',
      emailVerificationExpiresAt: vigente(),
    });

    const res = await service.verifyEmail('tok');

    expect(res.alreadyVerified).toBe(true);
    expect(repo.save).not.toHaveBeenCalled();
    // No se reenvía la bienvenida en cada clic.
    expect(emailService.sendWelcome).not.toHaveBeenCalled();
  });

  it('conserva el token al verificar, que es lo que permite reconocer el segundo clic', async () => {
    const user = {
      email: 'jose@correo.com',
      firstName: 'José',
      emailVerified: false,
      emailVerificationToken: 'tok',
      emailVerificationExpiresAt: vigente(),
    };
    repo.findOne.mockResolvedValue(user);

    await service.verifyEmail('tok');

    expect(user.emailVerificationToken).toBe('tok');
  });

  it('distingue el enlace vencido del inexistente', async () => {
    repo.findOne.mockResolvedValue({
      emailVerified: false,
      emailVerificationToken: 'tok',
      emailVerificationExpiresAt: vencido(),
    });
    expect(await codigoDe(() => service.verifyEmail('tok'))).toBe(
      EmailVerificationErrorCode.TOKEN_EXPIRED,
    );

    repo.findOne.mockResolvedValue(null);
    expect(await codigoDe(() => service.verifyEmail('inventado'))).toBe(
      EmailVerificationErrorCode.TOKEN_INVALID,
    );
  });

  it('no consulta la tabla cuando la URL viene sin token', async () => {
    // `findOne` con `undefined` en el `where` devuelve la primera fila de la
    // tabla: verificaría la cuenta de otro.
    expect(await codigoDe(() => service.verifyEmail(''))).toBe(
      EmailVerificationErrorCode.TOKEN_INVALID,
    );
    expect(repo.findOne).not.toHaveBeenCalled();
  });
});

describe('UsersService.resendVerification', () => {
  let service: UsersService;
  const repo = { findOne: jest.fn(), save: jest.fn() };
  const emailService = {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((u: unknown) => Promise.resolve(u));
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    service = mod.get(UsersService);
  });

  it('no delata que un correo ya está verificado', async () => {
    // Antes lanzaba "Este correo ya fue verificado", que le confirma a
    // cualquiera —sin sesión— que esa dirección tiene cuenta en la tienda. El
    // controlador ya prometía una respuesta que no distingue los casos.
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      emailVerified: true,
    });

    await expect(
      service.resendVerification('jose@correo.com'),
    ).resolves.toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('se comporta igual con un correo que no existe', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.resendVerification('nadie@correo.com'),
    ).resolves.toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('renueva el token de quien sí está pendiente', async () => {
    const user = {
      email: 'jose@correo.com',
      emailVerified: false,
      emailVerificationToken: 'viejo',
      emailVerificationExpiresAt: new Date(0),
    };
    repo.findOne.mockResolvedValue(user);

    await service.resendVerification('jose@correo.com');

    expect(repo.save).toHaveBeenCalled();
    expect(user.emailVerificationToken).not.toBe('viejo');
    expect(user.emailVerificationExpiresAt.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });
});
