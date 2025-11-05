import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { Category } from '../categories/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { S3Service } from './s3.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private s3Service: S3Service,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const existingProduct = await this.productsRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException('SKU already exists');
    }

    const { categoryUuids, ...productData } = createProductDto;
    const product = this.productsRepository.create(productData);

    if (categoryUuids && categoryUuids.length > 0) {
      const categories = await this.categoriesRepository.findBy({
        uuid: In(categoryUuids),
      });

      if (categories.length !== categoryUuids.length) {
        throw new NotFoundException('One or more categories not found');
      }

      product.categories = categories;
    }

    return await this.productsRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return await this.productsRepository.find();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findByUuid(uuid: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { uuid } });

    if (!product) {
      throw new NotFoundException(`Product with UUID ${uuid} not found`);
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productsRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException('SKU already exists');
      }
    }

    const { categoryUuids, ...productData } = updateProductDto;
    Object.assign(product, productData);

    if (categoryUuids && categoryUuids.length > 0) {
      const categories = await this.categoriesRepository.findBy({
        uuid: In(categoryUuids),
      });

      if (categories.length !== categoryUuids.length) {
        throw new NotFoundException('One or more categories not found');
      }

      product.categories = categories;
    }

    return await this.productsRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);

    // Delete all images from S3 before soft deleting product
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await this.s3Service.deleteFile(image.key);
      }
    }

    await this.productsRepository.softRemove(product);
  }

  async uploadImage(
    productId: number,
    file: Express.Multer.File,
    isPrimary: boolean = false,
    order: number = 0,
  ): Promise<ProductImage> {
    const product = await this.findOne(productId);

    const { url, key } = await this.s3Service.uploadFile(file, 'products');

    // If this is primary, unset all other images as primary
    if (isPrimary) {
      await this.productImagesRepository.update(
        { productId },
        { isPrimary: false },
      );
    }

    const productImage = this.productImagesRepository.create({
      url,
      key,
      isPrimary,
      order,
      productId: product.id,
    });

    return await this.productImagesRepository.save(productImage);
  }

  async deleteImage(imageId: number): Promise<void> {
    const image = await this.productImagesRepository.findOne({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    await this.s3Service.deleteFile(image.key);
    await this.productImagesRepository.remove(image);
  }

  async setPrimaryImage(imageId: number): Promise<ProductImage> {
    const image = await this.productImagesRepository.findOne({
      where: { id: imageId },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    // Unset all other images as primary for this product
    await this.productImagesRepository.update(
      { productId: image.productId },
      { isPrimary: false },
    );

    image.isPrimary = true;
    return await this.productImagesRepository.save(image);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string,
    categoryUuid?: string,
    published?: boolean,
    featured?: boolean,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{ data: Product[]; total: number; page: number; lastPage: number }> {
    const queryBuilder = this.productsRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.categories', 'categories');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Category filter by UUID
    if (categoryUuid) {
      queryBuilder.andWhere('categories.uuid = :categoryUuid', { categoryUuid });
    }

    // Published filter
    if (published !== undefined) {
      queryBuilder.andWhere('product.published = :published', { published });
    }

    // Featured filter
    if (featured !== undefined) {
      queryBuilder.andWhere('product.featured = :featured', { featured });
    }

    // Sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getStats(): Promise<{
    total: number;
    published: number;
    unpublished: number;
    featured: number;
    lowStock: number;
  }> {
    const total = await this.productsRepository.count();
    const published = await this.productsRepository.count({ where: { published: true } });
    const unpublished = await this.productsRepository.count({ where: { published: false } });
    const featured = await this.productsRepository.count({ where: { featured: true } });
    const lowStock = await this.productsRepository.count({
      where: { inventory: 10 } as any
    });

    return { total, published, unpublished, featured, lowStock };
  }


  async search(query: string): Promise<Product[]> {
    return await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.name ILIKE :query', { query: `%${query}%` })
      .orWhere('product.sku ILIKE :query', { query: `%${query}%` })
      .orWhere('product.barcode ILIKE :query', { query: `%${query}%` })
      .take(20)
      .getMany();
  }

  async getLowStock(threshold: number = 10): Promise<Product[]> {
    return await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.inventory <= :threshold', { threshold })
      .andWhere('product.inventory > 0')
      .orderBy('product.inventory', 'ASC')
      .getMany();
  }

  async updateInventory(id: number, inventory: number): Promise<Product> {
    const product = await this.findOne(id);
    product.inventory = inventory;
    return await this.productsRepository.save(product);
  }

  async bulkUpdatePublished(ids: number[], published: boolean): Promise<void> {
    await this.productsRepository.update(ids, { published });
  }

  async bulkUpdateFeatured(ids: number[], featured: boolean): Promise<void> {
    await this.productsRepository.update(ids, { featured });
  }
}
