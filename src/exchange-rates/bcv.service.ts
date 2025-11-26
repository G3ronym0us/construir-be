import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface BCVResponse {
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

interface BCVRate {
  rate: number;
  lastUpdated: string;
}

@Injectable()
export class BCVService {
  private readonly logger = new Logger(BCVService.name);
  private cache: BCVRate | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private readonly API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

  constructor(private readonly httpService: HttpService) {}

  async getBCVRate(): Promise<BCVRate | null> {
    try {
      // Verificar cache
      if (this.cache && Date.now() < this.cacheExpiry) {
        this.logger.debug('Returning cached BCV rate');
        return this.cache;
      }

      this.logger.log('Fetching BCV rate from API...');
      const response = await firstValueFrom(
        this.httpService.get<BCVResponse>(this.API_URL),
      );

      if (!response.data) {
        throw new Error('Empty response from BCV API');
      }

      const bcvRate: BCVRate = {
        rate: response.data.promedio,
        lastUpdated: response.data.fechaActualizacion,
      };

      // Actualizar cache
      this.cache = bcvRate;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      this.logger.log(`BCV rate fetched successfully: ${bcvRate.rate}`);
      return bcvRate;
    } catch (error) {
      this.logger.error('Error fetching BCV rate:', error.message);
      if (this.cache) {
        this.logger.warn('Returning cached rate due to error');
        return this.cache;
      }
      return null;
    }
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
