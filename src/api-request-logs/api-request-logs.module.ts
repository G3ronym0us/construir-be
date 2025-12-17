import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiRequestLog } from './api-request-log.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { ApiRequestLogsService } from './api-request-logs.service';
import { ApiLoggingInterceptor } from './api-logging.interceptor';
import { ApiLogsController } from './api-logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiRequestLog, ApiKey])],
  providers: [ApiRequestLogsService, ApiLoggingInterceptor],
  controllers: [ApiLogsController],
  exports: [ApiRequestLogsService, ApiLoggingInterceptor],
})
export class ApiRequestLogsModule {}
