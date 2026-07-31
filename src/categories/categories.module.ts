import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './category.entity';
import { Banner } from '../banners/banner.entity';
import { BannersModule } from '../banners/banners.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    // Banner es de solo lectura acá: alimenta el "dónde se usa hoy" de una
    // categoría con los banners vigentes que la enlazan.
    TypeOrmModule.forFeature([Category, Banner]),
    BannersModule,
    ProductsModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
