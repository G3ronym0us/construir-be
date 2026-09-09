import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  MinLength,
  IsArray,
  ArrayMaxSize,
  IsInt,
  IsPositive,
  Min,
  IsNumber,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../payment-info.entity';
import { DeliveryMethod } from '../order.entity';
import { IdentificationType } from '../guest-customer.entity';
import {
  EsNumeroCedulaVE,
  EsTelefonoMovilVE,
  NormalizaNumeroCedulaVE,
  NormalizaTelefonoMovilVE,
} from '../../common/validation/venezuela.decorators';

export class CustomerInfoDto {
  @IsEnum(IdentificationType)
  @IsNotEmpty()
  identificationType: IdentificationType;

  /**
   * Misma regla que el registro: el checkout también puede crear la cuenta
   * (`createAccount`), y ese camino no pasa por `CreateUserDto`. Sin validar
   * acá, la cédula entraba con cualquier forma por la puerta de al lado.
   *
   * Sólo se exige forma de cédula cuando el tipo es V o E: un RIF (J, G) o un
   * pasaporte (P) tienen otras reglas y siguen aceptándose como antes.
   */
  @IsString()
  @IsNotEmpty()
  // El ancho real de la columna: pasarse devolvía un 500 en vez de un 400.
  @MaxLength(50)
  @EsNumeroCedulaVE('identificationType')
  @NormalizaNumeroCedulaVE()
  identificationNumber: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** Sólo móviles: es por donde el despachador coordina la entrega. */
  @IsString()
  @IsNotEmpty()
  @EsTelefonoMovilVE()
  @NormalizaTelefonoMovilVE()
  phone: string;
}

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsString()
  @IsOptional()
  country?: string;

  /**
   * Referencias para llegar: "casa azul, timbre 2", "al lado de la panadería".
   *
   * Va acotado porque en la práctica aquí no se escriben sólo referencias: se
   * escriben SECRETOS DE ACCESO —"el portón está abierto", el código del
   * edificio— y PATRONES DE PRESENCIA —"sólo por las mañanas"—. Saber la calle
   * de alguien no te da su código ni te dice cuándo no hay nadie en la casa,
   * así que este campo puede ser más peligroso que la dirección misma pese a
   * parecer un detalle. El tope no lo protege, pero limita cuánto se puede
   * acumular ahí y evita que el campo se use como saco sin fondo.
   */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  additionalInfo?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class PaymentDetailsDto {
  // Zelle
  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderBank?: string;

  // PagoMóvil
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  cedula?: string;

  @IsString()
  @IsOptional()
  bankCode?: string; // Código del banco (4 dígitos)

  @IsString()
  @IsOptional()
  referenceCode?: string;

  // Transferencia
  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  transferBankCode?: string; // Código del banco (4 dígitos)

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GuestCartItemDto {
  @IsString()
  productUuid: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  // Información del cliente (requerido para guests, debe enviarse desde el frontend)
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  @IsOptional() // Opcional porque usuarios autenticados no lo necesitan
  customerInfo?: CustomerInfoDto;

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @ValidateIf((o) => o.deliveryMethod === DeliveryMethod.DELIVERY)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails: PaymentDetailsDto;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  discountCode?: string;

  @ApiPropertyOptional({
    description:
      'Tasa de cambio que el cliente vio en el quote. Si no coincide con la tasa de facturación, la orden se rechaza con 409 para que la UI pida reconfirmación.',
    example: 245.5,
  })
  @IsOptional()
  @IsNumber()
  expectedExchangeRate?: number;

  // Items del carrito (solo para usuarios guest sin autenticación)
  /**
   * Tope de renglones. Antes no había ninguno y lo acotaba de hecho el límite
   * de cuerpo de Express: por encima de unos 1300 renglones devolvía 413. Eso
   * no es un límite, es un accidente — depende de lo largo que sea un uuid y
   * se mueve solo si alguien toca la configuración del body-parser.
   *
   * 100 es holgado para una ferretería: es el número de PRODUCTOS DISTINTOS en
   * un pedido, no de unidades (las unidades van en `quantity`, que no tiene
   * tope acá porque lo topa el inventario). Una obra que compra de todo no
   * llega a cien líneas distintas.
   *
   * Importa porque cada renglón es una consulta de producto y una escritura, y
   * esta ruta es pública: sin tope, un solo cuerpo de 1300 renglones costaba
   * 1300 consultas y no lo frenaba ningún límite de tasa, que cuenta
   * peticiones, no trabajo por petición.
   */
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  @IsOptional()
  items?: GuestCartItemDto[];

  // Para usuarios invitados que quieren crear cuenta
  @IsBoolean()
  @IsOptional()
  createAccount?: boolean;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}
