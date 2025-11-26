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
import { OrdersService } from '../../orders/orders.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import { UpdateOrderStatusDto } from '../../orders/dto/update-order-status.dto';

@Controller('api/v1/orders')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class OrdersV1Controller {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
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

  @Get(':id')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  async findOne(@Param('id') id: string) {
    const orderId = parseInt(id);
    // Devuelve entidad Order tal cual
    return this.ordersService.findOne(orderId);
  }

  @Put(':id')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.ORDER_UPDATED)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    const orderId = parseInt(id);
    // Devuelve entidad Order actualizada
    return this.ordersService.updateOrderStatus(orderId, updateStatusDto);
  }
}
