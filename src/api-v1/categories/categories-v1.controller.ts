import {
  Controller,
  Get,
  Post,
  Put,
  Param,
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
import { CategoriesService } from '../../categories/categories.service';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { RequireApiKeyPermission } from '../../api-keys/decorators/api-key-permission.decorator';
import { ApiKeyPermission } from '../../api-keys/api-key.entity';
import { WebhookInterceptor } from '../common/interceptors/webhook.interceptor';
import { PaginationLinkInterceptor } from '../common/interceptors/pagination-link.interceptor';
import {
  ApiSecurityAll,
  ApiAuthResponses,
  ApiWritePermissionResponses,
  ApiStandardResponses,
} from '../common/decorators/api-documentation.decorator';
import {
  CreateCategoryForV1Dto,
  UpdateCategoryForV1Dto,
} from '../dtos/categories.dto';

@ApiTags('Categories V1')
@ApiSecurityAll()
@Controller('api/v1/categories')
@UseGuards(ApiKeyGuard)
@UseInterceptors(WebhookInterceptor, PaginationLinkInterceptor)
export class CategoriesV1Controller {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Listar categorías',
    description: 'Retorna todas las categorías registradas en el sistema',
  })
  @ApiOkResponse({ description: 'Listado de categorías obtenido exitosamente' })
  @ApiAuthResponses()
  @ApiStandardResponses()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':externalCode')
  @RequireApiKeyPermission(ApiKeyPermission.READ)
  @ApiOperation({
    summary: 'Obtener categoría por código externo',
    description: 'Retorna una categoría identificada por su código externo',
  })
  @ApiParam({
    name: 'externalCode',
    description: 'Código del sistema externo (ERP)',
    example: '20131',
    type: String,
  })
  @ApiOkResponse({ description: 'Categoría encontrada exitosamente' })
  @ApiAuthResponses()
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiStandardResponses()
  async findOne(@Param('externalCode') externalCode: string) {
    return this.categoriesService.findByExternalCode(externalCode);
  }

  @Post()
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear categoría',
    description:
      'Crea una nueva categoría con su código externo. Requiere permiso WRITE o READ_WRITE.',
  })
  @ApiCreatedResponse({ description: 'Categoría creada exitosamente' })
  @ApiWritePermissionResponses()
  @ApiStandardResponses()
  async create(@Body() createDto: CreateCategoryForV1Dto) {
    const slug = createDto.name.trim().toLowerCase().replace(/\s+/g, '-');
    return this.categoriesService.create(
      {
        name: createDto.name,
        slug,
        description: createDto.description,
        externalCode: createDto.externalCode,
      },
      undefined,
      true,
    );
  }

  @Put(':externalCode')
  @RequireApiKeyPermission(ApiKeyPermission.WRITE)
  @ApiOperation({
    summary: 'Actualizar categoría por código externo',
    description:
      'Actualiza nombre y/o descripción de una categoría por su código externo. Requiere permiso WRITE o READ_WRITE.',
  })
  @ApiParam({
    name: 'externalCode',
    description: 'Código del sistema externo (ERP)',
    example: '20131',
    type: String,
  })
  @ApiOkResponse({ description: 'Categoría actualizada exitosamente' })
  @ApiWritePermissionResponses()
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiStandardResponses()
  async update(
    @Param('externalCode') externalCode: string,
    @Body() updateDto: UpdateCategoryForV1Dto,
  ) {
    return this.categoriesService.updateByExternalCode(externalCode, {
      name: updateDto.name,
      description: updateDto.description,
    });
  }
}
