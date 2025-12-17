import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { BannersModule } from './banners/banners.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DiscountsModule } from './discounts/discounts.module';
import { BanksModule } from './banks/banks.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CustomersModule } from './customers/customers.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiV1Module } from './api-v1/api-v1.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ApiRequestLogsModule } from './api-request-logs/api-request-logs.module';
import {
  databaseConfig,
  jwtConfig,
  awsConfig,
  appConfig,
  emailConfig,
} from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, awsConfig, appConfig, emailConfig],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // TODO: Cambiar a false y usar migraciones antes de producción
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    BannersModule,
    CartModule,
    OrdersModule,
    DiscountsModule,
    BanksModule,
    ExchangeRatesModule,
    AnalyticsModule,
    CustomersModule,
    ApiKeysModule,
    ApiV1Module,
    WebhooksModule,
    ApiRequestLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
