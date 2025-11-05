import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'desktopImage', maxCount: 1 },
      { name: 'tabletImage', maxCount: 1 },
      { name: 'mobileImage', maxCount: 1 },
    ]),
  )
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
      tabletImage?: Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ) {
    return this.bannersService.create(createBannerDto, files);
  }

  @Get()
  findAll() {
    return this.bannersService.findAll();
  }

  @Get('active')
  findActive() {
    return this.bannersService.findActive();
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.bannersService.findOne(uuid);
  }

  @Patch(':uuid')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'desktopImage', maxCount: 1 },
      { name: 'tabletImage', maxCount: 1 },
      { name: 'mobileImage', maxCount: 1 },
    ]),
  )
  update(
    @Param('uuid') uuid: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFiles()
    files?: {
      image?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
      tabletImage?: Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ) {
    return this.bannersService.update(uuid, updateBannerDto, files);
  }

  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    return this.bannersService.remove(uuid);
  }
}
