import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteOrderItemDto {
  @ApiProperty({ description: 'UUID del producto' })
  @IsNotEmpty()
  @IsString()
  productUuid: string;

  @ApiProperty({ description: 'Cantidad', minimum: 1, example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class QuoteOrderDto {
  @ApiProperty({ type: [QuoteOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteOrderItemDto)
  items: QuoteOrderItemDto[];

  @ApiPropertyOptional({ description: 'Código de descuento a aplicar' })
  @IsOptional()
  @IsString()
  discountCode?: string;
}
