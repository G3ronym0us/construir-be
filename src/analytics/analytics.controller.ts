import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Registra una visita. Es público porque la tienda se navega sin sesión.
   *
   * Ya no se lee la IP de la petición: se guardaba en cada fila y no la
   * consultaba nadie (ver `PageView`). El `@Req` que la extraía se quitó
   * entero para que no quede a mano de un futuro descuido.
   *
   * **El límite de tasa es lo único que separa esta tabla de un vertedero.**
   * Al ser público y sin coste, cualquiera podía inflarlo con un bucle de
   * peticiones hasta llenar el disco de la base. 30 por minuto y por IP da
   * holgura de sobra a una navegación normal —un usuario real cambia de
   * página unas pocas veces por minuto— y corta el abuso automatizado.
   */
  @Post('page-view')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async trackPageView(@Body() createPageViewDto: CreatePageViewDto) {
    return this.analyticsService.trackPageView(createPageViewDto);
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
