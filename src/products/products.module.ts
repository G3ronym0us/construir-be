import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { Category } from '../categories/category.entity';
import { S3Service } from './s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage, Category])],
  controllers: [ProductsController],
  providers: [ProductsService, S3Service],
  exports: [ProductsService, S3Service],
})
export class ProductsModule {}
