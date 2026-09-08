import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuthErrorCode } from './auth-error-code.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw this.rechazo(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    // Check if account is deactivated
    if (!user.isActive) {
      throw this.rechazo(
        AuthErrorCode.ACCOUNT_DEACTIVATED,
        'Account is deactivated',
      );
    }

    // Check if email is verified (only required for customer/user roles)
    if (
      !user.emailVerified &&
      (user.role === 'customer' || user.role === 'user')
    ) {
      throw this.rechazo(
        AuthErrorCode.EMAIL_NOT_VERIFIED,
        'Email not verified',
      );
    }

    // Check if account is soft deleted
    if (user.deletedAt) {
      throw this.rechazo(
        AuthErrorCode.ACCOUNT_NOT_FOUND,
        'Account not found',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw this.rechazo(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }

    const payload = {
      sub: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * 401 con `code` además del `message`.
   *
   * El `code` es lo que el frontend traduce; el `message` se conserva tal cual
   * estaba para no romper a ningún cliente que lo estuviera leyendo.
   */
  private rechazo(code: AuthErrorCode, message: string) {
    return new UnauthorizedException({
      statusCode: 401,
      error: 'Unauthorized',
      message,
      code,
    });
  }

  async validateUser(userId: number) {
    return await this.usersService.findById(userId);
  }
}
