import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiNotImplementedResponse,
} from '@nestjs/swagger';
import { CustomersService } from '../../customers/customers.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import { GetCustomersDto } from '../../customers/dto/get-customers.dto';
import {
  ApiSecurityAll,
  ApiAuthResponses,
  ApiWritePermissionResponses,
  ApiStandardResponses,
} from '../common/decorators/api-documentation.decorator';

@ApiTags('Customers V1')
@ApiSecurityAll()
@Controller('api/v1/customers')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class CustomersV1Controller {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Listar clientes',
    description:
      'Retorna un listado paginado de clientes con estadísticas de compras. Soporta búsqueda y ordenamiento personalizado.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Registros por página',
    example: 20,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nombre o email',
    example: 'juan@ejemplo.com',
  })
  @ApiOkResponse({
    description: 'Listado de clientes obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
      },
    },
  })
  @ApiAuthResponses()
  @ApiStandardResponses()
  async findAll(
    @Query('page') page: string,
    @Query('perPage') perPage: string,
    @Query('search') search?: string,
  ) {
    const dto: GetCustomersDto = {
      page: page ? parseInt(page) : 1,
      limit: perPage ? parseInt(perPage) : 20,
      search,
    };

    // Devuelve resultado completo del servicio (incluye data, total, etc.)
    return this.customersService.findAll(dto);
  }

  @Get(':id')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Obtener cliente por ID',
    description:
      'Retorna un cliente con sus estadísticas de compras. El ID puede ser del formato user-{id} para clientes registrados o guest-{id} para invitados.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente (formato: user-123 o guest-456)',
    example: 'user-1',
    type: String,
  })
  @ApiOkResponse({
    description: 'Cliente encontrado exitosamente',
  })
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Cliente no encontrado',
  })
  @ApiStandardResponses()
  async findOne(@Param('id') id: string) {
    // Devuelve customer detail tal cual (user o guest)
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.CUSTOMER_UPDATED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar cliente',
    description:
      'Actualiza la información de un cliente. NOTA: Endpoint aún no implementado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente (formato: user-123 o guest-456)',
    example: 'user-1',
    type: String,
  })
  @ApiNotImplementedResponse({
    description: 'Funcionalidad no implementada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 501 },
        message: {
          type: 'string',
          example: 'Update customer not implemented yet',
        },
      },
    },
  })
  @ApiWritePermissionResponses()
  @ApiStandardResponses()
  async update(@Param('id') id: string, @Body() updateDto: any) {
    // Nota: El servicio base no tiene update, devolvemos 501
    return {
      statusCode: 501,
      message: 'Update customer not implemented yet',
    };
  }

  @Delete(':id')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.CUSTOMER_DELETED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar cliente',
    description:
      'Elimina un cliente del sistema. NOTA: Endpoint aún no implementado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del cliente (formato: user-123 o guest-456)',
    example: 'user-1',
    type: String,
  })
  @ApiNotImplementedResponse({
    description: 'Funcionalidad no implementada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 501 },
        message: {
          type: 'string',
          example: 'Delete customer not implemented yet',
        },
      },
    },
  })
  @ApiWritePermissionResponses()
  @ApiStandardResponses()
  async delete(@Param('id') id: string) {
    // Nota: El servicio base no tiene delete, devolvemos 501
    return {
      statusCode: 501,
      message: 'Delete customer not implemented yet',
    };
  }
}
