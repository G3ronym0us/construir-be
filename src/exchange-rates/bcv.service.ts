import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Respuesta de GET /v1/rates/current del servicio centralizado de tasas.
 * `rate` y `rateFull` vienen como string para no perder precisión en el JSON.
 */
interface RatesServiceResponse {
  currency: string;
  rate: string;
  rateFull: string;
  effectiveDate: string;
  observedAt: string;
  source: string;
  mode: string;
  stale: boolean;
  suspect: boolean;
}

export interface BCVRate {
  /** El `rate` del servicio: 2 decimales, ya truncado en origen. */
  rate: number;
  /** Fecha valor del BCV en formato 'YYYY-MM-DD'. */
  effectiveDate: string;
  /** Fuente real del dato ('bcv.org.ve' o el fallback del servicio). */
  source: string;
  /** true si el servicio está sirviendo un dato viejo. */
  stale: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class BCVService {
  private readonly logger = new Logger(BCVService.name);
  private cache: BCVRate | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = (
      this.configService.get<string>('bcvRates.url') ||
      'https://rates.cambiosloscriollitos.com'
    ).replace(/\/+$/, '');
    this.apiKey = this.configService.get<string>('bcvRates.apiKey') || '';
    this.timeoutMs =
      this.configService.get<number>('bcvRates.timeoutMs') || 10000;

    if (!this.apiKey) {
      // No tumbamos el arranque: sin key la sincronización falla y el catálogo
      // sigue con la tasa ya guardada en `exchange_rates`.
      this.logger.error(
        'BCV_RATES_API_KEY no está configurada: no se podrá sincronizar la tasa',
      );
    }
  }

  /**
   * Pide al servicio centralizado la tasa **publicada** por el BCV
   * (`mode=published`), que entre las ~17:00 y medianoche de Caracas ya es la
   * de mañana. Es la que el cliente ve en el catálogo y la que paga.
   */
  async getBCVRate(): Promise<BCVRate | null> {
    try {
      // Verificar cache
      if (this.cache && Date.now() < this.cacheExpiry) {
        this.logger.debug('Returning cached BCV rate');
        return this.cache;
      }

      const url = `${this.baseUrl}/v1/rates/current`;
      this.logger.log(`Fetching published BCV rate from ${url}...`);

      const response = await firstValueFrom(
        this.httpService.get<RatesServiceResponse>(url, {
          params: { currency: 'USD', mode: 'published' },
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: this.timeoutMs,
        }),
      );

      const bcvRate = this.parseResponse(response?.data);

      // Actualizar cache
      this.cache = bcvRate;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      if (bcvRate.stale) {
        this.logger.warn(
          `El servicio de tasas devolvió un dato marcado como stale (fecha valor ${bcvRate.effectiveDate}, fuente ${bcvRate.source})`,
        );
      }

      this.logger.log(
        `BCV rate fetched successfully: ${bcvRate.rate} (fecha valor ${bcvRate.effectiveDate}, fuente ${bcvRate.source})`,
      );
      return bcvRate;
    } catch (error: unknown) {
      this.logger.error(
        'Error fetching BCV rate:',
        error instanceof Error ? error.message : String(error),
      );
      if (this.cache) {
        this.logger.warn('Returning cached rate due to error');
        return this.cache;
      }
      return null;
    }
  }

  /**
   * Valida la respuesta del servicio. Se usa `rate` (truncado a 2 decimales) y
   * nunca `rateFull`: la columna es decimal(10,2) y Postgres redondearía,
   * reintroduciendo la discrepancia de un centavo contra la fuente.
   */
  private parseResponse(data: RatesServiceResponse | undefined): BCVRate {
    if (!data) {
      throw new Error('Empty response from rates service');
    }

    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid rate from rates service: ${data.rate}`);
    }

    if (!data.effectiveDate || !ISO_DATE.test(data.effectiveDate)) {
      throw new Error(
        `Invalid effectiveDate from rates service: ${data.effectiveDate}`,
      );
    }

    return {
      rate,
      effectiveDate: data.effectiveDate,
      source: data.source ?? 'unknown',
      stale: data.stale === true,
    };
  }

  calculateVESEquivalent(usdAmount: number, bcvRate: number): number {
    return Number((usdAmount * bcvRate).toFixed(2));
  }

  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
    this.logger.log('BCV rate cache cleared');
  }
}
