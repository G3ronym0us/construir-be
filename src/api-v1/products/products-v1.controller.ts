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
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ProductsService } from '../../products/products.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { TriggerWebhook } from '../common/decorators/trigger-webhook.decorator';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { WebhookEvent } from '../../webhooks/webhook.entity';
import {
  ApiSecurityAll,
  ApiPaginatedQuery,
  ApiSearchQuery,
  ApiAuthResponses,
  ApiWritePermissionResponses,
  ApiStandardResponses,
} from '../common/decorators/api-documentation.decorator';
import { SuccessMessageSchema } from '../common/swagger/swagger-schemas';
import {
  CreateProductForV1Dto,
  UpdateProductForV1Dto,
} from '../dtos/products.dto';
import { CategoriesService } from 'src/categories/categories.service';

@ApiTags('Products V1')
@ApiSecurityAll()
@Controller('api/v1/products')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor)
export class ProductsV1Controller {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoryService: CategoriesService,
  ) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Listar productos',
    description:
      'Retorna un listado paginado de productos con opción de búsqueda por nombre o SKU',
  })
  @ApiPaginatedQuery()
  @ApiSearchQuery()
  @ApiOkResponse({
    description: 'Listado de productos obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number', example: 100 },
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
  @ApiOperation({
    summary: 'Obtener producto por UUID',
    description:
      'Retorna un producto con todos sus detalles incluyendo imágenes, categorías y precios',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID del producto',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
    type: String,
  })
  @ApiOkResponse({
    description: 'Producto encontrado exitosamente',
  })
  @ApiAuthResponses()
  @ApiNotFoundResponse({
    description: 'Producto no encontrado',
  })
  @ApiStandardResponses()
  async findOne(@Param('uuid') uuid: string) {
    // Devuelve entidad Product tal cual
    return this.productsService.findByUuid(uuid);
  }

  @Post()
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_CREATED)
  @ApiOperation({
    summary: 'Crear producto',
    description:
      'Crea un nuevo producto en el catálogo. Requiere permiso WRITE o READ_WRITE. Dispara webhook product.created.',
  })
  @ApiCreatedResponse({
    description: 'Producto creado exitosamente',
  })
  @ApiWritePermissionResponses()
  @ApiStandardResponses()
  async create(@Body() createDto: CreateProductForV1Dto) {
    const categoryUuids: string[] = [];

    if (createDto.category) {
      const category = await this.categoryService.findByNameOrCreate(
        createDto.category,
      );
      categoryUuids.push(category.uuid);
    }

    return this.productsService.create({ ...createDto, categoryUuids });
  }

  @Put(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_UPDATED)
  @ApiOperation({
    summary: 'Actualizar producto',
    description:
      'Actualiza un producto existente. Requiere permiso WRITE o READ_WRITE. Dispara webhook product.updated.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID del producto a actualizar',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
    type: String,
  })
  @ApiOkResponse({
    description: 'Producto actualizado exitosamente',
  })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({
    description: 'Producto no encontrado',
  })
  @ApiStandardResponses()
  async update(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateProductForV1Dto,
  ) {
    let categoryUuids: string[] | undefined = undefined;

    if (updateDto.category) {
      // Obtener o crear la nueva categoría principal
      const newMainCategory = await this.categoryService.findByNameOrCreate(
        updateDto.category,
      );

      // Obtener el producto actual con sus categorías
      const currentProduct = await this.productsService.findByUuid(uuid);

      // Verificar si la categoría ya está en el producto
      const categoryAlreadyExists = currentProduct.categories.some(
        (cat) => cat.uuid === newMainCategory.uuid,
      );

      if (!categoryAlreadyExists) {
        // Mantener todas las categorías no-main existentes
        const nonMainCategories = currentProduct.categories.filter(
          (cat) => !cat.isMain,
        );

        // Combinar la nueva categoría principal con las categorías secundarias existentes
        categoryUuids = [
          newMainCategory.uuid,
          ...nonMainCategories.map((cat) => cat.uuid),
        ];
      }
    }

    // Devuelve entidad Product actualizada
    return this.productsService.update(uuid, {
      ...updateDto,
      categoryUuids,
    });
  }

  @Delete(':uuid')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_DELETED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar producto',
    description:
      'Elimina un producto del catálogo. Requiere permiso WRITE o READ_WRITE. Dispara webhook product.deleted.',
  })
  @ApiParam({
    name: 'uuid',
    description: 'UUID del producto a eliminar',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
    type: String,
  })
  @ApiOkResponse({
    description: 'Producto eliminado exitosamente',
    type: SuccessMessageSchema,
  })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({
    description: 'Producto no encontrado',
  })
  @ApiStandardResponses()
  async delete(@Param('uuid') uuid: string) {
    await this.productsService.remove(uuid);
    return { uuid, message: 'Product deleted successfully' };
  }
}
