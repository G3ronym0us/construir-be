import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IdentificationType } from '../../orders/guest-customer.entity';
import { RegisterErrorCode } from '../register-error-code.enum';
import {
  EsNumeroCedulaVE,
  EsTelefonoMovilVE,
  NormalizaNumeroCedulaVE,
  NormalizaTelefonoMovilVE,
} from '../../common/validation/venezuela.decorators';

/**
 * El `context` de cada regla lleva el motivo del rechazo en un `code` estable;
 * `RegisterValidationPipe` lo saca de ahí para que la pantalla de registro
 * pueda decirle al cliente, en su idioma, qué campo tiene mal.
 */
const codigo = (code: RegisterErrorCode) => ({ context: { code } });

export class CreateUserDto {
  @IsNotEmpty(codigo(RegisterErrorCode.MISSING_FIELDS))
  @IsString(codigo(RegisterErrorCode.MISSING_FIELDS))
  firstName: string;

  @IsNotEmpty(codigo(RegisterErrorCode.MISSING_FIELDS))
  @IsString(codigo(RegisterErrorCode.MISSING_FIELDS))
  lastName: string;

  @IsNotEmpty(codigo(RegisterErrorCode.MISSING_FIELDS))
  @IsEmail({}, codigo(RegisterErrorCode.INVALID_EMAIL))
  email: string;

  @IsNotEmpty(codigo(RegisterErrorCode.MISSING_FIELDS))
  @IsString(codigo(RegisterErrorCode.WEAK_PASSWORD))
  @MinLength(6, codigo(RegisterErrorCode.WEAK_PASSWORD))
  password: string;

  /**
   * Sólo móviles: es el número por el que el despachador coordina la entrega y
   * por el que se confirma un pago móvil. Un fijo ahí no sirve para ninguna de
   * las dos cosas.
   */
  @IsOptional()
  @EsTelefonoMovilVE(codigo(RegisterErrorCode.INVALID_PHONE))
  @NormalizaTelefonoMovilVE()
  phone?: string;

  @IsOptional()
  @IsEnum(IdentificationType, codigo(RegisterErrorCode.INVALID_IDENTIFICATION))
  identificationType?: IdentificationType;

  @IsOptional()
  @EsNumeroCedulaVE(
    'identificationType',
    codigo(RegisterErrorCode.INVALID_IDENTIFICATION),
  )
  @NormalizaNumeroCedulaVE()
  identificationNumber?: string;
}
