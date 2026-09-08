import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderAdminGuard } from '../auth/guards/order-admin.guard';
import { GuestCustomerAutocomplete } from './guest-customer-autocomplete';

@Controller('guest-customers')
export class GuestCustomersController {
  constructor(private readonly guestCustomersService: GuestCustomersService) {}

  /**
   * Autocompleta el formulario de checkout de un invitado que ya compró antes.
   *
   * Sigue siendo público —el checkout de invitados no tiene sesión— pero ya no
   * basta la identificación. Antes sí, y era un agujero: las cédulas
   * venezolanas son secuenciales, así que quien recorriera números en orden
   * iba sacando nombre, correo, teléfono y domicilio de cada cliente que
   * hubiera comprado alguna vez. El límite de tasa sólo encarecía el barrido
   * desde una IP; desde muchas no impedía nada.
   *
   * El segundo dato es el **teléfono**, y hay dos razones para que sea ese y
   * no el correo: el cliente que vuelve se lo sabe de memoria, y lo iba a
   * escribir igual en el paso siguiente del checkout, así que el
   * autocompletado no pierde nada a cambio. Se piden juntos en la primera
   * pantalla del paso de contacto.
   *
   * **Los tres casos negativos devuelven exactamente lo mismo** —cuerpo vacío,
   * 200— y por el mismo camino: que falten parámetros, que no exista la cédula
   * o que no coincida el teléfono. Distinguirlos volvería a permitir enumerar
   * cédulas, sólo que cosechando un sí/no en vez de la ficha completa.
   *
   * **El límite de tasa se queda, no lo quites.** Ya no es la única contención,
   * pero es lo que evita que alguien que sí conoce un teléfono lo pruebe
   * contra un rango de cédulas.
   */
  @Get('search')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async searchByIdentification(
    @Query('identificationType') identificationType: IdentificationType,
    @Query('identificationNumber') identificationNumber: string,
    @Query('phone') phone: string,
  ): Promise<GuestCustomerAutocomplete | null> {
    if (!identificationType || !identificationNumber || !phone) {
      return null;
    }

    return this.guestCustomersService.findForAutocomplete(
      identificationType,
      identificationNumber,
      phone,
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
