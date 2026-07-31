import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * El bloque que comparten las diez plantillas de correo: cabecera, pie y datos
 * de tienda.
 *
 * Antes cada método de `EmailService` lo armaba por su cuenta, con su propia
 * copia de los `configService.get` y del enlace del logo. Con diez plantillas
 * pidiendo lo mismo, eso es una desincronización esperando ocurrir.
 *
 * Los campos sin configurar salen `null` y no como cadena vacía: la plantilla
 * decide con `{{#if}}`, y `""` es un valor verdadero que le haría pintar un
 * enlace roto.
 */

export interface StoreInfo {
  name: string;
  address: string;
  city: string;
  hours: string;
  phone: string;
  email: string;
  mapUrl: string;
}

export interface CommonPayload {
  logoUrl: string;
  whatsappUrl: string | null;
  storeRif: string | null;
  store: StoreInfo;
}

@Injectable()
export class EmailPayloadBuilder {
  constructor(private readonly configService: ConfigService) {}

  private frontendUrl(): string {
    const url =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:4000';
    return url.replace(/\/+$/, '');
  }

  /** Vacío y ausente son lo mismo para la plantilla: ambos ocultan el bloque. */
  private opcional(clave: string): string | null {
    const valor = this.configService.get<string>(clave);
    return valor ? valor : null;
  }

  buildCommon(): CommonPayload {
    return {
      logoUrl: `${this.frontendUrl()}/construir-logo.png`,
      whatsappUrl: this.opcional('app.storeWhatsappUrl'),
      storeRif: this.opcional('app.storeRif'),
      store: {
        name: this.configService.get<string>('app.storeName') ?? '',
        address: this.configService.get<string>('app.storeAddress') ?? '',
        city: this.configService.get<string>('app.storeCity') ?? '',
        hours: this.configService.get<string>('app.storeHours') ?? '',
        phone: this.configService.get<string>('app.storePhone') ?? '',
        email: this.configService.get<string>('app.storeEmail') ?? '',
        mapUrl: this.configService.get<string>('app.storeMapUrl') ?? '',
      },
    };
  }

  trackingUrl(orderNumber: string): string {
    return `${this.frontendUrl()}/seguimiento/${orderNumber}`;
  }
}
