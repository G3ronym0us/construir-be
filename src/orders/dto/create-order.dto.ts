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
  IsInt,
  IsPositive,
  Min,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../payment-info.entity';
import { DeliveryMethod } from '../order.entity';
import { IdentificationType } from '../guest-customer.entity';

export class CustomerInfoDto {
  @IsEnum(IdentificationType)
  @IsNotEmpty()
  identificationType: IdentificationType;

  @IsString()
  @IsNotEmpty()
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

  @IsString()
  @IsNotEmpty()
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

  @IsString()
  @IsOptional()
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

  // Items del carrito (solo para usuarios guest sin autenticación)
  @IsArray()
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
