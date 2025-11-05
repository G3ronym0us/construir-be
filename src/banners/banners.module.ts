import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { Banner } from './banner.entity';
import { ImageProcessingService } from './image-processing.service';
import { S3Service } from '../products/s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  controllers: [BannersController],
  providers: [BannersService, ImageProcessingService, S3Service],
  exports: [BannersService, ImageProcessingService],
})
export class BannersModule {}
