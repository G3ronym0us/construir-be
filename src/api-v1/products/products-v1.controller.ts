import {
  Controller,
  Get,
  Post,
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
import { ProductsService } from '../../products/products.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import { CreateProductDto } from '../../products/dto/create-product.dto';
import { UpdateProductDto } from '../../products/dto/update-product.dto';

@Controller('api/v1/products')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class ProductsV1Controller {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  async findAll(
    @Query('page') page: string = '1',
    @Query('perPage') perPage: string = '10',
    @Query('search') search?: string,
  ) {
    const result = await this.productsService.findAllPaginated(
      parseInt(page),
      parseInt(perPage),
      search,
    );

    // Devuelve formato nativo - sin transformación
    return result;
  }

  @Get(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  async findOne(@Param('uuid') uuid: string) {
    // Devuelve entidad Product tal cual
    return this.productsService.findByUuid(uuid);
  }

  @Post()
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_CREATED)
  async create(@Body() createDto: CreateProductDto) {
    // Devuelve entidad Product creada
    return this.productsService.create(createDto);
  }

  @Put(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_UPDATED)
  async update(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateProductDto,
  ) {
    // Devuelve entidad Product actualizada
    return this.productsService.update(uuid, updateDto);
  }

  @Delete(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_DELETED)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('uuid') uuid: string) {
    await this.productsService.remove(uuid);
    return { uuid, message: 'Product deleted successfully' };
  }
}
