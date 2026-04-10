import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderStatus } from '../order.entity';

const ERP_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
] as const;

export type ErpStatus = (typeof ERP_STATUSES)[number];

export class UpdateOrderExternalDto {
  @ApiProperty({
    enum: ERP_STATUSES,
    description:
      'pending: registrar O/C en ERP | completed: facturar | cancelled: anular',
  })
  @IsIn(ERP_STATUSES)
  status!: ErpStatus;

  @ApiPropertyOptional({
    example: 'OC-001 / FAC-2024-001',
    description: 'Requerido para status pending y completed',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  order_key?: string;

  @ApiPropertyOptional({
    example: '2026-03-07T10:00:00.000Z',
    description: 'Requerido para status completed y cancelled',
  })
  @IsOptional()
  @IsDateString()
  date_completed?: string;
}
