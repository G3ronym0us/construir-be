import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetCustomersDto {
  @ApiPropertyOptional({
    description: 'Número de página para la paginación',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    example: 20,
    default: 20,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Término de búsqueda para filtrar por nombre o email',
    example: 'juan@ejemplo.com',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar los resultados',
    enum: [
      'name',
      'email',
      'totalSpent',
      'totalOrders',
      'lastOrderDate',
      'createdAt',
    ],
    example: 'lastOrderDate',
    default: 'lastOrderDate',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'email',
    'totalSpent',
    'totalOrders',
    'lastOrderDate',
    'createdAt',
  ])
  sortBy?: string = 'lastOrderDate';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
