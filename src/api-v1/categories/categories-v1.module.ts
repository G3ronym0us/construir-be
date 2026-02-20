import { Module } from '@nestjs/common';
import { CategoriesV1Controller } from './categories-v1.controller';
import { CategoriesModule } from '../../categories/categories.module';
import { ApiKeysModule } from '../../api-keys/api-keys.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';

@Module({
  imports: [CategoriesModule, ApiKeysModule, WebhooksModule],
  controllers: [CategoriesV1Controller],
})
export class CategoriesV1Module {}
