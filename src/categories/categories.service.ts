import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { S3Service } from '../products/s3.service';
import { ImageProcessingService } from '../banners/image-processing.service';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private s3Service: S3Service,
    private imageProcessingService: ImageProcessingService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    file: Express.Multer.File,
  ): Promise<Category> {
    const existingCategory = await this.categoriesRepository.findOne({
      where: [
        { name: createCategoryDto.name },
        { slug: createCategoryDto.slug },
      ],
    });

    if (existingCategory) {
      throw new ConflictException('Category name or slug already exists');
    }

    const category = this.categoriesRepository.create(createCategoryDto);

    if (file) {
      const imageUrl = await this.processCategoryImage(file);
      category.image = imageUrl;
    }

    return await this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findAllActive(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByUuid(uuid: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { uuid } });

    if (!category) {
      throw new NotFoundException(`Category with UUID ${uuid} not found`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { slug } });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async update(
    uuid: string,
    updateCategoryDto: UpdateCategoryDto,
    file: Express.Multer.File,
  ): Promise<Category> {
    const category = await this.findByUuid(uuid);
    const oldImageUrl = category.image;

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory && existingCategory.uuid !== uuid) {
        throw new ConflictException('Category name already exists');
      }
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoriesRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory && existingCategory.uuid !== uuid) {
        throw new ConflictException('Category slug already exists');
      }
    }

    if (file) {
      const newImageUrl = await this.processCategoryImage(file);
      category.image = newImageUrl;

      if (oldImageUrl) {
        const oldImageKey = this.extractKeyFromUrl(oldImageUrl);
        if (oldImageKey) {
          await this.s3Service.deleteFile(oldImageKey);
        }
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async remove(uuid: string): Promise<void> {
    const category = await this.findByUuid(uuid);

    if (category.image) {
      const imageKey = this.extractKeyFromUrl(category.image);
      if (imageKey) {
        await this.s3Service.deleteFile(imageKey);
      }
    }

    await this.categoriesRepository.softRemove(category);
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const total = await this.categoriesRepository.count();
    const active = await this.categoriesRepository.count({ where: { isActive: true } });
    const inactive = await this.categoriesRepository.count({ where: { isActive: false } });

    return { total, active, inactive };
  }

  private async processCategoryImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const isValid = await this.imageProcessingService.validateImage(file.buffer);
    if (!isValid) {
      throw new BadRequestException('Invalid image file');
    }

    const baseFileName = `${uuidv4()}-category`;

    // Procesar a WebP
    const webpBuffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const webpResult = await this.s3Service.uploadFile(
      webpBuffer,
      'categories',
      `categories/${baseFileName}.webp`,
      'image/webp',
    );

    return webpResult.url;
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
