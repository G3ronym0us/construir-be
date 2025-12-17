import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProductsV1Module } from './products/products-v1.module';
import { OrdersV1Module } from './orders/orders-v1.module';
import { CustomersV1Module } from './customers/customers-v1.module';
import { WebhookInterceptor } from './common/interceptors/webhook.interceptor';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApiRequestLogsModule } from '../api-request-logs/api-request-logs.module';
import { ApiLoggingInterceptor } from '../api-request-logs/api-logging.interceptor';

@Module({
  imports: [
    ProductsV1Module,
    OrdersV1Module,
    CustomersV1Module,
    WebhooksModule,
    ApiRequestLogsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: WebhookInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
  ],
})
export class ApiV1Module {}
