import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
    file?: Express.Multer.File,
    isMain?: boolean,
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

    const category = this.categoriesRepository.create({
      ...createCategoryDto,
      isMain,
    });

    if (file) {
      const imageUrl = await this.processCategoryImage(file);
      category.image = imageUrl;
    }

    return await this.categoriesRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      relations: {
        parent: true,
        childrens: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findAllVisible(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { visible: true },
      relations: {
        parent: true,
        childrens: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findParentCategories(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { parent: IsNull() },
      relations: {
        childrens: true,
      },
      order: { name: 'ASC' },
    });
  }

  async findChildrenByParentUuid(parentUuid: string): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { parent: { uuid: parentUuid } },
      order: { name: 'ASC' },
    });
  }

  async setParent(
    childUuid: string,
    parentUuid: string | null,
  ): Promise<Category> {
    const child = await this.findByUuid(childUuid);

    if (parentUuid) {
      const parent = await this.findByUuid(parentUuid);

      // Validar que el parent no sea una subcategoría
      if (parent.parent) {
        throw new BadRequestException(
          'Cannot assign a subcategory as parent. Only root categories can be parents.',
        );
      }

      // Validar que no se esté intentando asignar a sí mismo
      if (child.id === parent.id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      child.parent = parent;
    } else {
      child.parent = null;
    }

    return await this.categoriesRepository.save(child);
  }

  async findFeatured(): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: {
        visible: true,
        isFeatured: true,
      },
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
    const category = await this.categoriesRepository.findOne({
      where: { uuid },
    });

    if (!category) {
      throw new NotFoundException(`Category with UUID ${uuid} not found`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async findByNameOrCreate(name: string): Promise<Category> {
    const category = await this.categoriesRepository
      .createQueryBuilder('category')
      .where('name ILIKE :name', { name })
      .getOne();
    if (!category)
      return this.create(
        { name, slug: name.trim().toLowerCase().replace(' ', '-') },
        undefined,
        true,
      );
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
    visible: number;
    hidden: number;
  }> {
    const total = await this.categoriesRepository.count();
    const visible = await this.categoriesRepository.count({
      where: { visible: true },
    });
    const hidden = await this.categoriesRepository.count({
      where: { visible: false },
    });

    return { total, visible, hidden };
  }

  private async processCategoryImage(
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const isValid = await this.imageProcessingService.validateImage(
      file.buffer,
    );
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
