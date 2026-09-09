import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
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
  // Ni la entidad ni la columna acotan el nombre —es un `varchar` sin tope—,
  // así que un nombre de 2000 caracteres entraba entero y salía después en los
  // correos y en el panel. 100 es lo que ya usa `guest_customers` para el mismo
  // dato: sin el tope las dos tablas guardaban con criterios distintos.
  @MaxLength(100, codigo(RegisterErrorCode.MISSING_FIELDS))
  firstName: string;

  @IsNotEmpty(codigo(RegisterErrorCode.MISSING_FIELDS))
  @IsString(codigo(RegisterErrorCode.MISSING_FIELDS))
  @MaxLength(100, codigo(RegisterErrorCode.MISSING_FIELDS))
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
   *
   * Obligatorio, y no sólo en el formulario: mientras fuera `@IsOptional()`,
   * cualquiera que le hablara a esta API sin pasar por la pantalla podía crear
   * una cuenta sin teléfono ni identificación, y esa cuenta llegaba al panel
   * sin forma de contactar a quien compró. No hace falta `@IsNotEmpty`: al no
   * ser opcional, un campo ausente ya cae en la regla de formato, y así el
   * cliente recibe siempre el aviso que le explica qué se espera en vez de un
   * "falta un campo" a secas.
   */
  @EsTelefonoMovilVE(codigo(RegisterErrorCode.INVALID_PHONE))
  @NormalizaTelefonoMovilVE()
  phone: string;

  @IsEnum(IdentificationType, codigo(RegisterErrorCode.INVALID_IDENTIFICATION))
  identificationType: IdentificationType;

  /**
   * El `@IsString()` no es decorativo: `EsNumeroCedulaVE` da por buena la
   * identificación cuando el tipo no es V ni E —un RIF o un pasaporte tienen
   * otras reglas—, así que sin él un `{"a":1}`, un array o un número entraban
   * con 201 y se guardaban como basura. `@MaxLength(50)` es el ancho real de
   * la columna: pasarse devolvía un 500 en vez de un 400.
   */
  @EsNumeroCedulaVE(
    'identificationType',
    codigo(RegisterErrorCode.INVALID_IDENTIFICATION),
  )
  @IsString(codigo(RegisterErrorCode.INVALID_IDENTIFICATION))
  @MaxLength(50, codigo(RegisterErrorCode.INVALID_IDENTIFICATION))
  @NormalizaNumeroCedulaVE()
  identificationNumber: string;
}
