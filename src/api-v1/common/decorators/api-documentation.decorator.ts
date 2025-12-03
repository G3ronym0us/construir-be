import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import {
  ValidationErrorSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
} from '../swagger/swagger-schemas';

export function ApiPaginatedQuery() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Número de página',
      example: 1,
    }),
    ApiQuery({
      name: 'perPage',
      required: false,
      type: Number,
      description: 'Registros por página',
      example: 10,
    }),
  );
}

export function ApiSearchQuery() {
  return applyDecorators(
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Término de búsqueda',
      example: 'martillo',
    }),
  );
}

export function ApiAuthResponses() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Credenciales de API inválidas o faltantes',
      type: UnauthorizedErrorSchema,
    }),
  );
}

export function ApiWritePermissionResponses() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Credenciales de API inválidas o faltantes',
      type: UnauthorizedErrorSchema,
    }),
    ApiForbiddenResponse({
      description:
        'La API key no tiene permisos de escritura. Se requiere permiso WRITE o READ_WRITE.',
      type: ForbiddenErrorSchema,
    }),
  );
}

export function ApiStandardResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Error de validación en los datos de entrada',
      type: ValidationErrorSchema,
    }),
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
        },
      },
    }),
  );
}

export function ApiSecurityAll() {
  return applyDecorators(
    ApiSecurity('bearerAuth'),
    ApiSecurity('queryAuth'),
    ApiSecurity('headerAuth'),
  );
}

export function ApiPaginatedResponse<TModel extends Type<any>>(model: TModel) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Listado obtenido exitosamente',
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: `#/components/schemas/${model.name}` },
              },
              total: {
                type: 'number',
                example: 100,
              },
              page: {
                type: 'number',
                example: 1,
              },
              perPage: {
                type: 'number',
                example: 10,
              },
            },
          },
        ],
      },
    }),
  );
}
