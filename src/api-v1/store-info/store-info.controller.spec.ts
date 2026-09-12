import { ConfigService } from '@nestjs/config';
import { StoreInfoV1Controller } from './store-info.controller';

const controllerCon = (valores: Record<string, string | undefined>) =>
  new StoreInfoV1Controller({
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService);

describe('StoreInfoV1Controller', () => {
  it('sirve el número de WhatsApp sacado de STORE_WHATSAPP_URL', () => {
    const info = controllerCon({
      'app.storeWhatsappUrl': 'https://wa.me/584141925544',
    }).getStoreInfo();

    expect(info.whatsapp).toBe('584141925544');
  });

  it('ignora el mensaje precargado si la URL lo trae', () => {
    const info = controllerCon({
      'app.storeWhatsappUrl': 'https://wa.me/584141925544?text=Hola',
    }).getStoreInfo();

    expect(info.whatsapp).toBe('584141925544');
  });

  it('devuelve cadena vacía si no está configurado o no es un enlace de wa.me', () => {
    expect(controllerCon({}).getStoreInfo().whatsapp).toBe('');
    expect(
      controllerCon({
        'app.storeWhatsappUrl': 'https://example.com',
      }).getStoreInfo().whatsapp,
    ).toBe('');
  });
});
