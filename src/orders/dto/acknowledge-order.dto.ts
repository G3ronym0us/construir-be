import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcknowledgeOrderDto {
  @ApiProperty({ example: 'wc_order_abc123xyz' })
  @IsString()
  @IsNotEmpty()
  order_key: string;
}
