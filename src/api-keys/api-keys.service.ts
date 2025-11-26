import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyPermission } from './api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(
    description: string,
    permissions: ApiKeyPermission,
  ): Promise<{ apiKey: ApiKey; consumerSecret: string }> {
    const consumerKey = this.generateKey('ck_');
    const consumerSecret = this.generateKey('cs_');

    const apiKey = this.apiKeyRepository.create({
      consumerKey,
      consumerSecret: await this.hashSecret(consumerSecret),
      description,
      permissions,
      active: true,
    });

    await this.apiKeyRepository.save(apiKey);

    return {
      apiKey: {
        ...apiKey,
        consumerSecret: '***HIDDEN***',
      } as ApiKey,
      consumerSecret,
    };
  }

  async findAll(): Promise<ApiKey[]> {
    const keys = await this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });

    return keys.map((key) => ({
      ...key,
      consumerSecret: '***HIDDEN***',
    }));
  }

  async findByConsumerKey(consumerKey: string): Promise<ApiKey | null> {
    return await this.apiKeyRepository.findOne({
      where: { consumerKey, active: true },
    });
  }

  async validateApiKey(
    consumerKey: string,
    consumerSecret: string,
  ): Promise<ApiKey | null> {
    const apiKey = await this.findByConsumerKey(consumerKey);

    if (!apiKey) {
      return null;
    }

    const isValid = await this.verifySecret(
      consumerSecret,
      apiKey.consumerSecret,
    );

    if (!isValid) {
      return null;
    }

    await this.updateLastUsed(apiKey.id);

    return apiKey;
  }

  async revoke(id: number): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    apiKey.active = false;
    await this.apiKeyRepository.save(apiKey);
  }

  async delete(id: number): Promise<void> {
    const result = await this.apiKeyRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('API Key not found');
    }
  }

  private generateKey(prefix: string): string {
    const randomBytes = crypto.randomBytes(32);
    return prefix + randomBytes.toString('hex');
  }

  private async hashSecret(secret: string): Promise<string> {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  private async verifySecret(
    plainSecret: string,
    hashedSecret: string,
  ): Promise<boolean> {
    const hash = await this.hashSecret(plainSecret);
    return hash === hashedSecret;
  }

  private async updateLastUsed(id: number): Promise<void> {
    await this.apiKeyRepository.update(id, {
      lastUsedAt: new Date(),
    });
  }
}
