import {
  Controller,
  Get,
  Put,
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
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { OrdersService } from '../../orders/orders.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import { UpdateOrderStatusDto } from '../../orders/dto/update-order-status.dto';
import {
  ApiSecurityAll,
  ApiPaginatedQuery,
  ApiAuthResponses,
  ApiWritePermissionResponses,
  ApiStandardResponses,
} from '../common/decorators/api-documentation.decorator';

@ApiTags('Orders V1')
@ApiSecurityAll()
@Controller('api/v1/orders')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class OrdersV1Controller {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Listar órdenes',
    description:
      'Retorna un listado paginado de todas las órdenes con información completa de items, cliente y pago',
  })
  @ApiPaginatedQuery()
  @ApiOkResponse({
    description: 'Listado de órdenes obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        perPage: { type: 'number', example: 10 },
      },
    },
  })
  @ApiAuthResponses()
  @ApiStandardResponses()
  async findAll(
    @Query('page') page: string = '1',
    @Query('perPage') perPage: string = '10',
  ) {
    // findAll devuelve todos los orders - devolvemos tal cual
    const allOrders = await this.ordersService.findAll(undefined, true);

    // Paginación manual simple
    const pageNum = parseInt(page);
    const perPageNum = parseInt(perPage);
    const start = (pageNum - 1) * perPageNum;
    const end = start + perPageNum;

    return {
      data: allOrders.slice(start, end),
      total: allOrders.length,
      page: pageNum,
      perPage: perPageNum,
    };
  }

  @Get(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Obtener orden por UUID',
    description:
      'Retorna una orden con todos sus detalles incluyendo items, información de pago, dirección de envío y cliente',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID de la orden',
    example: 'b2c3d4e5-f6a7-8901-bcde-234567890abc',
    type: String,
  })
  @ApiOkResponse({
    description: 'Orden encontrada exitosamente',
  })
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Orden no encontrada',
  })
  @ApiStandardResponses()
  async findOne(@Param('uuid') uuid: string) {
    return this.ordersService.findOneByUuid(uuid);
  }

  @Put(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.ORDER_UPDATED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar estado de orden',
    description:
      'Actualiza el estado de la orden y/o el estado del pago. Requiere permiso WRITE o READ_WRITE. Dispara webhook order.updated.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID de la orden a actualizar',
    example: 'b2c3d4e5-f6a7-8901-bcde-234567890abc',
    type: String,
  })
  @ApiOkResponse({
    description: 'Estado de la orden actualizado exitosamente',
  })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({
    description: 'Orden no encontrada',
  })
  @ApiStandardResponses()
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(uuid, updateStatusDto);
  }
}
