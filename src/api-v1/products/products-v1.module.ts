import { Module } from '@nestjs/common';
import { ProductsV1Controller } from './products-v1.controller';
import { ProductsModule } from '../../products/products.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';
import { ApiKeysModule } from '../../api-keys/api-keys.module';

@Module({
  imports: [ProductsModule, WebhooksModule, ApiKeysModule],
  controllers: [ProductsV1Controller],
})
export class ProductsV1Module {}
