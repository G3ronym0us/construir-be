import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../order.entity';
import { PaymentStatus } from '../payment-info.entity';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({
    description: 'Estado de la orden',
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    enumName: 'OrderStatus',
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Estado del pago',
    enum: PaymentStatus,
    example: PaymentStatus.VERIFIED,
    enumName: 'PaymentStatus',
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Notas administrativas internas sobre la orden',
    example:
      'Cliente solicitó cambio de dirección de envío. Actualizado el 2025-01-15.',
    type: String,
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
