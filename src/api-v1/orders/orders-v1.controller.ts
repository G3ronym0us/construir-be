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
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
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
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { PaginationLinkInterceptor } from '../common/interceptors/pagination-link.interceptor';
import { AcknowledgeOrderDto } from '../../orders/dto/acknowledge-order.dto';
import { UpdateOrderExternalDto } from '../../orders/dto/update-order-external.dto';
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
@UseInterceptors(WebhookInterceptor, PaginationLinkInterceptor)
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

    const total = allOrders.length;
    const lastPage = Math.ceil(total / perPageNum) || 1;

    return {
      data: allOrders.slice(start, end),
      total,
      page: pageNum,
      perPage: perPageNum,
      lastPage,
    };
  }

  @Get('on-hold')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Listar órdenes en espera (on-hold)',
    description:
      'Retorna un listado paginado de órdenes en estado on-hold con el formato de integración externa.',
  })
  @ApiPaginatedQuery()
  @ApiOkResponse({
    description: 'Listado de órdenes pendientes obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        perPage: { type: 'number', example: 10 },
        lastPage: { type: 'number', example: 5 },
      },
    },
  })
  @ApiAuthResponses()
  @ApiStandardResponses()
  async findPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.ordersService.getPendingOrders(page, perPage);
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

  @Put(':id/acknowledge')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar recepción de orden por sistema externo',
    description:
      'Registra el order_key del sistema externo y cambia el estado de on-hold a pending.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID numérico de la orden',
    type: Number,
  })
  @ApiOkResponse({ description: 'Orden actualizada exitosamente' })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiStandardResponses()
  async acknowledge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcknowledgeOrderDto,
  ) {
    return this.ordersService.acknowledgeOrder(id, dto.order_key);
  }

  @Put(':id')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar orden desde sistema externo (OrbisNet)',
    description:
      'pending: registrar O/C en ERP (requiere order_key) | ' +
      'completed: facturar (requiere order_key y date_completed) | ' +
      'cancelled: anular (requiere date_completed)',
  })
  @ApiParam({ name: 'id', description: 'ID numérico de la orden', type: Number })
  @ApiOkResponse({ description: 'Orden actualizada exitosamente' })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  @ApiStandardResponses()
  async updateByExternal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderExternalDto,
  ) {
    if (dto.status === 'pending') {
      if (!dto.order_key) {
        throw new BadRequestException('order_key is required when status is pending');
      }
      return this.ordersService.acknowledgeOrder(id, dto.order_key);
    }

    if (dto.status === 'completed') {
      if (!dto.order_key) {
        throw new BadRequestException('order_key is required when status is completed');
      }
      if (!dto.date_completed) {
        throw new BadRequestException('date_completed is required when status is completed');
      }
      return this.ordersService.completeOrder(id, dto.order_key, new Date(dto.date_completed));
    }

    // cancelled
    if (!dto.date_completed) {
      throw new BadRequestException('date_completed is required when status is cancelled');
    }
    return this.ordersService.cancelPendingOrder(id, new Date(dto.date_completed));
  }
}
