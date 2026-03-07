import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { In, Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission } from '../src/api-keys/api-key.entity';
import { ApiRequestLog } from '../src/api-request-logs/api-request-log.entity';
import { User } from '../src/users/user.entity';
import { Category } from '../src/categories/category.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createTestApiKey,
  getBearerAuthHeaders,
  cleanupTestApiKeys,
  ApiKeyCredentials,
} from './helpers/api-v3-test.helpers';

describe('API v1 - Categories (e2e)', () => {
  let app: INestApplication;
  let apiKeyRepository: Repository<ApiKey>;
  let apiRequestLogRepository: Repository<ApiRequestLog>;
  let userRepository: Repository<User>;
  let categoryRepository: Repository<Category>;
  let readWriteCredentials: ApiKeyCredentials;
  let readOnlyCredentials: ApiKeyCredentials;
  let testCategory: Category;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    apiKeyRepository = moduleFixture.get(getRepositoryToken(ApiKey));
    apiRequestLogRepository = moduleFixture.get(
      getRepositoryToken(ApiRequestLog),
    );
    userRepository = moduleFixture.get(getRepositoryToken(User));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));

    // Create test API keys
    readWriteCredentials = await createTestApiKey(
      apiKeyRepository,
      userRepository,
      ApiKeyPermission.READ_WRITE,
      'Test API Key - V1 Categories',
    );

    readOnlyCredentials = await createTestApiKey(
      apiKeyRepository,
      userRepository,
      ApiKeyPermission.READ,
      'Test API Key - V1 Categories',
    );

    // Create test category
    testCategory = categoryRepository.create({
      name: 'Test Category V1 E2E',
      slug: 'test-category-v1-e2e',
      externalCode: 'TEST-EC-V1-001',
      description: 'Category for V1 e2e testing',
    });
    await categoryRepository.save(testCategory);
  });

  afterAll(async () => {
    if (testCategory) {
      await categoryRepository.remove(testCategory);
    }
    // Delete api_request_logs referencing our test keys before removing the keys
    const testApiKeys = await apiKeyRepository.find({
      where: { description: 'Test API Key - V1 Categories' },
    });
    if (testApiKeys.length > 0) {
      await apiRequestLogRepository.delete({
        apiKey: { id: In(testApiKeys.map((k) => k.id)) },
      });
    }
    await cleanupTestApiKeys(apiKeyRepository, 'Test API Key - V1 Categories');
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer()).get('/api/v1/categories').expect(401);
    });

    it('should reject requests with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', 'Bearer invalid:credentials')
        .expect(401);
    });

    it('should accept valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);
    });
  });

  describe('GET /api/v1/categories', () => {
    it('should return array of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return categories with expected fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
      const category = response.body.find(
        (c: Category) => c.uuid === testCategory.uuid,
      );
      expect(category).toBeDefined();
      expect(category).toHaveProperty('uuid');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('slug');
      expect(category).toHaveProperty('externalCode');
    });

    it('should be accessible with READ permission', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .expect(200);
    });
  });

  describe('GET /api/v1/categories/:externalCode', () => {
    it('should return category by externalCode', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategory.externalCode}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body).toHaveProperty('uuid', testCategory.uuid);
      expect(response.body).toHaveProperty('name', testCategory.name);
      expect(response.body).toHaveProperty('slug', testCategory.slug);
      expect(response.body).toHaveProperty(
        'externalCode',
        testCategory.externalCode,
      );
    });

    it('should return 404 for non-existent externalCode', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories/NO-EXISTE-9999')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(404);
    });

    it('should be accessible with READ permission', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/categories/${testCategory.externalCode}`)
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .expect(200);
    });
  });

  describe('POST /api/v1/categories', () => {
    let createdCategoryExternalCode: string | undefined;

    afterEach(async () => {
      if (createdCategoryExternalCode) {
        const category = await categoryRepository.findOne({
          where: { externalCode: createdCategoryExternalCode },
        });
        if (category) {
          await categoryRepository.remove(category);
        }
        createdCategoryExternalCode = undefined;
      }
    });

    it('should create a new category and return entity with uuid, name, slug, externalCode', async () => {
      const categoryData = {
        name: 'New Category V1 E2E',
        externalCode: 'TEST-EC-V1-NEW',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send(categoryData)
        .expect(201);

      createdCategoryExternalCode = categoryData.externalCode;

      expect(response.body).toHaveProperty('uuid');
      expect(response.body).toHaveProperty('name', categoryData.name);
      expect(response.body).toHaveProperty('slug');
      expect(response.body).toHaveProperty(
        'externalCode',
        categoryData.externalCode,
      );
      expect(typeof response.body.uuid).toBe('string');
    });

    it('should trim whitespace from name and externalCode and be findable by clean code', async () => {
      const categoryData = {
        name: 'TUBOS A.B POLIET-PVC          ',
        externalCode: '10301     ',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send(categoryData)
        .expect(201);

      createdCategoryExternalCode = '10301';

      expect(createResponse.body.name).toBe('TUBOS A.B POLIET-PVC');
      expect(createResponse.body.externalCode).toBe('10301');

      const findResponse = await request(app.getHttpServer())
        .get('/api/v1/categories/10301')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(findResponse.body.name).toBe('TUBOS A.B POLIET-PVC');
      expect(findResponse.body.externalCode).toBe('10301');
    });

    it('should reject create with READ-only permission', () => {
      return request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .send({ name: 'Unauthorized Category', externalCode: 'UNAUTH-001' })
        .expect(403);
    });

    it('should return 409 for duplicate name', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/categories')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send({
          name: testCategory.name,
          externalCode: 'DUPLICATE-NAME-001',
        })
        .expect(409);
    });
  });

  describe('PUT /api/v1/categories/:externalCode', () => {
    it('should update category name by externalCode', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/categories/${testCategory.externalCode}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send({ name: 'Updated Category V1 E2E' })
        .expect(200);

      expect(response.body).toHaveProperty('uuid', testCategory.uuid);
      expect(response.body).toHaveProperty('name', 'Updated Category V1 E2E');

      // Restore original name
      await categoryRepository.update(
        { uuid: testCategory.uuid },
        { name: testCategory.name },
      );
    });

    it('should return 404 for non-existent externalCode', () => {
      return request(app.getHttpServer())
        .put('/api/v1/categories/NO-EXISTE-9999')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should reject update with READ-only permission', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/categories/${testCategory.externalCode}`)
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });
  });
});
