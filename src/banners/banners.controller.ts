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
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('uuid') uuid: string) {
    return this.bannersService.remove(uuid);
  }
}
