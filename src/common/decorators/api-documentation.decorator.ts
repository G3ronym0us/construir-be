import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

/**
 * Aplica autenticación JWT Bearer a un endpoint
 */
export function ApiJwtAuth() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: 'No autenticado. Token JWT inválido o faltante.',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}

/**
 * Documenta que un endpoint requiere role ADMIN
 */
export function ApiAdminOnly() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description: 'No autenticado. Token JWT inválido o faltante.',
    }),
    ApiForbiddenResponse({
      description: 'Acceso denegado. Este endpoint requiere permisos de ADMIN.',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden resource' },
        },
      },
    }),
  );
}

/**
 * Documenta que un endpoint no requiere autenticación
 */
export function ApiPublicEndpoint() {
  return applyDecorators();
  // Este decorador es solo documental, no aplica guards
}

/**
 * Documenta que un endpoint requiere cualquier usuario autenticado
 */
export function ApiUserOrAdmin() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({
      description:
        'No autenticado. Token JWT inválido o faltante. Debes estar registrado e iniciar sesión.',
    }),
  );
}

/**
 * Agrega respuestas estándar de error
 */
export function ApiStandardErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Error de validación en los datos de entrada',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: ['email must be an email', 'password is required'],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
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

/**
 * Documenta endpoint con autenticación opcional (guest o autenticado)
 */
export function ApiOptionalAuth() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    // No agrega UnauthorizedResponse porque el endpoint funciona sin auth
  );
}
