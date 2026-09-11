import {
  BadRequestException,
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';
import { leFaltaVerificarElCorreo } from './verificacion-de-correo';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUsersDto } from './dto/get-users.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { RegisterErrorCode } from './register-error-code.enum';
import { EmailVerificationErrorCode } from './email-verification-error-code.enum';
import { PasswordResetErrorCode } from './password-reset-error-code.enum';

/** `jose@correo.com` → `jo•••@correo.com`. Deja como mucho dos caracteres. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '•••';
  const visible = Math.min(2, at - 1) || 1;
  return `${email.slice(0, visible)}•••${email.slice(at)}`;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // El `code` es lo que el frontend traduce: pintar el `message` tal cual
      // le mostraba "Email already exists" a un cliente que tiene la tienda en
      // español. El `message` se conserva igual para no romper a nadie que lo
      // estuviera leyendo.
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email already exists',
        code: RegisterErrorCode.EMAIL_ALREADY_REGISTERED,
      });
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = this.usersRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: hashedPassword,
      phone: createUserDto.phone ?? null,
      identificationType: createUserDto.identificationType ?? null,
      identificationNumber: createUserDto.identificationNumber ?? null,
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    });

    await this.usersRepository.save(user);

    this.sendVerificationEmail(user).catch((err) =>
      console.error('Error sending verification email:', err),
    );

    return user;
  }

  /**
   * Activa la cuenta a partir del enlace del correo.
   *
   * Devuelve `alreadyVerified` en vez de fallar cuando el enlace ya se usó:
   * abrir dos veces el correo, o que el antivirus del proveedor visite el
   * enlace antes que la persona, no es un error del cliente y no merece una
   * pantalla roja. Antes daba "Token de verificación inválido" — el mismo texto
   * que recibía quien llegaba con un enlace inventado—, así que el cliente
   * creía que su cuenta no había quedado activa cuando sí lo estaba.
   *
   * Para poder distinguir "ya se usó" de "nunca existió", el token se conserva
   * al verificar en vez de borrarse. No concede nada: en cuanto `emailVerified`
   * es true este método sale por arriba sin volver a tocar la cuenta.
   */
  async verifyEmail(token: string): Promise<{ alreadyVerified: boolean }> {
    // Sin token no se consulta: `findOne` con `undefined` en el `where` trae la
    // primera fila de la tabla y verificaría una cuenta ajena.
    const user = token
      ? await this.usersRepository.findOne({
          where: { emailVerificationToken: token },
        })
      : null;

    if (!user) {
      throw this.rechazoVerificacion(
        EmailVerificationErrorCode.TOKEN_INVALID,
        'Token de verificación inválido',
      );
    }

    if (user.emailVerified) {
      return { alreadyVerified: true };
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw this.rechazoVerificacion(
        EmailVerificationErrorCode.TOKEN_EXPIRED,
        'El token de verificación ha expirado. Solicita uno nuevo.',
      );
    }

    user.emailVerified = true;
    user.emailVerificationExpiresAt = null;
    await this.usersRepository.save(user);

    // La cuenta recién queda utilizable acá: hasta verificar, el login la
    // rechaza. Se envía sin await ni propagar, igual que la verificación.
    this.emailService
      .sendWelcome({ to: user.email, firstName: user.firstName })
      .catch((err) => console.error('Error sending welcome email:', err));

    return { alreadyVerified: false };
  }

  /** 400 con `code` además del `message`, igual que `AuthService.rechazo`. */
  private rechazoVerificacion(
    code: EmailVerificationErrorCode,
    message: string,
  ) {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message,
      code,
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = email
      ? await this.usersRepository.findOne({ where: { email } })
      : null;

    // Se sale en silencio tanto si el correo no existe como si ya está
    // verificado. Antes el segundo caso lanzaba "Este correo ya fue
    // verificado", que le confirmaba a cualquiera —sin sesión— que esa
    // dirección tiene cuenta en la tienda; el controlador ya prometía una
    // respuesta que no distingue los casos, y el servicio la desmentía.
    if (!user || user.emailVerified) {
      return;
    }

    const token = crypto.randomBytes(48).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await this.usersRepository.save(user);

    this.sendVerificationEmail(user).catch((err) =>
      console.error('Error sending verification email:', err),
    );
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:4000';
    const storeName =
      this.configService.get<string>('app.storeName') || 'Construir';
    const verificationUrl = `${frontendUrl}/verify-email?token=${user.emailVerificationToken}`;

    await this.emailService.sendEmailVerification({
      to: user.email,
      firstName: user.firstName,
      verificationUrl,
      storeName,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async findByUuid(uuid: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { uuid } });
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async createByAdmin(createUserAdminDto: CreateUserAdminDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserAdminDto.email },
    });

    if (existingUser) {
      // El `code` es lo que el frontend traduce: pintar el `message` tal cual
      // le mostraba "Email already exists" a un cliente que tiene la tienda en
      // español. El `message` se conserva igual para no romper a nadie que lo
      // estuviera leyendo.
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email already exists',
        code: RegisterErrorCode.EMAIL_ALREADY_REGISTERED,
      });
    }

    const hashedPassword = await bcrypt.hash(createUserAdminDto.password, 10);

    const user = this.usersRepository.create({
      firstName: createUserAdminDto.firstName,
      lastName: createUserAdminDto.lastName,
      email: createUserAdminDto.email,
      password: hashedPassword,
      role: createUserAdminDto.role,
      isActive: createUserAdminDto.isActive ?? true,
      emailVerified: true,
      // Se guardan si el administrador los aportó. Antes el DTO ni los
      // aceptaba, así que un usuario creado desde el panel nacía sin teléfono
      // aunque quien lo dio de alta lo tuviera delante.
      phone: createUserAdminDto.phone ?? null,
      identificationType: createUserAdminDto.identificationType ?? null,
      identificationNumber: createUserAdminDto.identificationNumber ?? null,
    });

    return await this.usersRepository.save(user);
  }

  async update(uuid: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.uuid !== uuid) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async updateByAdmin(
    uuid: string,
    updateUserAdminDto: UpdateUserAdminDto,
  ): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    if (updateUserAdminDto.email && updateUserAdminDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserAdminDto.email },
      });

      if (existingUser && existingUser.uuid !== uuid) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserAdminDto);
    return await this.usersRepository.save(user);
  }

  async updateRole(uuid: string, updateRoleDto: UpdateRoleDto): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    user.role = updateRoleDto.role;
    return await this.usersRepository.save(user);
  }

  async changePassword(
    uuid: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async resetPassword(
    uuid: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async softDelete(uuid: string): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    await this.usersRepository.softRemove(user);
    return user;
  }

  async findAllPaginated(getUsersDto: GetUsersDto): Promise<{
    data: User[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const { search, role, isActive, sortBy, sortOrder } = getUsersDto;
    let { page, limit } = getUsersDto;

    page = page ?? 1;
    limit = limit ?? 20;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    byRole: Record<string, number>;
  }> {
    // Contar total (incluyendo soft deleted)
    const total = await this.usersRepository
      .createQueryBuilder('user')
      .withDeleted()
      .getCount();

    // Contar activos (isActive = true, no eliminados)
    const active = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .getCount();

    // Contar inactivos (isActive = false, no eliminados)
    const inactive = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: false })
      .getCount();

    // Contar eliminados (deletedAt no es null)
    const deleted = await this.usersRepository
      .createQueryBuilder('user')
      .withDeleted()
      .where('user.deletedAt IS NOT NULL')
      .getCount();

    // Contar por rol (solo usuarios no eliminados)
    const roleStats = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const byRole: Record<string, number> = {};
    roleStats.forEach((stat) => {
      byRole[stat.role] = parseInt(stat.count, 10);
    });

    return {
      total,
      active,
      inactive,
      deleted,
      byRole,
    };
  }

  /**
   * Manda el enlace de recuperación, si procede.
   *
   * Devuelve `void` pase lo que pase, y el endpoint responde éxito siempre:
   * distinguir "te lo mandé" de "esa cuenta no existe" convierte esta puerta
   * en un oráculo de correos registrados. El precio de esa decisión correcta
   * es que un fallo aquí es INVISIBLE desde fuera, así que cada salida
   * temprana deja rastro en el log del servidor — sin eso, el 11-09-2026 un
   * administrador pidió recuperar su contraseña, el sistema no envió nada y
   * no había forma de saber por qué.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      this.logger.debug('Recuperación pedida para un correo sin cuenta.');
      return;
    }

    if (!user.isActive) {
      this.logger.debug(
        `Recuperación pedida para la cuenta ${user.uuid}, que está desactivada.`,
      );
      return;
    }

    // `leFaltaVerificarElCorreo` y no `!user.emailVerified`: la condición a
    // secas dejaba fuera a los administradores, que NUNCA verifican su correo
    // porque los da de alta otro administrador y no reciben enlace. Podían
    // entrar al panel pero no recuperar su contraseña jamás.
    if (leFaltaVerificarElCorreo(user)) {
      this.logger.debug(
        `Recuperación pedida para la cuenta ${user.uuid}, que aún no verifica su correo.`,
      );
      return;
    }

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetToken = token;
    user.passwordResetExpiresAt = expiresAt;
    await this.usersRepository.save(user);

    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:4000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const storeName =
      this.configService.get<string>('app.storeName') || 'Construir';

    await this.emailService.sendPasswordReset({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
      storeName,
    });
  }

  /**
   * Datos mínimos del enlace de recuperación, para que la pantalla de nueva
   * contraseña muestre de quién es y cuánto le queda.
   *
   * El correo va enmascarado: el endpoint es público y sin sesión, así que
   * devolver la dirección completa convertiría un token filtrado en un oráculo
   * de correos. Con la primera letra basta para que el dueño se reconozca.
   */
  async getResetTokenInfo(
    token: string,
  ): Promise<{ email: string; expiresAt: string }> {
    const user = await this.usersRepository.findOne({
      where: { passwordResetToken: token },
    });

    const expiresAt = user?.passwordResetExpiresAt;
    if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
      // Mismo error para inexistente, usado y vencido: la diferencia sólo le
      // sirve a quien esté probando tokens.
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'El enlace no es válido o ya venció',
        code: PasswordResetErrorCode.TOKEN_INVALID,
      });
    }

    return { email: maskEmail(user.email), expiresAt: expiresAt.toISOString() };
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const user = token
      ? await this.usersRepository.findOne({
          where: { passwordResetToken: token },
        })
      : null;

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Token inválido o expirado',
        code: PasswordResetErrorCode.TOKEN_INVALID,
      });
    }

    // El mínimo se comprueba también acá y no sólo en el DTO: el mensaje que
    // sale del validador es una lista en inglés, y la pantalla necesita
    // distinguir "contraseña corta" de "enlace vencido" para no mandar a pedir
    // un enlace nuevo a quien sólo escribió cinco letras.
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'La contraseña debe tener al menos 6 caracteres',
        code: PasswordResetErrorCode.WEAK_PASSWORD,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.usersRepository.save(user);
  }
}
