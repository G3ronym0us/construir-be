import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTasksService } from './analytics-tasks.service';
import { PageView } from './page-view.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PageView])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsTasksService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
