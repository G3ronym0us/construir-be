import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan } from 'typeorm';
import { PageView } from './page-view.entity';
import { CreatePageViewDto } from './dto/create-page-view.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PageView)
    private pageViewRepository: Repository<PageView>,
  ) {}

  async trackPageView(createPageViewDto: CreatePageViewDto): Promise<PageView> {
    const pageView = this.pageViewRepository.create(createPageViewDto);

    return await this.pageViewRepository.save(pageView);
  }

  /**
   * Borra las visitas anteriores a `retentionDays` días.
   *
   * La tabla no tenía ninguna política de retención: crecía sin techo desde el
   * primer día, y las dos únicas lecturas son "total" y "más visitadas", que no
   * necesitan el historial completo para nada. Guardar menos tiempo también
   * reduce lo que hay que entregar o proteger si algo pasa.
   */
  async purgeOldPageViews(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.pageViewRepository.delete({
      createdAt: LessThan(cutoff),
    });

    return result.affected ?? 0;
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
