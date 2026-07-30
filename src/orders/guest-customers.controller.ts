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
   * Es público porque el checkout de invitados no tiene sesión, pero **exige un
   * segundo dato**: además de la identificación hay que enviar el correo o el
   * teléfono, y tiene que coincidir con el registrado.
   *
   * El motivo es que las cédulas venezolanas son secuenciales. Cuando bastaba
   * la cédula, cualquiera podía recorrerlas en orden y descargar nombre,
   * correo, teléfono, domicilio y coordenadas de todos los clientes que
   * hubieran comprado alguna vez. Con el segundo dato eso deja de ser posible:
   * hay que conocer de antemano el par identificación + contacto.
   *
   * Devuelve `null` de forma indistinguible ante cualquier fallo, para no
   * confirmar qué identificaciones están registradas.
   *
   * El límite de tasa es la segunda línea de defensa: encarece la prueba masiva
   * de pares identificación + contacto aunque alguien tuviera una lista.
   */
  @Get('search')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async searchByIdentification(
    @Query('identificationType') identificationType: IdentificationType,
    @Query('identificationNumber') identificationNumber: string,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
  ): Promise<GuestCustomer | null> {
    if (!identificationType || !identificationNumber) {
      return null;
    }

    return this.guestCustomersService.findForAutocomplete(
      identificationType,
      identificationNumber,
      { email, phone },
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
