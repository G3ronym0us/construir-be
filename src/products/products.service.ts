import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
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
    return await this.productsRepository.find({
      where: {
        inventory: MoreThan(0),
      },
    });
  }

  async findOne(uuid: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { uuid } });

    if (!product) {
      throw new NotFoundException(`Product with UUID ${uuid} not found`);
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

  async findBySku(sku: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { sku } });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return product;
  }

  async updateBySku(
    sku: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findBySku(sku);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productsRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct && existingProduct.id !== product.id) {
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

  async removeBySku(sku: string): Promise<void> {
    const product = await this.findBySku(sku);

    // Delete all images from S3 before soft deleting product
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await this.s3Service.deleteFile(image.key);
      }
    }

    await this.productsRepository.softRemove(product);
  }

  async update(
    uuid: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(uuid);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingProduct = await this.productsRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingProduct && existingProduct.uuid !== uuid) {
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

  async remove(uuid: string): Promise<void> {
    const product = await this.findOne(uuid);

    // Delete all images from S3 before soft deleting product
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await this.s3Service.deleteFile(image.key);
      }
    }

    await this.productsRepository.softRemove(product);
  }

  async uploadImage(
    productUuid: string,
    file: Express.Multer.File,
    isPrimary: boolean = false,
    order: number = 0,
  ): Promise<ProductImage> {
    const product = await this.findOne(productUuid);

    const { url, key } = await this.s3Service.uploadFile(file, 'products');

    // If this is primary, unset all other images as primary
    if (isPrimary) {
      await this.productImagesRepository.update(
        { product: { id: product.id } },
        { isPrimary: false },
      );
    }

    const productImage = this.productImagesRepository.create({
      url,
      key,
      isPrimary,
      order,
      product: product,
    });

    return await this.productImagesRepository.save(productImage);
  }

  async deleteImage(imageUuid: string): Promise<void> {
    const image = await this.productImagesRepository.findOne({
      where: { uuid: imageUuid },
    });

    if (!image) {
      throw new NotFoundException(`Image with UUID ${imageUuid} not found`);
    }

    await this.s3Service.deleteFile(image.key);
    await this.productImagesRepository.remove(image);
  }

  async setPrimaryImage(imageUuid: string): Promise<ProductImage> {
    const image = await this.productImagesRepository.findOne({
      where: { uuid: imageUuid },
      relations: { product: true },
    });

    if (!image) {
      throw new NotFoundException(`Image with UUID ${imageUuid} not found`);
    }

    // Unset all other images as primary for this product
    await this.productImagesRepository.update(
      { product: { id: image.product.id } },
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
  ): Promise<{
    data: Product[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.categories', 'categories');

    // Filter out products without stock
    queryBuilder.andWhere('product.inventory > 0');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Category filter by UUID
    if (categoryUuid) {
      queryBuilder.andWhere('categories.uuid = :categoryUuid', {
        categoryUuid,
      });
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
    const published = await this.productsRepository.count({
      where: { published: true },
    });
    const unpublished = await this.productsRepository.count({
      where: { published: false },
    });
    const featured = await this.productsRepository.count({
      where: { featured: true },
    });
    const lowStock = await this.productsRepository.count({
      where: { inventory: 10 },
    });

    return { total, published, unpublished, featured, lowStock };
  }

  async search(query: string): Promise<Product[]> {
    return await this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.inventory > 0')
      .andWhere(
        '(product.name ILIKE :query OR product.sku ILIKE :query OR product.barcode ILIKE :query)',
        { query: `%${query}%` },
      )
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

  async updateInventory(uuid: string, inventory: number): Promise<Product> {
    const product = await this.findOne(uuid);
    product.inventory = inventory;
    return await this.productsRepository.save(product);
  }

  async bulkUpdatePublished(
    uuids: string[],
    published: boolean,
  ): Promise<void> {
    await this.productsRepository.update(uuids, { published });
  }

  async bulkUpdateFeatured(uuids: string[], featured: boolean): Promise<void> {
    await this.productsRepository.update(uuids, { featured });
  }

  /**
   * Parse image name in format "sku-001" to extract SKU and order number
   * Example: "MART-001-002" -> { sku: "MART-001", order: 2 }
   * Example: "ABC123-001" -> { sku: "ABC123", order: 1 }
   */
  parseImageName(imageName: string): { sku: string; order: number } {
    // Remove file extension if present
    const nameWithoutExt = imageName.replace(/\.[^/.]+$/, '');

    // Find the last hyphen followed by digits
    const match = nameWithoutExt.match(/^(.+)-(\d+)$/);

    if (!match) {
      throw new NotFoundException(
        `Invalid image name format: ${imageName}. Expected format: sku-001`,
      );
    }

    const sku = match[1];
    const order = parseInt(match[2], 10);

    return { sku, order };
  }

  /**
   * Find image by product and order number
   */
  async findImageByProductAndOrder(
    productId: number,
    order: number,
  ): Promise<ProductImage | null> {
    return await this.productImagesRepository.findOne({
      where: {
        product: { id: productId },
        order: order,
      },
    });
  }

  /**
   * Upload or replace image by SKU and order number
   * If image with same order exists, replace it; otherwise create new
   */
  async uploadImageBySku(
    sku: string,
    file: Express.Multer.File,
    order: number,
  ): Promise<ProductImage> {
    const product = await this.findBySku(sku);

    // Check if image with this order already exists
    const existingImage = await this.findImageByProductAndOrder(
      product.id,
      order,
    );

    // Upload new file to S3
    const { url, key } = await this.s3Service.uploadFile(file, 'products');

    if (existingImage) {
      // Delete old file from S3
      await this.s3Service.deleteFile(existingImage.key);

      // Update existing image
      existingImage.url = url;
      existingImage.key = key;
      return await this.productImagesRepository.save(existingImage);
    }

    // Create new image
    const isPrimary = order === 1;

    // If this is primary (order 1), unset all other images as primary
    if (isPrimary) {
      await this.productImagesRepository.update(
        { product: { id: product.id } },
        { isPrimary: false },
      );
    }

    const productImage = this.productImagesRepository.create({
      url,
      key,
      isPrimary,
      order,
      product: product,
    });

    return await this.productImagesRepository.save(productImage);
  }

  /**
   * Delete image by SKU and order number
   */
  async deleteImageBySku(sku: string, order: number): Promise<void> {
    const product = await this.findBySku(sku);

    const image = await this.findImageByProductAndOrder(product.id, order);

    if (!image) {
      throw new NotFoundException(
        `Image with order ${order} not found for product ${sku}`,
      );
    }

    await this.s3Service.deleteFile(image.key);
    await this.productImagesRepository.remove(image);
  }
}
