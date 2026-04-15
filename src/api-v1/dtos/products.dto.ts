import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IvaType } from '../../products/enums/iva-type.enum';

export class CreateProductForV1Dto {
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Martillo de Acero 16oz',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description:
      'Nombre personalizado del producto. Tiene mayor prioridad que el nombre original en el frontend.',
    example: 'Martillo 16oz',
    type: String,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  customName?: string;

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
    description: 'Categoría a la que pertenece el producto',
    example: 'Pinturas',
    type: String,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del producto (soporta HTML)',
    example:
      '<p>Martillo de acero forjado con mango de madera ergonómico. Ideal para trabajos de construcción y carpintería.</p>',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
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

  @ApiPropertyOptional({
    description:
      'Tipo de IVA aplicable al producto. 0=Normal (16%), 1=Exento (0%), 2=Reducido (8%), 3=Lujo (24%)',
    enum: IvaType,
    default: IvaType.NORMAL,
  })
  @IsOptional()
  @IsEnum(IvaType)
  ivaType?: IvaType;
}

export class UpdateProductForV1Dto extends PartialType(CreateProductForV1Dto) {}
