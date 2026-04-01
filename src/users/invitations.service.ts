import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserInvitation } from './user-invitation.entity';
import { User, UserRole } from './user.entity';
import { EmailService } from '../email/email.service';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import { GetInvitationsDto } from './dto/get-invitations.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(UserInvitation)
    private invitationsRepository: Repository<UserInvitation>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async createInvitation(
    dto: SendInvitationDto,
    adminUserId: number,
  ): Promise<UserInvitation> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario registrado con este correo',
      );
    }

    const now = new Date();
    const existingInvitation = await this.invitationsRepository.findOne({
      where: {
        email: dto.email,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });
    if (existingInvitation) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para este correo. Revócala antes de enviar una nueva.',
      );
    }

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const invitation = this.invitationsRepository.create({
      uuid: uuidv4(),
      email: dto.email,
      role: dto.role ?? UserRole.USER,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      token,
      expiresAt,
      invitedByUserId: adminUserId,
    });

    await this.invitationsRepository.save(invitation);

    this.sendInvitationEmail(invitation).catch((err) =>
      console.error('Error sending invitation email:', err),
    );

    return invitation;
  }

  private async sendInvitationEmail(
    invitation: UserInvitation,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const storeName =
      this.configService.get<string>('app.storeName') || 'Construir';
    const inviteUrl = `${frontendUrl}/register/invitation?token=${invitation.token}`;

    const expiresAtFormatted = invitation.expiresAt.toLocaleDateString(
      'es-ES',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );

    await this.emailService.sendInvitationEmail({
      to: invitation.email,
      inviteUrl,
      firstName: invitation.firstName ?? undefined,
      role: invitation.role,
      expiresAtFormatted,
      storeName,
    });
  }

  async validateToken(token: string): Promise<UserInvitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.usedAt !== null) {
      throw new HttpException(
        'Esta invitación ya fue utilizada',
        HttpStatus.GONE,
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new HttpException('Esta invitación ha expirado', HttpStatus.GONE);
    }

    return invitation;
  }

  async completeRegistration(dto: CompleteInvitationDto): Promise<User> {
    const invitation = await this.validateToken(dto.token);

    return await this.invitationsRepository.manager.transaction(
      async (em) => {
        const existingUser = await em.findOne(User, {
          where: { email: invitation.email },
        });
        if (existingUser) {
          throw new ConflictException('Este correo ya está registrado');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = em.create(User, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role,
          isActive: true,
        });

        await em.save(User, user);

        invitation.usedAt = new Date();
        await em.save(UserInvitation, invitation);

        return user;
      },
    );
  }

  async listInvitations(dto: GetInvitationsDto): Promise<{
    data: UserInvitation[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const status = dto.status ?? 'all';
    const now = new Date();

    const qb = this.invitationsRepository.createQueryBuilder('inv');

    if (status === 'pending') {
      qb.andWhere('inv.usedAt IS NULL').andWhere('inv.expiresAt > :now', {
        now,
      });
    } else if (status === 'used') {
      qb.andWhere('inv.usedAt IS NOT NULL');
    } else if (status === 'expired') {
      qb.andWhere('inv.usedAt IS NULL').andWhere('inv.expiresAt <= :now', {
        now,
      });
    }

    if (dto.email) {
      qb.andWhere('inv.email ILIKE :email', { email: `%${dto.email}%` });
    }

    qb.orderBy('inv.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async revokeInvitation(uuid: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({
      where: { uuid },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.usedAt !== null) {
      throw new BadRequestException(
        'No se puede revocar una invitación que ya fue utilizada',
      );
    }

    await this.invitationsRepository.delete({ uuid });
  }
}
