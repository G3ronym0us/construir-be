import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRatesService } from './exchange-rates.service';
import { BCVService } from './bcv.service';
import { toIsoDate } from './date.util';
import { Product } from '../products/product.entity';
import { applyVesPrices } from '../products/pricing.util';

@Injectable()
export class ExchangeRateTasksService {
  private readonly logger = new Logger(ExchangeRateTasksService.name);

  constructor(
    private exchangeRatesService: ExchangeRatesService,
    private bcvService: BCVService,
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
      await this.recalculateProductPrices(Number(exchangeRate.rate));

      this.logger.log(
        'Daily exchange rate synchronization completed successfully',
      );
    } catch (error) {
      this.logger.error(
        'Error during daily exchange rate synchronization:',
        error,
      );
    }
  }

  /**
   * Sondea la ventana de publicación del BCV buscando una tasa **nueva**.
   *
   * El cron de la 1 AM no alcanza: a esa hora la tasa publicada ya es la
   * vigente, así que en modo `published` nunca detectaría el cambio. Éste corre
   * en horario comercial, donde recalcular los ~1380 productos es caro: por eso
   * solo escribe y recalcula si la tasa publicada difiere de la última fila
   * guardada (fecha valor o monto). Si no cambió, termina sin tocar nada.
   */
  @Cron('*/20 12-23 * * 1-5', {
    name: 'detect-new-rate',
    timeZone: 'America/Caracas',
  })
  async handlePublishedRateDetection() {
    this.logger.debug('Checking for a newly published BCV rate...');

    try {
      const bcvRate = await this.bcvService.getBCVRate();

      if (!bcvRate) {
        // El servicio no respondió y no hay caché: la tasa guardada queda como
        // está. Construir sigue operando con `exchange_rates` como fallback.
        this.logger.warn(
          'No se pudo obtener la tasa publicada; se conserva la tasa guardada',
        );
        return;
      }

      const latest = await this.exchangeRatesService.findLatest();

      if (
        latest &&
        toIsoDate(latest.date) === bcvRate.effectiveDate &&
        Number(latest.rate) === bcvRate.rate
      ) {
        this.logger.debug(
          `Sin cambios en la tasa publicada (${bcvRate.rate} para ${bcvRate.effectiveDate}); no se recalcula nada`,
        );
        return;
      }

      this.logger.log(
        `Nueva tasa publicada detectada: ${bcvRate.rate} para ${bcvRate.effectiveDate} ` +
          `(anterior: ${latest ? `${latest.rate} para ${toIsoDate(latest.date)}` : 'ninguna'})`,
      );

      const exchangeRate = await this.exchangeRatesService.sync();
      await this.recalculateProductPrices(Number(exchangeRate.rate));

      this.logger.log(
        `Catálogo recalculado con la tasa publicada ${exchangeRate.rate}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Error detectando la nueva tasa publicada:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /** Recalcula los precios en VES de todos los productos con la tasa dada. */
  private async recalculateProductPrices(rate: number): Promise<number> {
    const products = await this.productsRepository.find();
    this.logger.log(`Updating VES prices for ${products.length} products...`);

    const updatePromises = products.map(async (product) => {
      applyVesPrices(product, rate);
      return this.productsRepository.save(product);
    });

    await Promise.all(updatePromises);
    return products.length;
  }

  // Método manual para forzar actualización de precios (útil para testing)
  async updateAllProductPrices(): Promise<void> {
    this.logger.log('Manually updating all product prices...');

    try {
      const exchangeRate = await this.exchangeRatesService.findCurrent();
      const count = await this.recalculateProductPrices(
        Number(exchangeRate.rate),
      );

      this.logger.log(`Updated VES prices for ${count} products`);
    } catch (error) {
      this.logger.error('Error updating product prices:', error);
      throw error;
    }
  }
}
