import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { BCVService } from './bcv.service';
import { ExchangeRateTasksService } from './exchange-rate-tasks.service';
import { ExchangeRate } from './exchange-rate.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeRate, Product]),
    HttpModule,
  ],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, BCVService, ExchangeRateTasksService],
  exports: [ExchangeRatesService, BCVService],
})
export class ExchangeRatesModule {}
