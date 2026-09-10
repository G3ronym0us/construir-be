import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
   * peticiones hasta llenar el disco de la base.
   *
   * El techo son 240 por minuto **y por visitante**. Lo de "por visitante" lo
   * garantiza `VisitanteThrottlerGuard` y no el guard de serie: sin él todas
   * las visitas compartían el cubo del proxy y la tienda entera quedaba
   * limitada al techo de una sola persona. Ese guard ya no se declara acá: es
   * el `APP_GUARD` de toda la aplicación (`app.module.ts`), y declararlo
   * además en la ruta lo haría correr DOS veces, gastando dos peticiones del
   * cupo por cada visita registrada. Sólo queda el `@Throttle`, que baja el
   * techo global de 600 a los 240 que le corresponden a esta ruta.
   *
   * 240 y no 30: se midió que a 63 cambios de ruta por minuto —un cliente
   * dándole a atrás y adelante entre productos llega ahí sin esfuerzo— con 30
   * se perdía el 27% de las visitas, y se perdían en silencio, porque el
   * registro no avisa de sus fallos. El límite está para frenar un bucle
   * automatizado, no para estorbar a quien navega rápido: 4 por segundo
   * sostenidos ya no es una persona.
   */
  @Post('page-view')
  @Throttle({ default: { limit: 240, ttl: 60000 } })
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
