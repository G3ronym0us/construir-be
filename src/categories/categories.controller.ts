import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.create(createCategoryDto, file);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('visible')
  findAllVisible() {
    return this.categoriesService.findAllVisible();
  }

  @Get('featured')
  findFeatured() {
    return this.categoriesService.findFeatured();
  }

  @Get('parents')
  findParentCategories() {
    return this.categoriesService.findParentCategories();
  }

  @Get('parent/:parentUuid/children')
  findChildrenByParent(@Param('parentUuid') parentUuid: string) {
    return this.categoriesService.findChildrenByParentUuid(parentUuid);
  }

  @Get('stats')
  getStats() {
    return this.categoriesService.getStats();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.categoriesService.findByUuid(uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':uuid')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('uuid') uuid: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.update(uuid, updateCategoryDto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':uuid/parent')
  setParent(
    @Param('uuid') uuid: string,
    @Body('parentUuid') parentUuid: string | null,
  ) {
    return this.categoriesService.setParent(uuid, parentUuid);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    this.categoriesService.remove(uuid);
    return { message: 'Category deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':uuid/image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.uploadImage(uuid, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':uuid/image')
  async deleteImage(
    @Param('uuid') uuid: string,
    @Query('confirm') confirm?: string,
  ) {
    const confirmed = confirm === 'true';
    const result = await this.categoriesService.deleteImage(uuid, confirmed);

    if (result.requiresConfirmation) {
      return {
        requiresConfirmation: true,
        message: result.message,
      };
    }

    return {
      message: 'Imagen eliminada exitosamente',
      category: result.category,
    };
  }
}
