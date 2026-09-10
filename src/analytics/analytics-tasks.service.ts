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
    const retentionDays = this.configService.get<number | null>(
      'analytics.pageViewRetentionDays',
    );

    // La configuración ya rechaza lo que no sea un entero positivo y entrega
    // `null` en ese caso. Aquí sólo queda decidir qué hacer con esa ausencia, y
    // la respuesta es no borrar: un plazo que no se entiende no puede
    // convertirse en un borrado, porque los datos borrados no vuelven.
    if (retentionDays === null || retentionDays === undefined) {
      this.logger.warn(
        'ANALYTICS_PAGE_VIEW_RETENTION_DAYS no es un entero positivo; ' +
          'no se purga nada. Revísalo: la tabla seguirá creciendo.',
      );
      return;
    }

    const batchLimit =
      this.configService.get<number>('analytics.pageViewPurgeBatchLimit') ??
      50000;

    try {
      const deleted = await this.analyticsService.purgeOldPageViews(
        retentionDays,
        batchLimit,
      );

      // Que se haya llenado el lote se dice explícitamente: si no, una purga
      // que va con retraso crónico parece una purga que funciona.
      const restoPendiente = deleted >= batchLimit;
      this.logger.log(
        `Purga de page_views: ${deleted} visitas anteriores a ${retentionDays} días` +
          (restoPendiente
            ? ` (tope de ${batchLimit} alcanzado; el resto se borra mañana)`
            : ''),
      );
    } catch (error) {
      this.logger.error('Error al purgar page_views:', error);
    }
  }
}
