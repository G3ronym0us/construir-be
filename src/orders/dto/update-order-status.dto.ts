import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.entity';
import { PaymentStatus } from '../payment-info.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  orderStatus?: OrderStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}
