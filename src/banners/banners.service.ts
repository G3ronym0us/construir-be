import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner, BannerImageVariants } from './banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { S3Service } from '../products/s3.service';
import { ImageProcessingService } from './image-processing.service';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
    private s3Service: S3Service,
    private imageProcessingService: ImageProcessingService,
  ) {}

  async create(
    createBannerDto: CreateBannerDto,
    files: {
      image?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
      tabletImage?: Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ): Promise<Banner> {
    const images = await this.processImagesHybrid(files);

    const banner = this.bannerRepository.create(createBannerDto);
    banner.images = images;
    banner.startDate = createBannerDto.startDate ? new Date(createBannerDto.startDate) : undefined;
    banner.endDate = createBannerDto.endDate ? new Date(createBannerDto.endDate) : undefined;

    return (await this.bannerRepository.save(banner)) as unknown as Banner;
  }

  async findAll(): Promise<Banner[]> {
    return await this.bannerRepository.find({
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Banner[]> {
    const now = new Date();

    return await this.bannerRepository
      .createQueryBuilder('banner')
      .where('banner.isActive = :isActive', { isActive: true })
      .andWhere(
        '(banner.startDate IS NULL OR banner.startDate <= :now)',
        { now },
      )
      .andWhere(
        '(banner.endDate IS NULL OR banner.endDate >= :now)',
        { now },
      )
      .orderBy('banner.priority', 'DESC')
      .addOrderBy('banner.createdAt', 'DESC')
      .getMany();
  }

  async findOne(uuid: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { uuid } });
    if (!banner) {
      throw new NotFoundException(`Banner with UUID ${uuid} not found`);
    }
    return banner;
  }

  async update(
    uuid: string,
    updateBannerDto: UpdateBannerDto,
    files?: {
      image?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
      tabletImage?: Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ): Promise<Banner> {
    const banner = await this.findOne(uuid);

    // Si se proporcionan archivos, procesar imágenes
    if (files && (files.image || files.desktopImage || files.tabletImage || files.mobileImage)) {
      // Guardar imágenes antiguas para eliminar
      const oldImages = { ...banner.images };

      const newImages = await this.processImagesHybridForUpdate(banner.images, files);

      // Eliminar SOLO las imágenes antiguas que fueron reemplazadas
      await this.deleteOldImages(oldImages, newImages);

      banner.images = newImages;
    }

    // Actualizar datos del banner
    Object.assign(banner, updateBannerDto);

    if (updateBannerDto.startDate) {
      banner.startDate = new Date(updateBannerDto.startDate);
    }
    if (updateBannerDto.endDate) {
      banner.endDate = new Date(updateBannerDto.endDate);
    }

    return (await this.bannerRepository.save(banner)) as unknown as Banner;
  }

  async remove(uuid: string): Promise<void> {
    const banner = await this.findOne(uuid);

    // Delete images from S3
    await this.deleteBannerImages(banner.images);

    // Soft delete banner
    await this.bannerRepository.softRemove(banner);
  }

  /**
   * LÓGICA HÍBRIDA INTELIGENTE
   * Procesa imágenes según lo que se envíe:
   * 1. Solo `image` → generar desktop, tablet, mobile desde la imagen general
   * 2. Solo imágenes individuales (desktop, tablet, mobile) → usar las proporcionadas
   * 3. Híbrido: `image` + algunas individuales → generar las faltantes desde `image`, usar las individuales proporcionadas
   */
  private async processImagesHybrid(files: {
    image?: Express.Multer.File[];
    desktopImage?: Express.Multer.File[];
    tabletImage?: Express.Multer.File[];
    mobileImage?: Express.Multer.File[];
  }): Promise<BannerImageVariants> {
    const hasGeneralImage = files.image && files.image[0];
    const hasDesktop = files.desktopImage && files.desktopImage[0];
    const hasTablet = files.tabletImage && files.tabletImage[0];
    const hasMobile = files.mobileImage && files.mobileImage[0];

    // Validación: debe haber al menos una imagen
    if (!hasGeneralImage && !hasDesktop && !hasTablet && !hasMobile) {
      throw new BadRequestException('Debe proporcionar al menos una imagen');
    }

    let desktop: { webp: string; jpeg: string };
    let tablet: { webp: string; jpeg: string };
    let mobile: { webp: string; jpeg: string };

    // Si hay imagen general, procesarla primero
    let processedGeneral: any = null;
    if (hasGeneralImage) {
      processedGeneral = await this.imageProcessingService.processBannerImage(files.image![0].buffer);
    }

    // Desktop: usar individual si existe, sino usar de la general
    if (hasDesktop) {
      this.logger.log('Using custom desktop image');
      desktop = await this.processSingleDeviceImage(files.desktopImage![0], 'desktop');
    } else if (processedGeneral) {
      this.logger.log('Generating desktop from general image');
      desktop = await this.uploadProcessedVariant(processedGeneral.desktop, 'desktop');
    } else {
      throw new BadRequestException('Falta imagen para desktop');
    }

    // Tablet: usar individual si existe, sino usar de la general
    if (hasTablet) {
      this.logger.log('Using custom tablet image');
      tablet = await this.processSingleDeviceImage(files.tabletImage![0], 'tablet');
    } else if (processedGeneral) {
      this.logger.log('Generating tablet from general image');
      tablet = await this.uploadProcessedVariant(processedGeneral.tablet, 'tablet');
    } else {
      throw new BadRequestException('Falta imagen para tablet');
    }

    // Mobile: usar individual si existe, sino usar de la general
    if (hasMobile) {
      this.logger.log('Using custom mobile image');
      mobile = await this.processSingleDeviceImage(files.mobileImage![0], 'mobile');
    } else if (processedGeneral) {
      this.logger.log('Generating mobile from general image');
      mobile = await this.uploadProcessedVariant(processedGeneral.mobile, 'mobile');
    } else {
      throw new BadRequestException('Falta imagen para mobile');
    }

    return { desktop, tablet, mobile };
  }

  /**
   * Procesa imágenes para actualización
   * Solo actualiza las imágenes que se proporcionaron
   */
  private async processImagesHybridForUpdate(
    currentImages: BannerImageVariants,
    files: {
      image?: Express.Multer.File[];
      desktopImage?: Express.Multer.File[];
      tabletImage?: Express.Multer.File[];
      mobileImage?: Express.Multer.File[];
    },
  ): Promise<BannerImageVariants> {
    let processedGeneral: any = null;
    let desktop = currentImages.desktop;
    let tablet = currentImages.tablet;
    let mobile = currentImages.mobile;

    // 1. Primero procesar la imagen general si existe (para usarla como base)
    if (files.image && files.image[0]) {
      this.logger.log('Processing general image for variants');
      processedGeneral = await this.imageProcessingService.processBannerImage(files.image[0].buffer);

      // Generar todas las variantes desde la imagen general
      desktop = await this.uploadProcessedVariant(processedGeneral.desktop, 'desktop');
      tablet = await this.uploadProcessedVariant(processedGeneral.tablet, 'tablet');
      mobile = await this.uploadProcessedVariant(processedGeneral.mobile, 'mobile');
    }

    // 2. Sobrescribir con imágenes individuales si se proporcionaron (tienen prioridad)
    if (files.desktopImage && files.desktopImage[0]) {
      this.logger.log('Overriding desktop with custom image');
      desktop = await this.processSingleDeviceImage(files.desktopImage[0], 'desktop');
    }

    if (files.tabletImage && files.tabletImage[0]) {
      this.logger.log('Overriding tablet with custom image');
      tablet = await this.processSingleDeviceImage(files.tabletImage[0], 'tablet');
    }

    if (files.mobileImage && files.mobileImage[0]) {
      this.logger.log('Overriding mobile with custom image');
      mobile = await this.processSingleDeviceImage(files.mobileImage[0], 'mobile');
    }

    // 3. Si no hay imagen general, usar la primera individual disponible como base
    if (!files.image || !files.image[0]) {
      if (files.desktopImage && files.desktopImage[0]) {
        this.logger.log('Using desktop as base for missing variants');
        processedGeneral = await this.imageProcessingService.processBannerImage(files.desktopImage[0].buffer);
      } else if (files.tabletImage && files.tabletImage[0]) {
        this.logger.log('Using tablet as base for missing variants');
        processedGeneral = await this.imageProcessingService.processBannerImage(files.tabletImage[0].buffer);
      } else if (files.mobileImage && files.mobileImage[0]) {
        this.logger.log('Using mobile as base for missing variants');
        processedGeneral = await this.imageProcessingService.processBannerImage(files.mobileImage[0].buffer);
      }

      // Generar las variantes faltantes
      if (processedGeneral) {
        if (!files.desktopImage || !files.desktopImage[0]) {
          this.logger.log('Generating desktop from base image');
          desktop = await this.uploadProcessedVariant(processedGeneral.desktop, 'desktop');
        }
        if (!files.tabletImage || !files.tabletImage[0]) {
          this.logger.log('Generating tablet from base image');
          tablet = await this.uploadProcessedVariant(processedGeneral.tablet, 'tablet');
        }
        if (!files.mobileImage || !files.mobileImage[0]) {
          this.logger.log('Generating mobile from base image');
          mobile = await this.uploadProcessedVariant(processedGeneral.mobile, 'mobile');
        }
      }
    }

    return { desktop, tablet, mobile };
  }

  /**
   * Procesa una imagen individual para un dispositivo específico
   */
  private async processSingleDeviceImage(
    file: Express.Multer.File,
    device: 'desktop' | 'tablet' | 'mobile',
  ): Promise<{ webp: string; jpeg: string }> {
    const dimensions = {
      desktop: { width: 1920, height: 600 },
      tablet: { width: 1024, height: 400 },
      mobile: { width: 640, height: 400 },
    };

    const { width, height } = dimensions[device];
    const baseFileName = `${uuidv4()}-${device}`;

    // Procesar WebP
    const webpBuffer = await sharp(file.buffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer();

    const webpResult = await this.s3Service.uploadFile(
      webpBuffer,
      'banners',
      `banners/${baseFileName}.webp`,
      'image/webp',
    );

    // Procesar JPEG
    const jpegBuffer = await sharp(file.buffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const jpegResult = await this.s3Service.uploadFile(
      jpegBuffer,
      'banners',
      `banners/${baseFileName}.jpg`,
      'image/jpeg',
    );

    return { webp: webpResult.url, jpeg: jpegResult.url };
  }

  /**
   * Sube una variante ya procesada (Buffer) a S3
   */
  private async uploadProcessedVariant(
    processedVariant: { webp: Buffer; jpeg: Buffer },
    device: 'desktop' | 'tablet' | 'mobile',
  ): Promise<{ webp: string; jpeg: string }> {
    const baseFileName = `${uuidv4()}-${device}`;

    const webpResult = await this.s3Service.uploadFile(
      processedVariant.webp,
      'banners',
      `banners/${baseFileName}.webp`,
      'image/webp',
    );

    const jpegResult = await this.s3Service.uploadFile(
      processedVariant.jpeg,
      'banners',
      `banners/${baseFileName}.jpg`,
      'image/jpeg',
    );

    return { webp: webpResult.url, jpeg: jpegResult.url };
  }

  /**
   * Elimina SOLO las imágenes antiguas del banner original
   * No elimina las nuevas que acabamos de crear
   */
  private async deleteOldImages(
    oldImages: BannerImageVariants,
    newImages: BannerImageVariants,
  ): Promise<void> {
    const deletePromises: Promise<void>[] = [];

    // Solo eliminar las URLs antiguas que cambiaron
    for (const device of ['desktop', 'tablet', 'mobile'] as const) {
      for (const format of ['webp', 'jpeg'] as const) {
        const oldUrl = oldImages[device][format];
        const newUrl = newImages[device][format];

        // Si cambió la URL Y la antigua existe, eliminar SOLO la antigua
        if (oldUrl && oldUrl !== newUrl) {
          const key = this.extractKeyFromUrl(oldUrl);
          if (key) {
            this.logger.log(`Deleting old ${device} ${format}: ${key}`);
            deletePromises.push(this.s3Service.deleteFile(key));
          }
        }
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      this.logger.log(`Deleted ${deletePromises.length} old images from S3`);
    }
  }

  /**
   * Elimina todas las imágenes de un banner
   */
  private async deleteBannerImages(images: BannerImageVariants): Promise<void> {
    const deletePromises: Promise<void>[] = [];

    for (const size of ['desktop', 'tablet', 'mobile'] as const) {
      for (const format of ['webp', 'jpeg'] as const) {
        const url = images[size][format];
        const key = this.extractKeyFromUrl(url);
        if (key) {
          deletePromises.push(this.s3Service.deleteFile(key));
        }
      }
    }

    await Promise.all(deletePromises);
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
      return null;
    }
  }
}
