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
import { Banner } from '../banners/banner.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { S3Service } from '../products/s3.service';
import { ImageProcessingService } from '../banners/image-processing.service';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

/**
 * Cuántas categorías caben en la franja de destacadas de la portada. El
 * admin muestra el cupo ("6 / 8 espacios") y bloquea la novena, así que el
 * número tiene que ser el mismo en los dos lados.
 */
export const FEATURED_SLOTS = 8;

/** Categoría con los conteos que el listado del admin muestra por fila. */
export interface CategoryWithCounts extends Category {
  productCount: number;
  publishedProductCount: number;
}

/** Atajos por problema de la barra de filtros del listado. */
export type CategoryListFilter = 'parents' | 'no-image' | 'hidden';

export interface CategoryStats {
  total: number;
  visible: number;
  hidden: number;
  parents: number;
  children: number;
  featured: number;
  featuredSlots: number;
  featuredWithoutImage: number;
  withoutImage: number;
  hiddenWithPublishedProducts: number;
}

/** Dónde se usa hoy una categoría, para la edición y el modal de eliminado. */
export interface CategoryUsage {
  menuPosition: number | null;
  menuTotal: number;
  featuredSlot: number | null;
  featuredSlots: number;
  activeBanners: number;
  publishedProducts: number;
  totalProducts: number;
  children: {
    uuid: string;
    name: string;
    slug: string;
    productCount: number;
  }[];
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Banner)
    private bannersRepository: Repository<Banner>,
    private s3Service: S3Service,
    private imageProcessingService: ImageProcessingService,
  ) {}

  private validateFeaturedCategoryImage(
    isFeatured: boolean,
    hasImage: boolean,
  ): void {
    if (isFeatured && !hasImage) {
      throw new BadRequestException(
        'Las categorías destacadas deben tener una imagen asociada',
      );
    }
  }

  async create(
    createCategoryDto: CreateCategoryDto,
    file?: Express.Multer.File,
    isMain?: boolean,
  ): Promise<Category> {
    const existingCategory = await this.categoriesRepository.findOne({
      where: [
        { name: createCategoryDto.name },
        { slug: createCategoryDto.slug },
        { externalCode: createCategoryDto.externalCode },
      ],
    });

    if (existingCategory) {
      throw new ConflictException('Category name or slug already exists');
    }

    const category = this.categoriesRepository.create({
      ...createCategoryDto,
      isMain,
    });

    // Validar que las categorías destacadas tengan imagen y cupo libre
    this.validateFeaturedCategoryImage(
      createCategoryDto.isFeatured || false,
      !!file,
    );
    if (createCategoryDto.isFeatured) {
      await this.assertFeaturedSlotAvailable();
    }

    if (file) {
      const { url, key } = await this.processCategoryImage(file);
      category.image = url;
      category.imageKey = key;
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

  /**
   * Listado del admin: árbol paginado con el conteo de productos por fila.
   *
   * Se resuelve en memoria a propósito. El catálogo tiene decenas de
   * categorías (la tienda ya carga `findAll()` entero para armar el menú) y
   * tanto el orden en árbol —cada hija pegada a su padre— como los filtros
   * "solo padres" necesitan conocer la jerarquía completa, cosa que una
   * consulta paginada plana no puede dar.
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
    search?: string,
    filter?: CategoryListFilter,
  ): Promise<{
    data: CategoryWithCounts[];
    total: number;
    page: number;
    limit: number;
  }> {
    const categories = await this.findAllWithCounts();

    const matching = categories
      .filter((category) => this.matchesSearch(category, search))
      .filter((category) => this.matchesFilter(category, filter));

    const ordered = this.sortAsTree(matching);
    const offset = (page - 1) * limit;

    return {
      data: ordered.slice(offset, offset + limit),
      total: ordered.length,
      page,
      limit,
    };
  }

  /** Todas las categorías con su jerarquía y sus conteos de productos. */
  private async findAllWithCounts(): Promise<CategoryWithCounts[]> {
    const [categories, counts] = await Promise.all([
      this.categoriesRepository.find({
        relations: { parent: true, childrens: true },
        order: { name: 'ASC' },
      }),
      this.countProductsByCategory(),
    ]);

    return categories.map((category) =>
      Object.assign(category, {
        productCount: counts.get(category.id)?.total ?? 0,
        publishedProductCount: counts.get(category.id)?.published ?? 0,
      }),
    );
  }

  /**
   * Productos por categoría en una sola consulta. Cuenta los asignados
   * directamente: los de las subcategorías se ven en la fila de cada hija.
   */
  private async countProductsByCategory(): Promise<
    Map<number, { total: number; published: number }>
  > {
    const rows = await this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.deleted_at IS NULL')
      .select('category.id', 'categoryId')
      .addSelect('COUNT(product.id)', 'total')
      .addSelect(
        'COUNT(product.id) FILTER (WHERE product.published)',
        'published',
      )
      .groupBy('category.id')
      .getRawMany<{ categoryId: number; total: string; published: string }>();

    return new Map(
      rows.map((row) => [
        Number(row.categoryId),
        {
          total: Number(row.total),
          published: Number(row.published),
        },
      ]),
    );
  }

  /** El buscador acepta el nombre oficial, el de tienda y el slug. */
  private matchesSearch(category: Category, search?: string): boolean {
    if (!search) return true;

    const needle = search.trim().toLowerCase();
    if (!needle) return true;

    return [category.name, category.customName, category.slug].some(
      (field) => !!field && field.toLowerCase().includes(needle),
    );
  }

  private matchesFilter(
    category: Category,
    filter?: CategoryListFilter,
  ): boolean {
    switch (filter) {
      case 'parents':
        return !category.parent;
      case 'no-image':
        return !category.image;
      case 'hidden':
        return !category.visible;
      default:
        return true;
    }
  }

  /**
   * Ordena para que cada hija caiga justo debajo de su padre: primero por el
   * nombre del grupo (el del padre, o el propio si es raíz), después el padre
   * antes que sus hijas y por último alfabético dentro del grupo.
   */
  private sortAsTree<T extends Category>(categories: T[]): T[] {
    return [...categories].sort((a, b) => {
      const groupA = a.parent?.name ?? a.name;
      const groupB = b.parent?.name ?? b.name;
      if (groupA !== groupB) return groupA.localeCompare(groupB);

      const depthA = a.parent ? 1 : 0;
      const depthB = b.parent ? 1 : 0;
      if (depthA !== depthB) return depthA - depthB;

      return a.name.localeCompare(b.name);
    });
  }

  async findAllVisible(): Promise<Category[]> {
    return await this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.childrens', 'childrens')
      .innerJoin('category.products', 'product')
      .where('category.visible = :visible', { visible: true })
      .orderBy('category.name', 'ASC')
      .distinct(true)
      .getMany();
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
    // Con las relaciones: la edición del admin necesita saber quién es el
    // padre y si tiene subcategorías para decidir si el campo se puede mover.
    const category = await this.categoriesRepository.findOne({
      where: { uuid },
      relations: { parent: true, childrens: true },
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

  async findByExternalCode(externalCode: string): Promise<Category> {
    const trimmed = externalCode.trim();
    const category = await this.categoriesRepository.findOne({
      where: { externalCode: trimmed },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with external code "${trimmed}" not found`,
      );
    }
    return category;
  }

  async updateByExternalCode(
    externalCode: string,
    dto: { name?: string; description?: string },
  ): Promise<Category> {
    const category = await this.findByExternalCode(externalCode);
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    return this.categoriesRepository.save(category);
  }

  async findByNameOrCreate(name: string): Promise<Category> {
    const trimmed = name.trim();
    const category = await this.categoriesRepository
      .createQueryBuilder('category')
      .where('name ILIKE :name', { name: trimmed })
      .getOne();
    if (!category)
      return this.create(
        { name: trimmed, slug: trimmed.toLowerCase().replace(/\s+/g, '-') },
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

    if (category.externalCode && updateCategoryDto.name !== undefined) {
      throw new BadRequestException(
        'El nombre de categorías sincronizadas desde el ERP no puede modificarse. Use customName para mostrar un nombre alternativo.',
      );
    }

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
      const { url, key } = await this.processCategoryImage(file);
      category.image = url;
      category.imageKey = key;

      if (oldImageUrl) {
        const oldImageKey =
          category.imageKey || this.extractKeyFromUrl(oldImageUrl);
        if (oldImageKey) {
          await this.s3Service.deleteFile(oldImageKey);
        }
      }
    }

    // Validar categoría destacada tiene imagen
    const willBeFeatured =
      updateCategoryDto.isFeatured !== undefined
        ? updateCategoryDto.isFeatured
        : category.isFeatured;
    const hasImage = !!(file || category.image);
    this.validateFeaturedCategoryImage(willBeFeatured, hasImage);

    // Solo se pide cupo cuando la categoría pasa a destacada.
    if (willBeFeatured && !category.isFeatured) {
      await this.assertFeaturedSlotAvailable(uuid);
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async uploadImage(
    uuid: string,
    file: Express.Multer.File,
  ): Promise<Category> {
    if (!file) {
      throw new BadRequestException('Archivo de imagen requerido');
    }

    const category = await this.findByUuid(uuid);
    const oldImageUrl = category.image;
    const oldImageKey = category.imageKey;

    // Procesar y subir nueva imagen
    const { url, key } = await this.processCategoryImage(file);
    category.image = url;
    category.imageKey = key;

    // Eliminar imagen anterior de S3
    if (oldImageKey) {
      await this.s3Service.deleteFile(oldImageKey);
    } else if (oldImageUrl) {
      // Fallback para datos legacy sin imageKey
      const extractedKey = this.extractKeyFromUrl(oldImageUrl);
      if (extractedKey) {
        await this.s3Service.deleteFile(extractedKey);
      }
    }

    return await this.categoriesRepository.save(category);
  }

  async deleteImage(
    uuid: string,
    confirmed: boolean = false,
  ): Promise<{
    requiresConfirmation: boolean;
    message?: string;
    category?: Category;
  }> {
    const category = await this.findByUuid(uuid);

    if (!category.image) {
      throw new NotFoundException('La categoría no tiene imagen');
    }

    // Verificar si es destacada y requiere confirmación
    if (category.isFeatured && !confirmed) {
      return {
        requiresConfirmation: true,
        message:
          'Esta categoría está destacada. Al eliminar la imagen, se quitará automáticamente de destacadas. ¿Deseas continuar?',
      };
    }

    // Eliminar de S3
    if (category.imageKey) {
      await this.s3Service.deleteFile(category.imageKey);
    } else if (category.image) {
      // Fallback para datos legacy
      const extractedKey = this.extractKeyFromUrl(category.image);
      if (extractedKey) {
        await this.s3Service.deleteFile(extractedKey);
      }
    }

    // Limpiar campos de imagen y desmarcar destacada
    category.image = undefined;
    category.imageKey = null;
    if (category.isFeatured) {
      category.isFeatured = false;
    }

    const updatedCategory = await this.categoriesRepository.save(category);
    return { requiresConfirmation: false, category: updatedCategory };
  }

  async remove(uuid: string): Promise<void> {
    const category = await this.findByUuid(uuid);

    if (category.image) {
      const imageKey =
        category.imageKey || this.extractKeyFromUrl(category.image);
      if (imageKey) {
        await this.s3Service.deleteFile(imageKey);
      }
    }

    await this.categoriesRepository.softRemove(category);
  }

  /**
   * Las cuatro tarjetas del listado. Además del total/visibles/ocultas de
   * siempre, cuenta lo que el admin necesita para actuar: cuántas destacadas
   * ocupan cupo, cuál de ellas no se está mostrando por falta de imagen y
   * cuántas ocultas siguen teniendo productos publicados.
   */
  async getStats(): Promise<CategoryStats> {
    const categories = await this.findAllWithCounts();

    return {
      total: categories.length,
      visible: categories.filter((c) => c.visible).length,
      hidden: categories.filter((c) => !c.visible).length,
      parents: categories.filter((c) => !c.parent).length,
      children: categories.filter((c) => !!c.parent).length,
      featured: categories.filter((c) => c.isFeatured).length,
      featuredSlots: FEATURED_SLOTS,
      featuredWithoutImage: categories.filter((c) => c.isFeatured && !c.image)
        .length,
      withoutImage: categories.filter((c) => !c.image).length,
      hiddenWithPublishedProducts: categories.filter(
        (c) => !c.visible && c.publishedProductCount > 0,
      ).length,
    };
  }

  /**
   * Dónde se usa hoy una categoría. Alimenta el panel de la edición y el
   * detalle del modal de eliminado, para que "88 productos quedarían sin
   * categoría" sea un dato y no una advertencia genérica.
   */
  async getUsage(uuid: string): Promise<CategoryUsage> {
    const categories = await this.findAllWithCounts();
    const category = categories.find((c) => c.uuid === uuid);

    if (!category) {
      throw new NotFoundException(`Category with UUID ${uuid} not found`);
    }

    // El menú público lista las categorías raíz visibles en orden alfabético.
    const menu = categories
      .filter((c) => c.visible && !c.parent)
      .sort((a, b) => a.name.localeCompare(b.name));
    const menuIndex = menu.findIndex((c) => c.uuid === uuid);

    const featured = categories
      .filter((c) => c.isFeatured)
      .sort((a, b) => a.name.localeCompare(b.name));
    const featuredIndex = featured.findIndex((c) => c.uuid === uuid);

    const activeBanners = await this.countActiveBannersLinkingTo(category.slug);
    const children = categories.filter((c) => c.parent?.uuid === uuid);

    return {
      menuPosition: menuIndex === -1 ? null : menuIndex + 1,
      menuTotal: menu.length,
      featuredSlot: featuredIndex === -1 ? null : featuredIndex + 1,
      featuredSlots: FEATURED_SLOTS,
      activeBanners,
      publishedProducts: category.publishedProductCount,
      totalProducts: category.productCount,
      children: children.map((child) => ({
        uuid: child.uuid,
        name: child.customName ?? child.name,
        slug: child.slug,
        productCount: child.productCount,
      })),
    };
  }

  /** Banners activos y dentro de vigencia que enlazan a /categorias/<slug>. */
  private async countActiveBannersLinkingTo(slug: string): Promise<number> {
    const now = new Date();

    return await this.bannersRepository
      .createQueryBuilder('banner')
      .where('banner.isActive = true')
      .andWhere('banner.link ILIKE :link', { link: `%/categorias/${slug}%` })
      .andWhere('(banner.start_date IS NULL OR banner.start_date <= :now)', {
        now,
      })
      .andWhere('(banner.end_date IS NULL OR banner.end_date >= :now)', { now })
      .getCount();
  }

  /**
   * La franja de destacadas de la portada tiene 8 espacios. Solo se valida
   * cuando se está ocupando uno nuevo, para no bloquear ediciones de
   * categorías que ya estaban destacadas si el dato viejo excede el cupo.
   */
  private async assertFeaturedSlotAvailable(excludeUuid?: string) {
    const qb = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.isFeatured = true');

    if (excludeUuid) {
      qb.andWhere('category.uuid != :uuid', { uuid: excludeUuid });
    }

    const occupied = await qb.getCount();

    if (occupied >= FEATURED_SLOTS) {
      throw new BadRequestException(
        `Los ${FEATURED_SLOTS} espacios de categorías destacadas están ocupados. Quita una para agregar otra.`,
      );
    }
  }

  private async processCategoryImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string }> {
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

    return { url: webpResult.url, key: webpResult.key };
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
