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
  ParseIntPipe,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('admin/paginated')
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categoryUuid') categoryUuid?: string,
    @Query('published') published?: string,
    @Query('featured') featured?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.productsService.findAllPaginated(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      categoryUuid,
      published !== undefined ? published === 'true' : undefined,
      featured !== undefined ? featured === 'true' : undefined,
      sortBy || 'createdAt',
      sortOrder || 'DESC',
    );
  }

  @Get('admin/stats')
  getStats() {
    return this.productsService.getStats();
  }

  @Get('admin/low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.productsService.getLowStock(
      threshold ? parseInt(threshold) : 10,
    );
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.productsService.search(query);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.productsService.findOne(uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':uuid')
  update(
    @Param('uuid') uuid: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(uuid, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    this.productsService.remove(uuid);
    return { message: 'Product deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':uuid/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('isPrimary') isPrimary?: string,
    @Query('order') order?: string,
  ) {
    const isPrimaryBool = isPrimary === 'true';
    const orderNum = order ? parseInt(order) : 0;

    return this.productsService.uploadImage(
      uuid,
      file,
      isPrimaryBool,
      orderNum,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('images/:imageUuid')
  async deleteImage(@Param('imageUuid') imageUuid: string) {
    await this.productsService.deleteImage(imageUuid);
    return { message: 'Image deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('images/:imageUuid/primary')
  async setPrimaryImage(@Param('imageUuid') imageUuid: string) {
    return this.productsService.setPrimaryImage(imageUuid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':uuid/inventory')
  async updateInventory(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body('inventory') inventory: number,
  ) {
    return this.productsService.updateInventory(uuid, inventory);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/publish')
  async bulkUpdatePublished(
    @Body('uuids') uuids: string[],
    @Body('published') published: boolean,
  ) {
    await this.productsService.bulkUpdatePublished(uuids, published);
    return { message: `${uuids.length} products updated successfully` };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/feature')
  async bulkUpdateFeatured(
    @Body('uuids') uuids: string[],
    @Body('featured') featured: boolean,
  ) {
    await this.productsService.bulkUpdateFeatured(uuids, featured);
    return { message: `${uuids.length} products updated successfully` };
  }
}
