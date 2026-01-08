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
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
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

  @Get(':sku')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Obtener producto por SKU',
    description:
      'Retorna un producto con todos sus detalles incluyendo imágenes, categorías y precios',
  })
  @ApiParam({
    name: 'sku',
    description: 'SKU único del producto',
    example: 'MART-001',
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
  async findOne(@Param('sku') sku: string) {
    // Devuelve entidad Product tal cual
    return this.productsService.findBySku(sku);
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

  @Put(':sku')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_UPDATED)
  @ApiOperation({
    summary: 'Actualizar producto',
    description:
      'Actualiza un producto existente por SKU. Requiere permiso WRITE o READ_WRITE. Dispara webhook product.updated.',
  })
  @ApiParam({
    name: 'sku',
    description: 'SKU único del producto a actualizar',
    example: 'MART-001',
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
    @Param('sku') sku: string,
    @Body() updateDto: UpdateProductForV1Dto,
  ) {
    let categoryUuids: string[] | undefined = undefined;

    if (updateDto.category) {
      // Obtener o crear la nueva categoría principal
      const newMainCategory = await this.categoryService.findByNameOrCreate(
        updateDto.category,
      );

      // Obtener el producto actual con sus categorías
      const currentProduct = await this.productsService.findBySku(sku);

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
    return this.productsService.updateBySku(sku, {
      ...updateDto,
      categoryUuids,
    });
  }

  @Delete(':sku')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @TriggerWebhook(WebhookEvent.PRODUCT_DELETED)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar producto',
    description:
      'Elimina un producto del catálogo por SKU. Requiere permiso WRITE o READ_WRITE. Dispara webhook product.deleted.',
  })
  @ApiParam({
    name: 'sku',
    description: 'SKU único del producto a eliminar',
    example: 'MART-001',
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
  async delete(@Param('sku') sku: string) {
    await this.productsService.removeBySku(sku);
    return { sku, message: 'Product deleted successfully' };
  }

  @Post('images')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Subir o reemplazar imagen de producto',
    description:
      'Sube una imagen para un producto. El nombre del archivo debe tener formato "sku-001" donde sku es el SKU del producto y 001 es el número de orden. Si ya existe una imagen con ese orden, será reemplazada.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen con nombre en formato sku-001',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Archivo de imagen. El nombre debe tener formato sku-001 (ejemplo: MART-001-001.jpg)',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Imagen subida/reemplazada exitosamente',
  })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({
    description: 'Producto no encontrado',
  })
  @ApiStandardResponses()
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const { sku, order } = this.productsService.parseImageName(
      file.originalname,
    );

    return this.productsService.uploadImageBySku(sku, file, order);
  }

  @Delete('images/:imageName')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar imagen de producto por nombre',
    description:
      'Elimina una imagen de un producto usando el nombre en formato "sku-001" donde sku es el SKU del producto y 001 es el número de orden de la imagen.',
  })
  @ApiParam({
    name: 'imageName',
    description: 'Nombre de la imagen en formato sku-orden (ejemplo: MART-001-001)',
    example: 'MART-001-001',
    type: String,
  })
  @ApiOkResponse({
    description: 'Imagen eliminada exitosamente',
    type: SuccessMessageSchema,
  })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({
    description: 'Producto o imagen no encontrada',
  })
  @ApiStandardResponses()
  async deleteImage(@Param('imageName') imageName: string) {
    const { sku, order } = this.productsService.parseImageName(imageName);
    await this.productsService.deleteImageBySku(sku, order);
    return { imageName, message: 'Image deleted successfully' };
  }
}
