import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiRequestLog } from './api-request-log.entity';
import { GetApiLogsDto } from './dto/get-api-logs.dto';

@Injectable()
export class ApiRequestLogsService {
  private readonly logger = new Logger(ApiRequestLogsService.name);

  constructor(
    @InjectRepository(ApiRequestLog)
    private apiRequestLogRepository: Repository<ApiRequestLog>,
  ) {}

  async create(data: Partial<ApiRequestLog>): Promise<ApiRequestLog | null> {
    try {
      const log = this.apiRequestLogRepository.create(data);
      return await this.apiRequestLogRepository.save(log);
    } catch (error) {
      // No bloquear respuesta si falla el logging
      this.logger.error('Failed to save API request log', error.stack);
      return null;
    }
  }

  async findAll(filters: GetApiLogsDto): Promise<{
    data: ApiRequestLog[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const {
      page = 1,
      limit = 50,
      isError,
      consumerKey,
      statusCode,
      path,
      startDate,
      endDate,
    } = filters;

    const queryBuilder = this.apiRequestLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.apiKey', 'apiKey')
      // Excluir columnas jsonb pesadas en el listado; se obtienen solo en findOne()
      .select([
        'log.id',
        'log.uuid',
        'log.method',
        'log.path',
        'log.query',
        'log.statusCode',
        'log.responseTime',
        'log.consumerKey',
        'log.ipAddress',
        'log.userAgent',
        'log.isError',
        'log.errorMessage',
        'log.createdAt',
        'apiKey.uuid',
        'apiKey.description',
        'apiKey.consumerKey',
      ]);

    if (isError !== undefined) {
      queryBuilder.andWhere('log.isError = :isError', { isError });
    }

    if (consumerKey) {
      queryBuilder.andWhere('log.consumerKey = :consumerKey', { consumerKey });
    }

    if (statusCode) {
      queryBuilder.andWhere('log.statusCode = :statusCode', { statusCode });
    }

    if (path) {
      queryBuilder.andWhere('log.path ILIKE :path', { path: `%${path}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // Contar con query separada (evita el DISTINCT subquery que genera getManyAndCount con joins)
    const total = await queryBuilder.getCount();

    queryBuilder.orderBy('log.createdAt', 'DESC');
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(uuid: string): Promise<ApiRequestLog | null> {
    return await this.apiRequestLogRepository.findOne({
      where: { uuid },
      relations: ['apiKey'],
    });
  }

  async getStats(): Promise<{
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    topPaths: { path: string; count: string }[];
  }> {
    // Una sola query para totales y promedio
    const summary = await this.apiRequestLogRepository
      .createQueryBuilder('log')
      .select('COUNT(*)', 'totalRequests')
      .addSelect('SUM(CASE WHEN log.isError = true THEN 1 ELSE 0 END)', 'totalErrors')
      .addSelect('AVG(log.responseTime)', 'avgResponseTime')
      .getRawOne();

    const totalRequests = parseInt(summary.totalRequests) || 0;
    const totalErrors = parseInt(summary.totalErrors) || 0;

    // Top paths sin query strings (agrupa por path base)
    const topPaths = await this.apiRequestLogRepository
      .createQueryBuilder('log')
      .select("SPLIT_PART(log.path, '?', 1)", 'path')
      .addSelect('COUNT(*)', 'count')
      .groupBy("SPLIT_PART(log.path, '?', 1)")
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      avgResponseTime: parseFloat(summary.avgResponseTime) || 0,
      topPaths,
    };
  }

  async deleteOldLogs(daysOld: number = 30): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - daysOld);

    const result = await this.apiRequestLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :date', { date })
      .execute();

    return result.affected ?? 0;
  }
}
