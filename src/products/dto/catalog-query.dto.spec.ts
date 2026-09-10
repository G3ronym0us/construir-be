import { BadRequestException } from '@nestjs/common';
import { validarCatalogQuery } from './catalog-query.dto';

describe('validarCatalogQuery — filtros de precio y de stock', () => {
  it('convierte a número los filtros que vienen como texto en la URL', () => {
    const dto = validarCatalogQuery({
      minPrice: '5.5',
      maxPrice: '20',
      minInventory: '6',
    });

    expect(dto.minPrice).toBe(5.5);
    expect(dto.maxPrice).toBe(20);
    expect(dto.minInventory).toBe(6);
  });

  // `Number('')` es 0. Sin el transformador, un formulario al que se le borra
  // el campo mandaría `?minPrice=` y el catálogo quedaría filtrado "desde 0"
  // para siempre, con el parámetro pegado en la URL sin hacer nada visible.
  it('trata el parámetro vacío como filtro ausente, no como cero', () => {
    const dto = validarCatalogQuery({ minPrice: '', maxPrice: '' });

    expect(dto.minPrice).toBeUndefined();
    expect(dto.maxPrice).toBeUndefined();
  });

  it('deja pasar el cero explícito como filtro puesto', () => {
    const dto = validarCatalogQuery({ minPrice: '0' });

    expect(dto.minPrice).toBe(0);
  });

  it('rechaza con 400 un precio que no es un número', () => {
    expect(() => validarCatalogQuery({ minPrice: 'abc' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza con 400 un precio negativo', () => {
    expect(() => validarCatalogQuery({ maxPrice: '-1' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza con 400 un inventario mínimo con decimales', () => {
    expect(() => validarCatalogQuery({ minInventory: '2.5' })).toThrow(
      BadRequestException,
    );
  });

  /**
   * Ésta es la regresión concreta que ya se pagó una vez en esta pantalla:
   * declarar el DTO como tipo del `@Query()` haría que el `ValidationPipe`
   * global, con `forbidNonWhitelisted: true`, devolviera 400 ante cualquier
   * parámetro desconocido. En una tienda que se comparte por WhatsApp, un
   * `?utm_source=whatsapp` pegado al enlace dejaba el catálogo en blanco.
   * Añadir filtros nuevos no puede revivir eso.
   */
  it('ignora en silencio los parámetros de campañas pegados al enlace', () => {
    const dto = validarCatalogQuery({
      utm_source: 'whatsapp',
      fbclid: 'IwAR0',
      minPrice: '5',
    });

    expect(dto.minPrice).toBe(5);
  });

  it('sigue validando lo que ya validaba antes de los filtros', () => {
    expect(() => validarCatalogQuery({ page: '0' })).toThrow(
      BadRequestException,
    );
    expect(() => validarCatalogQuery({ limit: '500' })).toThrow(
      BadRequestException,
    );
    expect(validarCatalogQuery({ page: '3', limit: '12' }).page).toBe(3);
  });
});
