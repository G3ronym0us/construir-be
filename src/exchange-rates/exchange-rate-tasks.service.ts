import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRatesService } from './exchange-rates.service';
import { Product } from '../products/product.entity';

@Injectable()
export class ExchangeRateTasksService {
  private readonly logger = new Logger(ExchangeRateTasksService.name);

  constructor(
    private exchangeRatesService: ExchangeRatesService,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  @Cron('0 1 * * *', {
    name: 'sync-exchange-rate',
    timeZone: 'America/Caracas',
  })
  async handleDailyExchangeRateSync() {
    this.logger.log('Starting daily exchange rate synchronization...');

    try {
      // 1. Sincronizar tipo de cambio con BCV
      const exchangeRate = await this.exchangeRatesService.sync();
      this.logger.log(`Exchange rate synchronized: ${exchangeRate.rate}`);

      // 2. Actualizar precios en VES de todos los productos
      const products = await this.productsRepository.find();
      this.logger.log(`Updating VES prices for ${products.length} products...`);

      const updatePromises = products.map(async (product) => {
        product.priceVes = Number((Number(product.price) * Number(exchangeRate.rate)).toFixed(2));
        return this.productsRepository.save(product);
      });

      await Promise.all(updatePromises);

      this.logger.log('Daily exchange rate synchronization completed successfully');
    } catch (error) {
      this.logger.error('Error during daily exchange rate synchronization:', error);
    }
  }

  // Método manual para forzar actualización de precios (útil para testing)
  async updateAllProductPrices(): Promise<void> {
    this.logger.log('Manually updating all product prices...');

    try {
      const exchangeRate = await this.exchangeRatesService.findCurrent();
      const products = await this.productsRepository.find();

      const updatePromises = products.map(async (product) => {
        product.priceVes = Number((Number(product.price) * Number(exchangeRate.rate)).toFixed(2));
        return this.productsRepository.save(product);
      });

      await Promise.all(updatePromises);

      this.logger.log(`Updated VES prices for ${products.length} products`);
    } catch (error) {
      this.logger.error('Error updating product prices:', error);
      throw error;
    }
  }
}
