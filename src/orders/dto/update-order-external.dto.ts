import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderStatus } from '../order.entity';

/**
 * El documento de OrbisNet escribe la anulación como `canceled`, con una sola
 * L, mientras nuestro enum usa `cancelled`. No está confirmado si es un typo
 * del documento o la grafía real que envían, y equivocarse cuesta que toda
 * anulación muera en un 400 de validación sin llegar al servicio. Se aceptan
 * las dos y el controlador normaliza.
 */
const ERP_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  'canceled',
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
