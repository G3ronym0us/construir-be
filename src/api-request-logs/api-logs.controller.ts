import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiRequestLogsService } from './api-request-logs.service';
import { GetApiLogsDto } from './dto/get-api-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('admin/api-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ApiLogsController {
  constructor(
    private readonly apiRequestLogsService: ApiRequestLogsService,
  ) {}

  /**
   * Get all API request logs with filters (ADMIN only)
   */
  @Get()
  async findAll(@Query() filters: GetApiLogsDto) {
    return await this.apiRequestLogsService.findAll(filters);
  }

  /**
   * Get API statistics (ADMIN only)
   */
  @Get('stats/summary')
  async getStats() {
    return await this.apiRequestLogsService.getStats();
  }

  /**
   * Get single API log by UUID (ADMIN only)
   */
  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    const log = await this.apiRequestLogsService.findOne(uuid);
    if (!log) {
      throw new NotFoundException(`Log with UUID ${uuid} not found`);
    }
    return log;
  }

  /**
   * Delete old logs (ADMIN only)
   */
  @Delete('cleanup/:days')
  async deleteOldLogs(@Param('days', ParseIntPipe) days: number) {
    if (days < 7) {
      throw new BadRequestException('Cannot delete logs less than 7 days old');
    }
    const deleted = await this.apiRequestLogsService.deleteOldLogs(days);
    return { message: `Deleted ${deleted} old logs`, deleted };
  }
}
