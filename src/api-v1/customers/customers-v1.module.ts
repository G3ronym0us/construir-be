import { Module } from '@nestjs/common';
import { CustomersV1Controller } from './customers-v1.controller';
import { CustomersModule } from '../../customers/customers.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';
import { ApiKeysModule } from '../../api-keys/api-keys.module';

@Module({
  imports: [CustomersModule, WebhooksModule, ApiKeysModule],
  controllers: [CustomersV1Controller],
})
export class CustomersV1Module {}
