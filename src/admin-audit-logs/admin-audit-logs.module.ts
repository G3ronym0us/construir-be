import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  providers: [AdminAuditLogService, AuditLogInterceptor],
  controllers: [AdminAuditLogsController],
  exports: [AdminAuditLogService, AuditLogInterceptor],
})
export class AdminAuditLogsModule {}
