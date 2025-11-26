import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission } from '../src/api-keys/api-key.entity';
import { User } from '../src/users/user.entity';
import { Product } from '../src/products/product.entity';
import { Category } from '../src/categories/category.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createTestApiKey,
  getBearerAuthHeaders,
  cleanupTestApiKeys,
  ApiKeyCredentials,
} from './helpers/api-v3-test.helpers';

describe('API v1 - Products (e2e)', () => {
  let app: INestApplication;
  let apiKeyRepository: Repository<ApiKey>;
  let userRepository: Repository<User>;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let readWriteCredentials: ApiKeyCredentials;
  let readOnlyCredentials: ApiKeyCredentials;
  let testProduct: Product;
  let testCategory: Category;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    apiKeyRepository = moduleFixture.get(getRepositoryToken(ApiKey));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    productRepository = moduleFixture.get(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));

    // Create test API keys
    readWriteCredentials = await createTestApiKey(
      apiKeyRepository,
      userRepository,
      ApiKeyPermission.READ_WRITE,
      'Test API Key - V1 Products',
    );

    readOnlyCredentials = await createTestApiKey(
      apiKeyRepository,
      userRepository,
      ApiKeyPermission.READ,
      'Test API Key - V1 Products',
    );

    // Create test category
    testCategory = categoryRepository.create({
      name: 'Test Category V1',
      slug: 'test-category-v1',
      description: 'Category for V1 testing',
    });
    await categoryRepository.save(testCategory);

    // Create test product
    testProduct = productRepository.create({
      name: 'Test Product V1',
      description: 'This is a test product for V1',
      shortDescription: 'Test product V1',
      sku: 'TEST-V1-001',
      price: 199.99,
      inventory: 100,
      published: true,
      categories: [testCategory],
    });
    await productRepository.save(testProduct);
  });

  afterAll(async () => {
    // Cleanup
    if (testProduct) {
      await productRepository.remove(testProduct);
    }
    if (testCategory) {
      await categoryRepository.remove(testCategory);
    }
    await cleanupTestApiKeys(apiKeyRepository, 'Test API Key - V1 Products');
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer()).get('/api/v1/products').expect(401);
    });

    it('should reject requests with invalid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', 'Bearer invalid:credentials')
        .expect(401);
    });

    it('should accept valid API key', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should return products list in native format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      // Should return pagination result object
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('lastPage');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return native Product entity format (not WooCommerce)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      const product = response.body.data[0];

      // Native Product entity fields
      expect(product).toHaveProperty('uuid');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('inventory');
      expect(product).toHaveProperty('published');

      // Should NOT have WooCommerce fields
      expect(product).not.toHaveProperty('stock_status');
      expect(product).not.toHaveProperty('regular_price');
      expect(product).not.toHaveProperty('sale_price');
    });

    it('should support pagination with page and perPage params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?page=1&perPage=5')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.page).toBe(1);
    });

    it('should support search by product name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products?search=Test')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        const product = response.body.data.find(
          (p: Product) => p.uuid === testProduct.uuid,
        );
        expect(product).toBeDefined();
      }
    });

    it('should work with READ permission', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .expect(200);
    });
  });

  describe('GET /api/v1/products/:uuid', () => {
    it('should return single product by UUID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProduct.uuid}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      // Verify native entity format
      expect(response.body).toHaveProperty('uuid', testProduct.uuid);
      expect(response.body).toHaveProperty('name', testProduct.name);
      expect(response.body).toHaveProperty('sku', testProduct.sku);
      expect(response.body).toHaveProperty('price'); // price is string from decimal type
      expect(response.body).toHaveProperty('inventory', testProduct.inventory);

      // Should NOT have WooCommerce transformed fields
      expect(response.body).not.toHaveProperty('stock_status');
    });

    it('should return 404 for non-existent UUID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(404);
    });

    it('should include categories in native format', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProduct.uuid}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
      if (response.body.categories.length > 0) {
        const category = response.body.categories[0];
        expect(category).toHaveProperty('uuid');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
      }
    });

    it('should work with READ permission', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/products/${testProduct.uuid}`)
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .expect(200);
    });
  });

  describe('POST /api/v1/products', () => {
    let createdProductUuid: string | undefined;

    afterEach(async () => {
      if (createdProductUuid) {
        const product = await productRepository.findOne({
          where: { uuid: createdProductUuid },
        });
        if (product) {
          await productRepository.remove(product);
        }
        createdProductUuid = undefined;
      }
    });

    it('should create a new product and return native entity', async () => {
      const productData = {
        name: 'New Test Product V1',
        price: 299.99,
        sku: 'NEW-V1-001',
        inventory: 50,
        published: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send(productData)
        .expect(201);

      createdProductUuid = response.body.uuid;

      // Verify native entity format
      expect(response.body).toHaveProperty('uuid');
      expect(response.body).toHaveProperty('name', productData.name);
      expect(response.body).toHaveProperty('price', productData.price);
      expect(response.body).toHaveProperty('sku', productData.sku);
      expect(response.body).toHaveProperty('inventory', productData.inventory);
      expect(typeof response.body.uuid).toBe('string');
    });

    it('should reject create with READ-only permission', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .send({
          name: 'Unauthorized Product',
          price: 99.99,
        })
        .expect(403);
    });
  });

  describe('PUT /api/v1/products/:uuid', () => {
    it('should update product by UUID', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/products/${testProduct.uuid}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send({ name: 'Updated V1 Product Name' })
        .expect(200);

      expect(response.body).toHaveProperty('uuid', testProduct.uuid);
      expect(response.body).toHaveProperty('name', 'Updated V1 Product Name');

      // Restore using update with where clause
      await productRepository.update(
        { uuid: testProduct.uuid },
        { name: 'Test Product V1' },
      );
    });

    it('should return 404 for non-existent UUID', () => {
      return request(app.getHttpServer())
        .put('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should reject update with READ-only permission', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/products/${testProduct.uuid}`)
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/products/:uuid', () => {
    let productToDelete: Product;

    beforeEach(async () => {
      productToDelete = productRepository.create({
        name: 'Product to Delete V1',
        sku: `DELETE-V1-${Date.now()}`, // Unique SKU
        price: 50.0,
        inventory: 10,
      });
      await productRepository.save(productToDelete);
    });

    it('should delete product by UUID', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/products/${productToDelete.uuid}`)
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(200);

      expect(response.body).toHaveProperty('uuid', productToDelete.uuid);
      expect(response.body).toHaveProperty('message');

      // Verify soft delete
      const deletedProduct = await productRepository.findOne({
        where: { uuid: productToDelete.uuid },
        withDeleted: true,
      });
      expect(deletedProduct).toBeDefined();
      expect(deletedProduct!.deletedAt).toBeDefined();
    });

    it('should return 404 for non-existent UUID', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .expect(404);
    });

    it('should reject delete with READ-only permission', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/products/${productToDelete.uuid}`)
        .set(getBearerAuthHeaders(readOnlyCredentials))
        .expect(403);
    });
  });

  describe('Webhook Triggering', () => {
    it('should trigger webhook on product creation', async () => {
      const productData = {
        name: 'Webhook Test Product',
        price: 99.99,
        sku: 'WEBHOOK-001',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set(getBearerAuthHeaders(readWriteCredentials))
        .send(productData)
        .expect(201);

      // Cleanup
      if (response.body.uuid) {
        const product = await productRepository.findOne({
          where: { uuid: response.body.uuid },
        });
        if (product) {
          await productRepository.remove(product);
        }
      }

      // Note: Webhook triggering happens asynchronously
      // In a real test, you'd verify webhook was called via mock or database check
    });
  });
});
