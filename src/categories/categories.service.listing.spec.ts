// `uuid` v13 solo publica ESM y ts-jest corre en CommonJS. Nada de este
// archivo depende de un uuid real, así que se stubea la dependencia.
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CategoriesService, FEATURED_SLOTS } from './categories.service';
import { Category } from './category.entity';
import { Banner } from '../banners/banner.entity';
import { S3Service } from '../products/s3.service';
import { ImageProcessingService } from '../banners/image-processing.service';

/**
 * Listado del admin: orden en árbol, filtros por problema, conteos y el cupo
 * de destacadas. Todo se resuelve en memoria sobre `find()`, así que basta
 * con un repositorio falso que devuelva las categorías y los conteos crudos.
 */

type Row = { categoryId: number; total: string; published: string };

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: 0,
    uuid: 'uuid',
    name: 'Categoría',
    slug: 'categoria',
    externalCode: null,
    description: '',
    image: 'https://cdn/img.webp',
    imageKey: null,
    customName: null,
    isFeatured: false,
    isMain: false,
    visible: true,
    parent: null,
    childrens: [],
    products: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Category;
}

const cemento = makeCategory({ id: 1, uuid: 'u-cemento', name: 'Cemento y agregados', slug: 'cemento-y-agregados', isFeatured: true });
const cementoGris = makeCategory({ id: 2, uuid: 'u-gris', name: 'Cemento gris', slug: 'cemento-gris', parent: cemento });
const arena = makeCategory({ id: 3, uuid: 'u-arena', name: 'Arena y piedra picada', slug: 'arena-y-piedra-picada', parent: cemento, visible: false });
const plomeria = makeCategory({ id: 4, uuid: 'u-plomeria', name: 'Plomería', slug: 'plomeria', image: undefined });
const techos = makeCategory({ id: 5, uuid: 'u-techos', name: 'Techos y láminas', slug: 'techos-y-laminas', image: undefined, isFeatured: true });

cemento.childrens = [cementoGris, arena];

const ALL = [arena, cemento, cementoGris, plomeria, techos];

const COUNTS: Row[] = [
  { categoryId: 1, total: '142', published: '140' },
  { categoryId: 2, total: '38', published: '38' },
  { categoryId: 3, total: '17', published: '17' },
  { categoryId: 4, total: '88', published: '88' },
  { categoryId: 5, total: '54', published: '50' },
];

describe('CategoriesService — listado del admin', () => {
  let service: CategoriesService;
  let categoriesFind: jest.Mock;
  let featuredCount: jest.Mock;

  beforeEach(async () => {
    categoriesFind = jest.fn().mockResolvedValue(ALL);
    featuredCount = jest.fn().mockResolvedValue(2);

    const countsQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(COUNTS),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: featuredCount,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            find: categoriesFind,
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn((data: Partial<Category>) => data as Category),
            save: jest.fn((entity: Category) => Promise.resolve(entity)),
            createQueryBuilder: jest.fn().mockReturnValue(countsQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Banner),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        { provide: S3Service, useValue: {} },
        { provide: ImageProcessingService, useValue: {} },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('ordena cada subcategoría justo debajo de su padre', async () => {
    const { data } = await service.findAllPaginated(1, 20);

    expect(data.map((c) => c.slug)).toEqual([
      'cemento-y-agregados',
      'arena-y-piedra-picada',
      'cemento-gris',
      'plomeria',
      'techos-y-laminas',
    ]);
  });

  it('adjunta el conteo de productos totales y publicados', async () => {
    const { data } = await service.findAllPaginated(1, 20);
    const techosRow = data.find((c) => c.slug === 'techos-y-laminas');

    expect(techosRow?.productCount).toBe(54);
    expect(techosRow?.publishedProductCount).toBe(50);
  });

  it('busca también por slug, no solo por nombre', async () => {
    const { data, total } = await service.findAllPaginated(
      1,
      20,
      'piedra-picada',
    );

    expect(total).toBe(1);
    expect(data[0].slug).toBe('arena-y-piedra-picada');
  });

  it('filtra por los atajos de problema del listado', async () => {
    const parents = await service.findAllPaginated(1, 20, undefined, 'parents');
    expect(parents.data.map((c) => c.slug)).toEqual([
      'cemento-y-agregados',
      'plomeria',
      'techos-y-laminas',
    ]);

    const noImage = await service.findAllPaginated(
      1,
      20,
      undefined,
      'no-image',
    );
    expect(noImage.data.map((c) => c.slug)).toEqual([
      'plomeria',
      'techos-y-laminas',
    ]);

    const hidden = await service.findAllPaginated(1, 20, undefined, 'hidden');
    expect(hidden.data.map((c) => c.slug)).toEqual(['arena-y-piedra-picada']);
  });

  it('pagina sobre el árbol ya ordenado', async () => {
    const { data, total } = await service.findAllPaginated(2, 2);

    expect(total).toBe(5);
    expect(data.map((c) => c.slug)).toEqual(['cemento-gris', 'plomeria']);
  });

  it('cuenta destacadas sin imagen y ocultas con productos publicados', async () => {
    const stats = await service.getStats();

    expect(stats).toMatchObject({
      total: 5,
      visible: 4,
      hidden: 1,
      parents: 3,
      children: 2,
      featured: 2,
      featuredSlots: FEATURED_SLOTS,
      featuredWithoutImage: 1,
      withoutImage: 2,
      hiddenWithPublishedProducts: 1,
    });
  });

  it('resume dónde se usa una categoría', async () => {
    const usage = await service.getUsage('u-cemento');

    // El menú lista las raíces visibles: Cemento, Plomería, Techos.
    expect(usage.menuPosition).toBe(1);
    expect(usage.menuTotal).toBe(3);
    expect(usage.featuredSlot).toBe(1);
    expect(usage.publishedProducts).toBe(140);
    expect(usage.totalProducts).toBe(142);
    expect(usage.activeBanners).toBe(1);
    expect(usage.children.map((c) => c.slug)).toEqual([
      'arena-y-piedra-picada',
      'cemento-gris',
    ]);
  });

  it('rechaza destacar una categoría cuando no quedan espacios', async () => {
    featuredCount.mockResolvedValue(FEATURED_SLOTS);

    await expect(
      service.create(
        { name: 'Nueva', slug: 'nueva', isFeatured: true },
        { buffer: Buffer.from('') } as Express.Multer.File,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
