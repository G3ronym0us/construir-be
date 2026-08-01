import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { EmailService } from '../email/email.service';

describe('UsersService.getResetTokenInfo', () => {
  let service: UsersService;
  const repo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();
    service = mod.get(UsersService);
  });

  // Fecha relativa a "ahora" en vez de un ISO fijo: un timestamp absoluto en
  // el pasado (p. ej. una fecha de 2026 ya transcurrida en el reloj real)
  // haría que estas dos pruebas de "token vigente" fallen apenas pasara esa
  // fecha, sin que la lógica bajo prueba tenga nada que ver.
  const vigente = new Date(Date.now() + 60 * 60 * 1000);

  it('enmascara el correo del dueño del token', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: vigente,
    });

    const info = await service.getResetTokenInfo('tok-valido');

    expect(info.email).toBe('jo•••@correo.com');
    // El correo completo no puede viajar: el endpoint es público y un token
    // filtrado se volvería un oráculo de direcciones.
    expect(info.email).not.toContain('se@');
  });

  it('devuelve la expiración en ISO', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: vigente,
    });

    const info = await service.getResetTokenInfo('tok-valido');

    expect(info.expiresAt).toBe(vigente.toISOString());
  });

  it('rechaza un token que no existe', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getResetTokenInfo('inventado')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza un token vencido con el mismo error que uno inexistente', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });
    // Mismo 404 a propósito: distinguir "venció" de "no existe" sólo le sirve
    // a quien esté probando tokens.
    await expect(service.getResetTokenInfo('vencido')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('enmascara correos de parte local corta sin revelarla entera', async () => {
    repo.findOne.mockResolvedValue({
      email: 'ab@correo.com',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    const info = await service.getResetTokenInfo('tok');

    expect(info.email).toBe('a•••@correo.com');
  });
});
