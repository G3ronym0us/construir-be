import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StoreInfoResponseDto } from './store-info.dto';

@ApiTags('Store Info V1')
@Controller('api/v1/store-info')
export class StoreInfoV1Controller {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Datos de contacto de la tienda física.
   *
   * Es el único endpoint de /api/v1 sin ApiKeyGuard, a propósito: lo consume el
   * storefront —que no tiene clave de API— para el paso de retiro en tienda, el
   * pie de página y la ficha de la cuenta. No expone nada que no esté ya en la
   * web pública, así que no hay nada que proteger.
   *
   * La fuente son las variables STORE_* del entorno. Si alguna falta, sale
   * como cadena vacía —no hay valores de relleno— y quien la consume oculta
   * el campo en lugar de mostrar un marcador de posición al comprador.
   */
  @Get()
  @ApiOperation({
    summary: 'Datos de contacto de la tienda',
    description:
      'Endpoint público, sin clave de API. Devuelve nombre, dirección, teléfono, correo, horario y URL del mapa.',
  })
  @ApiOkResponse({ type: StoreInfoResponseDto })
  getStoreInfo(): StoreInfoResponseDto {
    return {
      name: this.configService.get<string>('app.storeName') ?? '',
      address: this.configService.get<string>('app.storeAddress') ?? '',
      city: this.configService.get<string>('app.storeCity') ?? '',
      phone: this.configService.get<string>('app.storePhone') ?? '',
      email: this.configService.get<string>('app.storeEmail') ?? '',
      whatsapp: this.whatsapp(),
      hours: this.configService.get<string>('app.storeHours') ?? '',
      mapUrl: this.configService.get<string>('app.storeMapUrl') ?? '',
    };
  }

  /**
   * El número sale de STORE_WHATSAPP_URL, la misma variable que usan los
   * correos, para que la web y las plantillas no puedan apuntar a chats
   * distintos. El storefront tenía su propia copia en el build y llegó a
   * producción con otro número. Se sirve sólo el número porque la web arma el
   * enlace con su mensaje precargado.
   */
  private whatsapp(): string {
    const url = this.configService.get<string>('app.storeWhatsappUrl') ?? '';
    return /wa\.me\/(\d+)/.exec(url)?.[1] ?? '';
  }
}
