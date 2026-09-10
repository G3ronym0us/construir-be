import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '../user.entity';
import { IdentificationType } from '../../orders/guest-customer.entity';
import {
  EsNumeroCedulaVE,
  EsTelefonoMovilVE,
  NormalizaNumeroCedulaVE,
  NormalizaTelefonoMovilVE,
} from '../../common/validation/venezuela.decorators';

export class CreateUserAdminDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  /**
   * Aquí el teléfono y la cédula no son obligatorios: por esta puerta entra
   * personal interno, y a un administrador que da de alta a otro no se le va a
   * exigir la cédula del compañero.
   *
   * Pero si los aporta tienen que cumplir la misma regla que el registro y que
   * el checkout —los mismos decoradores, no otra copia—: mientras esta puerta
   * no validaba nada, la misma tabla acababa con teléfonos guardados de cinco
   * formas distintas según por dónde hubiera entrado cada usuario.
   */
  @IsOptional()
  @EsTelefonoMovilVE()
  @NormalizaTelefonoMovilVE()
  phone?: string;

  @IsOptional()
  @IsEnum(IdentificationType)
  identificationType?: IdentificationType;

  @IsOptional()
  @EsNumeroCedulaVE('identificationType')
  @IsString()
  @MaxLength(50)
  @NormalizaNumeroCedulaVE()
  identificationNumber?: string;
}
