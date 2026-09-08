import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

/**
 * Purga programada de `page_views`.
 *
 * La tabla no tenía retención ninguna: cada navegación de cada visitante
 * quedaba guardada para siempre. Crecía sin techo aunque lo único que se
 * consulta de ella son totales y el ranking de páginas, y cuanto más historial
 * se acumula más grande es el problema si algún día se filtra.
 *
 * Corre de madrugada, en hora de Caracas, para no competir con el tráfico de
 * la tienda ni con el recálculo de precios de la 1 AM.
 */
@Injectable()
export class AnalyticsTasksService {
  private readonly logger = new Logger(AnalyticsTasksService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('30 3 * * *', {
    name: 'purge-page-views',
    timeZone: 'America/Caracas',
  })
  async handleDailyPageViewPurge(): Promise<void> {
    const retentionDays = this.configService.get<number>(
      'analytics.pageViewRetentionDays',
    );

    // Un valor no numérico o absurdo en el entorno no debe traducirse en
    // borrarlo todo: si no se entiende, no se borra nada y queda dicho.
    if (!retentionDays || !Number.isFinite(retentionDays) || retentionDays < 1) {
      this.logger.warn(
        `ANALYTICS_PAGE_VIEW_RETENTION_DAYS inválido (${retentionDays}); no se purga nada`,
      );
      return;
    }

    try {
      const deleted =
        await this.analyticsService.purgeOldPageViews(retentionDays);
      this.logger.log(
        `Purga de page_views: ${deleted} visitas anteriores a ${retentionDays} días`,
      );
    } catch (error) {
      this.logger.error('Error al purgar page_views:', error);
    }
  }
}
