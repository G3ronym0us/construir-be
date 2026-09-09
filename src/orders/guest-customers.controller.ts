import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderAdminGuard } from '../auth/guards/order-admin.guard';
import { GuestCustomerAutocomplete } from './guest-customer-autocomplete';

/** Los cinco tipos que acepta la columna, para rechazar el resto sin ir a la base. */
const TIPOS_DE_IDENTIFICACION = new Set<string>(
  Object.values(IdentificationType),
);

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
   *
   * Lo que sí cambió: el `@UseGuards(ThrottlerGuard)` que había acá usaba el
   * guard de serie, que cuenta por `req.ip`. Sin `trust proxy` eso es la IP
   * del proxy para todo el mundo, así que estas 5 búsquedas por minuto se las
   * repartía la tienda entera — el límite era mucho más duro de lo que decía
   * y podía dejar sin autocompletar a clientes que no habían buscado nada.
   * Ahora cuenta el guard global (`VisitanteThrottlerGuard`), que sí distingue
   * visitantes, y acá queda sólo el `@Throttle` con el techo de la ruta.
   */
  @Get('search')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async searchByIdentification(
    @Query('identificationType') identificationType: IdentificationType,
    @Query('identificationNumber') identificationNumber: string,
    @Query('phone') phone: string,
  ): Promise<GuestCustomerAutocomplete | null> {
    if (!identificationType || !identificationNumber || !phone) {
      return null;
    }

    // `identification_type` es un enum de Postgres: un valor que no está en la
    // lista reventaba la consulta y salía un 500. No era canal de enumeración
    // —los cinco tipos válidos son públicos y no dicen nada de ningún
    // cliente—, pero un parámetro mal escrito es un 400, no un error del
    // servidor: el 500 sólo servía para ensuciar el log de errores reales.
    if (!TIPOS_DE_IDENTIFICACION.has(identificationType)) {
      throw new BadRequestException(
        `identificationType debe ser uno de: ${[...TIPOS_DE_IDENTIFICACION].join(', ')}`,
      );
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
