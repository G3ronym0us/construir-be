import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('page-view')
  async trackPageView(
    @Body() createPageViewDto: CreatePageViewDto,
    @Req() request: Request,
  ) {
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress;

    return this.analyticsService.trackPageView(createPageViewDto, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('page-views')
  async getPageViewStats() {
    return this.analyticsService.getPageViewStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('most-visited')
  async getMostVisitedPages() {
    return this.analyticsService.getMostVisitedPages(10);
  }
}
