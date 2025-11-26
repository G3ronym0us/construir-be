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
import { CustomersService } from '../../customers/customers.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import { GetCustomersDto } from '../../customers/dto/get-customers.dto';

@Controller('api/v1/customers')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class CustomersV1Controller {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
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
  async findOne(@Param('id') id: string) {
    // Devuelve customer detail tal cual (user o guest)
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.CUSTOMER_UPDATED)
  @HttpCode(HttpStatus.OK)
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
  async delete(@Param('id') id: string) {
    // Nota: El servicio base no tiene delete, devolvemos 501
    return {
      statusCode: 501,
      message: 'Delete customer not implemented yet',
    };
  }
}
