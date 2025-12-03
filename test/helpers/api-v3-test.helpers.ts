import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission } from '../../src/api-keys/api-key.entity';
import { User } from '../../src/users/user.entity';
import * as crypto from 'crypto';

/**
 * Helper functions for API v3 E2E tests
 */

export interface ApiKeyCredentials {
  consumerKey: string;
  consumerSecret: string;
}

/**
 * Creates a test API key with specified permissions
 */
export async function createTestApiKey(
  apiKeyRepository: Repository<ApiKey>,
  userRepository: Repository<User>,
  permissions: ApiKeyPermission = ApiKeyPermission.READ_WRITE,
  description: string = 'Test API Key',
): Promise<ApiKeyCredentials> {
  const consumerKey = `ck_${crypto.randomBytes(16).toString('hex')}`;
  const consumerSecret = `cs_${crypto.randomBytes(16).toString('hex')}`;

  // Hash the secret with SHA-256 (same as production code)
  const hashedSecret = crypto
    .createHash('sha256')
    .update(consumerSecret)
    .digest('hex');

  const apiKey = apiKeyRepository.create({
    consumerKey,
    consumerSecret: hashedSecret, // Store hashed version
    description,
    permissions,
    active: true,
    lastUsedAt: null,
  });

  await apiKeyRepository.save(apiKey);

  // Return plaintext secret for use in HTTP requests
  return { consumerKey, consumerSecret };
}

/**
 * Generates authentication headers for Bearer token method
 */
export function getBearerAuthHeaders(
  credentials: ApiKeyCredentials,
): Record<string, string> {
  const token = `${credentials.consumerKey}:${credentials.consumerSecret}`;
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Generates authentication headers for custom headers method
 */
export function getCustomHeadersAuth(
  credentials: ApiKeyCredentials,
): Record<string, string> {
  return {
    'X-Consumer-Key': credentials.consumerKey,
    'X-Consumer-Secret': credentials.consumerSecret,
  };
}

/**
 * Generates query parameters for query string authentication
 */
export function getQueryParamsAuth(credentials: ApiKeyCredentials): string {
  return `consumer_key=${credentials.consumerKey}&consumer_secret=${credentials.consumerSecret}`;
}

/**
 * Cleans up test API keys
 */
export async function cleanupTestApiKeys(
  apiKeyRepository: Repository<ApiKey>,
  description?: string,
): Promise<void> {
  if (description) {
    await apiKeyRepository.delete({ description });
  } else {
    // Clean all test API keys (for backwards compatibility)
    await apiKeyRepository
      .createQueryBuilder()
      .delete()
      .where('description LIKE :pattern', { pattern: 'Test API Key%' })
      .execute();
  }
}

/**
 * Sample product data for testing
 */
export const sampleProductData = {
  valid: {
    name: 'Test Product',
    description: 'This is a test product description',
    short_description: 'Test product',
    sku: 'TEST-SKU-001',
    price: '99.99',
    stock_quantity: 10,
    categories: [],
    images: [
      {
        src: 'https://example.com/image1.jpg',
        alt: 'Product image 1',
      },
    ],
  },
  minimal: {
    name: 'Minimal Product',
    price: '19.99',
  },
  invalid: {
    // Missing required fields
    description: 'Product without name and price',
  },
};

/**
 * Sample customer data for testing
 */
export const sampleCustomerData = {
  valid: {
    email: 'customer@example.com',
    first_name: 'John',
    last_name: 'Doe',
  },
  minimal: {
    email: 'minimal@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
  },
  invalid: {
    // Missing required fields
    email: 'invalid-email',
  },
};

/**
 * Sample order update data for testing
 */
export const sampleOrderUpdateData = {
  statusUpdate: {
    status: 'processing',
  },
  invalidStatus: {
    status: 'invalid-status',
  },
};

/**
 * Waits for a short period (useful for async operations)
 */
export async function wait(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
