import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteOrderItemDto {
  @ApiPropertyOptional({ description: 'UUID del producto' })
  @IsNotEmpty()
  @IsString()
  productUuid: string;

  // Alineado con `GuestCartItemDto` (create-order.dto.ts): antes era
  // `@IsNumber()`, así que `quantity: 1.5` pasaba el quote con 201 y
  // `canCheckout: true`, pero el mismo body a POST /orders devolvía 400 —
  // el cliente veía un desglose válido y un fallo inexplicable al confirmar.
  @ApiPropertyOptional({ description: 'Cantidad', minimum: 1, example: 2 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class QuoteOrderDto {
  // Opcional, igual que en `CreateOrderDto`: para un usuario autenticado se
  // ignora (se cotiza su carrito del servidor, ver `OrdersService.quoteOrder`)
  // y sólo es obligatorio en la práctica para invitados, donde el servicio
  // rechaza explícitamente si viene vacío o ausente.
  @ApiPropertyOptional({
    type: [QuoteOrderItemDto],
    description:
      'Ítems a cotizar. Sólo se usa para invitados: un usuario autenticado cotiza su carrito del servidor.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteOrderItemDto)
  items?: QuoteOrderItemDto[];

  @ApiPropertyOptional({ description: 'Código de descuento a aplicar' })
  @IsOptional()
  @IsString()
  discountCode?: string;
}
