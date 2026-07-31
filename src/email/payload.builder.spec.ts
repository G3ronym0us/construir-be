import { EmailPayloadBuilder } from './payload.builder';
import { ConfigService } from '@nestjs/config';

function builderCon(valores: Record<string, string>): EmailPayloadBuilder {
  const config = {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;

  return new EmailPayloadBuilder(config);
}

const COMPLETO = {
  'app.frontendUrl': 'https://constru-ir.com',
  'app.storeName': 'Construir',
  'app.storeAddress': 'Av. Bolívar 123',
  'app.storeCity': 'Ciudad Bolívar',
  'app.storeHours': 'Lunes a Viernes 8-5',
  'app.storePhone': '+58 285 632 0178',
  'app.storeEmail': 'info@constru-ir.com',
  'app.storeMapUrl': 'https://maps.example/1',
  'app.storeWhatsappUrl': 'https://wa.me/584120000000',
  'app.storeRif': 'J-12345678-9',
};

describe('EmailPayloadBuilder', () => {
  it('arma el bloque común con los datos de la tienda', () => {
    const comun = builderCon(COMPLETO).buildCommon();

    expect(comun.whatsappUrl).toBe('https://wa.me/584120000000');
    expect(comun.storeRif).toBe('J-12345678-9');
    expect(comun.store.name).toBe('Construir');
    expect(comun.store.address).toBe('Av. Bolívar 123');
    expect(comun.logoUrl).toBe('https://constru-ir.com/construir-logo.png');
  });

  // Un enlace de WhatsApp a medias es peor que ninguno: la plantilla oculta el
  // bloque cuando llega null, y no puede distinguir null de cadena vacía.
  it('devuelve null cuando el WhatsApp no está configurado', () => {
    const comun = builderCon({
      ...COMPLETO,
      'app.storeWhatsappUrl': '',
    }).buildCommon();

    expect(comun.whatsappUrl).toBeNull();
  });

  it('devuelve null cuando el RIF no está configurado', () => {
    const comun = builderCon({ ...COMPLETO, 'app.storeRif': '' }).buildCommon();

    expect(comun.storeRif).toBeNull();
  });

  it('arma el enlace de seguimiento con el número de pedido', () => {
    expect(builderCon(COMPLETO).trackingUrl('ORD-MS92XZW4-ASXE')).toBe(
      'https://constru-ir.com/seguimiento/ORD-MS92XZW4-ASXE',
    );
  });

  it('no deja doble barra cuando la url del front termina en una', () => {
    const builder = builderCon({
      ...COMPLETO,
      'app.frontendUrl': 'https://constru-ir.com/',
    });

    expect(builder.trackingUrl('ORD-1')).toBe(
      'https://constru-ir.com/seguimiento/ORD-1',
    );
  });
});
