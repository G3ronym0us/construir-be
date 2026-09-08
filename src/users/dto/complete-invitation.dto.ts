import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IdentificationType } from '../../orders/guest-customer.entity';
import {
  EsNumeroCedulaVE,
  EsTelefonoMovilVE,
  NormalizaNumeroCedulaVE,
  NormalizaTelefonoMovilVE,
} from '../../common/validation/venezuela.decorators';

export class CompleteInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;

  /**
   * Opcionales por la misma razón que en el alta de un administrador: quien
   * llega por invitación es personal interno y el formulario sólo le pide
   * nombre, apellido y contraseña. Exigírselos aquí rompería ese flujo.
   *
   * Lo que no puede ser es que, si los manda, entren sin mirar: son la misma
   * columna que llena el registro público, y hasta ahora cada puerta guardaba
   * con su propio criterio.
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
