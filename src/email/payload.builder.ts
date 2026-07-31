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
  /**
   * Duplicado plano de cuatro campos de `store.*`, a propósito.
   *
   * El pie de página (`templates/partials/footer.hbs`) lee variables sueltas
   * (`storeAddress`, `storeHours`, `storePhone`, `storeEmail`) porque se
   * incluye con `{{> footer}}` dentro de layouts que ya usan `store.*` para
   * el cuerpo del correo, y el pie se escribió para no depender de cómo cada
   * plantilla nombra su objeto de tienda. El cuerpo, en cambio, usa la forma
   * anidada (`store.name`, `store.address`, etc.). No es un descuido: hacen
   * falta las dos formas. Si en algún momento se "limpia" esta duplicación
   * quitando una de las dos, el pie de página vuelve a salir vacío en los
   * cuatro correos.
   */
  storeAddress: string;
  storeHours: string;
  storePhone: string;
  storeEmail: string;
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
    const address = this.configService.get<string>('app.storeAddress') ?? '';
    const hours = this.configService.get<string>('app.storeHours') ?? '';
    const phone = this.configService.get<string>('app.storePhone') ?? '';
    const email = this.configService.get<string>('app.storeEmail') ?? '';

    return {
      logoUrl: `${this.frontendUrl()}/construir-logo.png`,
      whatsappUrl: this.opcional('app.storeWhatsappUrl'),
      storeRif: this.opcional('app.storeRif'),
      store: {
        name: this.configService.get<string>('app.storeName') ?? '',
        address,
        city: this.configService.get<string>('app.storeCity') ?? '',
        hours,
        phone,
        email,
        mapUrl: this.configService.get<string>('app.storeMapUrl') ?? '',
      },
      // Ver el comentario de `storeAddress` en `CommonPayload`: el pie de
      // página necesita estos mismos valores en forma plana.
      storeAddress: address,
      storeHours: hours,
      storePhone: phone,
      storeEmail: email,
    };
  }

  trackingUrl(orderNumber: string): string {
    return `${this.frontendUrl()}/seguimiento/${orderNumber}`;
  }
}
