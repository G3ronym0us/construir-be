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
    return this.productsService.getLowStock(threshold ? parseInt(threshold) : 10);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.productsService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    this.productsService.remove(+id);
    return { message: 'Product deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Query('isPrimary') isPrimary?: string,
    @Query('order') order?: string,
  ) {
    const isPrimaryBool = isPrimary === 'true';
    const orderNum = order ? parseInt(order) : 0;

    return this.productsService.uploadImage(id, file, isPrimaryBool, orderNum);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('images/:imageId')
  async deleteImage(@Param('imageId', ParseIntPipe) imageId: number) {
    await this.productsService.deleteImage(imageId);
    return { message: 'Image deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('images/:imageId/primary')
  async setPrimaryImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.productsService.setPrimaryImage(imageId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/inventory')
  async updateInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body('inventory') inventory: number,
  ) {
    return this.productsService.updateInventory(id, inventory);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/publish')
  async bulkUpdatePublished(
    @Body('ids') ids: number[],
    @Body('published') published: boolean,
  ) {
    await this.productsService.bulkUpdatePublished(ids, published);
    return { message: `${ids.length} products updated successfully` };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/feature')
  async bulkUpdateFeatured(
    @Body('ids') ids: number[],
    @Body('featured') featured: boolean,
  ) {
    await this.productsService.bulkUpdateFeatured(ids, featured);
    return { message: `${ids.length} products updated successfully` };
  }
}
