import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan } from 'typeorm';
import { PageView } from './page-view.entity';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { aOrigenDeReferrer } from './referrer.util';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PageView)
    private pageViewRepository: Repository<PageView>,
  ) {}

  /**
   * El recorte del referrer se hace aquí y no en el DTO a propósito: así se
   * aplica a todo el que llame al servicio, no sólo a lo que entra por HTTP, y
   * la regla queda en un único sitio (`aOrigenDeReferrer`).
   */
  async trackPageView(createPageViewDto: CreatePageViewDto): Promise<PageView> {
    const pageView = this.pageViewRepository.create({
      ...createPageViewDto,
      referrer: aOrigenDeReferrer(createPageViewDto.referrer),
    });

    return await this.pageViewRepository.save(pageView);
  }

  /**
   * Borra hasta `batchLimit` visitas anteriores a `retentionDays` días.
   *
   * La tabla no tenía ninguna política de retención: crecía sin techo desde el
   * primer día, y las dos únicas lecturas son "total" y "más visitadas", que no
   * necesitan el historial completo para nada. Guardar menos tiempo también
   * reduce lo que hay que entregar o proteger si algo pasa.
   *
   * El tope por ejecución no es adorno: era un `DELETE` único sobre una tabla
   * diseñada para crecer sin límite, así que la primera pasada sobre un
   * histórico grande habría sido un bloqueo largo en plena madrugada. Lo que no
   * entra hoy se borra mañana; el cron es diario y la tabla sólo crece con las
   * visitas del día.
   */
  async purgeOldPageViews(
    retentionDays: number,
    batchLimit: number,
  ): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Se seleccionan los ids primero porque `DELETE ... LIMIT` no existe en
    // Postgres; el `delete` por lista de ids es lo que respeta el tope.
    const aBorrar = await this.pageViewRepository.find({
      select: ['id'],
      where: { createdAt: LessThan(cutoff) },
      order: { id: 'ASC' },
      take: batchLimit,
    });

    if (aBorrar.length === 0) return 0;

    const result = await this.pageViewRepository.delete(
      aBorrar.map((fila) => fila.id),
    );

    return result.affected ?? aBorrar.length;
  }

  async getPageViewStats(): Promise<{
    totalViews: number;
    todayViews: number;
    monthViews: number;
  }> {
    // Total de visitas
    const totalViews = await this.pageViewRepository.count();

    // Visitas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayViews = await this.pageViewRepository.count({
      where: {
        createdAt: MoreThanOrEqual(today),
      },
    });

    // Visitas del mes actual
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthViews = await this.pageViewRepository.count({
      where: {
        createdAt: MoreThanOrEqual(startOfMonth),
      },
    });

    return {
      totalViews,
      todayViews,
      monthViews,
    };
  }

  async getMostVisitedPages(
    limit: number = 10,
  ): Promise<Array<{ path: string; viewCount: number }>> {
    const result = await this.pageViewRepository
      .createQueryBuilder('pv')
      .select('pv.path', 'path')
      .addSelect('COUNT(*)', 'viewCount')
      .where('pv.path IS NOT NULL')
      .groupBy('pv.path')
      .orderBy('viewCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      path: r.path,
      viewCount: parseInt(r.viewCount),
    }));
  }
}
