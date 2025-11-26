import { Module } from '@nestjs/common';
import { OrdersV1Controller } from './orders-v1.controller';
import { OrdersModule } from '../../orders/orders.module';
import { WebhooksModule } from '../../webhooks/webhooks.module';
import { ApiKeysModule } from '../../api-keys/api-keys.module';

@Module({
  imports: [OrdersModule, WebhooksModule, ApiKeysModule],
  controllers: [OrdersV1Controller],
})
export class OrdersV1Module {}
