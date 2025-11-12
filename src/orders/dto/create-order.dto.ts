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

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

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
  bank?: string;

  @IsString()
  @IsOptional()
  referenceCode?: string;

  // Transferencia
  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GuestCartItemDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @ValidateIf((o) => o.deliveryMethod === DeliveryMethod.DELIVERY)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  // Email requerido para usuarios guest con pickup (ya que no tienen shippingAddress)
  @ValidateIf((o) => o.deliveryMethod === DeliveryMethod.PICKUP && !o.shippingAddress)
  @IsEmail()
  @IsOptional()
  guestEmail?: string;

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
