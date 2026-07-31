import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderAdminGuard } from '../auth/guards/order-admin.guard';

@Controller('guest-customers')
export class GuestCustomersController {
  constructor(private readonly guestCustomersService: GuestCustomersService) {}

  /**
   * Autocompleta el formulario de checkout de un invitado que ya compró antes.
   *
   * Basta la identificación. Es público porque el checkout de invitados no
   * tiene sesión, y se decidió que pedir un segundo dato estorbaba más de lo
   * que protegía: el comprador no tiene por qué recordar con qué correo o
   * teléfono compró la vez pasada.
   *
   * El riesgo asumido es real y conviene tenerlo presente: las cédulas
   * venezolanas son secuenciales, así que quien recorra números en orden va
   * obteniendo nombre, correo, teléfono y domicilio de cada cliente que haya
   * comprado alguna vez.
   *
   * **El límite de tasa es la única contención que queda, no lo quites.** A 5
   * consultas por minuto, barrer un rango de millones de cédulas desde una IP
   * pasa a tomar años. Si algún día hace falta más, el siguiente paso natural
   * es exigir el correo o el teléfono como segundo dato.
   */
  @Get('search')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async searchByIdentification(
    @Query('identificationType') identificationType: IdentificationType,
    @Query('identificationNumber') identificationNumber: string,
  ): Promise<GuestCustomer | null> {
    if (!identificationType || !identificationNumber) {
      return null;
    }

    return this.guestCustomersService.findForAutocomplete(
      identificationType,
      identificationNumber,
    );
  }

  /**
   * Lista todos los clientes guest (solo admin)
   * Para campañas de marketing
   */
  @Get()
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ data: GuestCustomer[]; total: number }> {
    const [data, total] = await Promise.all([
      this.guestCustomersService.findAll(limit || 100, offset || 0),
      this.guestCustomersService.count(),
    ]);

    return { data, total };
  }
}
