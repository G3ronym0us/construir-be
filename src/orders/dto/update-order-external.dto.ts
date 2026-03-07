import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateOrderExternalDto {
  @ApiProperty({ enum: ['completed', 'canceled'] })
  @IsIn(['completed', 'canceled'])
  status: 'completed' | 'canceled';

  @ApiProperty({ example: 'OC-001 / FAC-2024-001', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  order_key?: string;

  @ApiProperty({ example: '2026-03-07T10:00:00.000Z' })
  @IsDateString()
  date_completed: string;
}
