import { ApiProperty } from '@nestjs/swagger';

export class PaginationResponseSchema {
  @ApiProperty({
    description: 'Datos paginados',
    example: [],
    isArray: true,
  })
  data: any[];

  @ApiProperty({
    description: 'Total de registros',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Registros por página',
    example: 10,
  })
  perPage: number;
}

export class ErrorResponseSchema {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Bad Request',
  })
  message: string | string[];

  @ApiProperty({
    description: 'Tipo de error',
    example: 'Bad Request',
    required: false,
  })
  error?: string;
}

export class ValidationErrorSchema {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Lista de errores de validación',
    example: ['name should not be empty', 'price must be a positive number'],
    isArray: true,
  })
  message: string[];

  @ApiProperty({
    description: 'Tipo de error',
    example: 'Bad Request',
  })
  error: string;
}

export class UnauthorizedErrorSchema {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 401,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de error de autenticación',
    example: 'Missing API credentials',
  })
  message: string;
}

export class ForbiddenErrorSchema {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 403,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de error de permisos',
    example: 'Insufficient API key permissions. WRITE permission required.',
  })
  message: string;
}

export class NotFoundErrorSchema {
  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensaje de recurso no encontrado',
    example: 'Product not found',
  })
  message: string;
}

export class SuccessMessageSchema {
  @ApiProperty({
    description: 'UUID del recurso',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  uuid: string;

  @ApiProperty({
    description: 'Mensaje de éxito',
    example: 'Product deleted successfully',
  })
  message: string;
}
