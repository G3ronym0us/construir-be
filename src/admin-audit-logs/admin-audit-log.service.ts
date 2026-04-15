import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog, AuditAction } from './admin-audit-log.entity';

export interface CreateAuditLogDto {
  userId: number | null;
  userEmail: string;
  userFullName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AdminAuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
  ) {}

  async log(entry: CreateAuditLogDto): Promise<void> {
    try {
      await this.repo.save(this.repo.create(entry));
    } catch (error) {
      console.error('[AuditLog] Failed to write audit log:', error);
    }
  }

  async findAll(filters: {
    resource?: string;
    action?: AuditAction;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const query = this.repo.createQueryBuilder('log');

    if (filters.resource) {
      query.andWhere('log.resource = :resource', {
        resource: filters.resource,
      });
    }
    if (filters.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }
    if (filters.startDate) {
      query.andWhere('log.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('log.createdAt', 'DESC');

    const total = await query.getCount();

    if (filters.limit) query.take(filters.limit);
    if (filters.offset) query.skip(filters.offset);

    const logs = await query.getMany();
    return { logs, total };
  }
}
