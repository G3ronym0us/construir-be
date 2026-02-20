import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCategoryForV1Dto {
  @ApiProperty({
    description: 'Código del sistema externo (ERP)',
    example: '20131',
  })
  @IsNotEmpty()
  @IsString()
  externalCode: string;

  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Aspiradoras',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Aspiradoras y equipos de limpieza',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategoryForV1Dto extends PartialType(
  CreateCategoryForV1Dto,
) {}
