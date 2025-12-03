import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Martillo de Acero 16oz',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'SKU único del producto',
    example: 'MART-001',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Cantidad disponible en inventario',
    example: 50,
    minimum: 0,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  inventory: number;

  @ApiProperty({
    description: 'Precio del producto en USD',
    example: 15.99,
    minimum: 0,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'UUIDs de las categorías a las que pertenece el producto',
    example: ['cat-uuid-1', 'cat-uuid-2'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryUuids?: string[];

  @ApiPropertyOptional({
    description: 'Descripción detallada del producto (soporta HTML)',
    example:
      '<p>Martillo de acero forjado con mango de madera ergonómico. Ideal para trabajos de construcción y carpintería.</p>',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Descripción corta del producto',
    example: 'Martillo de acero forjado con mango ergonómico',
    type: String,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Tipo de producto',
    example: 'simple',
    type: String,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description:
      'Indica si el producto está publicado y visible en el catálogo',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si el producto es destacado',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Visibilidad del producto en el catálogo',
    example: 'visible',
    type: String,
  })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({
    description: 'Código de barras del producto',
    example: '7501234567890',
    type: String,
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    description: 'Etiquetas del producto para búsqueda y clasificación',
    example: ['herramientas', 'construcción', 'acero'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
