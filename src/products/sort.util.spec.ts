import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  COLUMNAS_ORDENABLES,
  ORDEN_POR_DEFECTO,
  columnaOrdenableSegura,
  esColumnaOrdenable,
  sentidoOrdenSeguro,
} from './sort.util';
import {
  CatalogQueryDto,
  validarCatalogQuery,
} from './dto/catalog-query.dto';

/**
 * Dos huecos que encontró la revisión en `GET /products`, el listado público
 * del catálogo, que no lleva autenticación de ningún tipo:
 *
 *  1. `ProductsService` interpola el nombre de la columna en el SQL
 *     (`product.${sortBy}`) porque un ORDER BY no admite parámetros. No se
 *     consiguió explotar porque TypeORM rechaza lo que no sea una propiedad
 *     conocida de la entidad, pero eso es una salvaguarda de la librería y no
 *     nuestra. La lista blanca es defensa en profundidad.
 *
 *  2. El controlador hacía `parseInt(page)` a pelo, así que `?page=0`,
 *     `?page=-1` y `?page=abc` llegaban al servicio como 0, -1 y NaN y
 *     acababan en un `skip` negativo o NaN: Postgres reventaba y el endpoint
 *     respondía **500**. Cualquiera lo provocaba con la URL.
 */
describe('orden y paginación del catálogo', () => {
  describe('lista blanca de columnas ordenables', () => {
    it('acepta las columnas que el listado ofrece de verdad', () => {
      for (const columna of ['createdAt', 'name', 'price']) {
        expect(esColumnaOrdenable(columna)).toBe(true);
        expect(columnaOrdenableSegura(columna)).toBe(columna);
      }
    });

    it('no deja pasar al SQL nada que no esté en la lista', () => {
      const intentos = [
        'id); DROP TABLE products; --',
        'password',
        '(SELECT 1)',
        'name; --',
        '',
        undefined,
      ];

      for (const intento of intentos) {
        expect(columnaOrdenableSegura(intento as string)).toBe(
          ORDEN_POR_DEFECTO,
        );
      }
    });

    it('cae al orden por defecto en vez de lanzar', () => {
      // El panel de admin puede tener un `sortBy` viejo guardado en un enlace:
      // mejor un listado ordenado por fecha que un 500.
      expect(columnaOrdenableSegura('columnaQueYaNoExiste')).toBe('createdAt');
    });

    it('el orden por defecto está en la propia lista', () => {
      expect(COLUMNAS_ORDENABLES).toContain(ORDEN_POR_DEFECTO);
    });
  });

  describe('sentido del orden', () => {
    it('acepta ASC y DESC sin importar cómo se escriban', () => {
      expect(sentidoOrdenSeguro('ASC')).toBe('ASC');
      expect(sentidoOrdenSeguro('asc')).toBe('ASC');
      expect(sentidoOrdenSeguro('DESC')).toBe('DESC');
    });

    it('cualquier otra cosa se trata como DESC', () => {
      for (const basura of ['ASC; --', 'RANDOM()', '', undefined]) {
        expect(sentidoOrdenSeguro(basura as string)).toBe('DESC');
      }
    });
  });

  describe('CatalogQueryDto', () => {
    const validar = async (query: Record<string, unknown>) =>
      validate(plainToInstance(CatalogQueryDto, query));

    /** Los campos que fallaron la validación. */
    const camposConError = async (query: Record<string, unknown>) =>
      (await validar(query)).map((e) => e.property);

    it('una petición sin parámetros es válida (el catálogo entero)', async () => {
      expect(await validar({})).toHaveLength(0);
    });

    it('rechaza las páginas que antes daban 500', async () => {
      // Medido contra el backend anterior: los tres respondían 500.
      for (const page of ['0', '-1', 'abc']) {
        expect(await camposConError({ page })).toContain('page');
      }
    });

    it('acepta una página normal', async () => {
      expect(await validar({ page: '3' })).toHaveLength(0);
      expect(plainToInstance(CatalogQueryDto, { page: '3' }).page).toBe(3);
    });

    it('rechaza límites absurdos para que nadie se lleve el catálogo entero', async () => {
      expect(await camposConError({ limit: '0' })).toContain('limit');
      expect(await camposConError({ limit: '99999' })).toContain('limit');
      expect(await validar({ limit: '100' })).toHaveLength(0);
    });

    it('rechaza un sortBy fuera de la lista blanca', async () => {
      expect(await camposConError({ sortBy: 'password' })).toContain('sortBy');
      expect(await validar({ sortBy: 'price' })).toHaveLength(0);
    });

    it('rechaza un sortOrder inventado y acepta minúsculas', async () => {
      expect(await camposConError({ sortOrder: 'RANDOM()' })).toContain(
        'sortOrder',
      );
      expect(await validar({ sortOrder: 'asc' })).toHaveLength(0);
    });

    it('rechaza una categoría que no es un uuid', async () => {
      expect(await camposConError({ categoryUuid: 'PINTURA' })).toContain(
        'categoryUuid',
      );
    });

    it('deja pasar cualquier búsqueda razonable', async () => {
      // La búsqueda no se restringe: va parametrizada y con los comodines
      // escapados, así que el usuario puede escribir lo que quiera.
      for (const search of ['pint azul', "'; DROP TABLE products; --", '50%']) {
        expect(await validar({ search })).toHaveLength(0);
      }
    });

    it('corta una búsqueda desmedida', async () => {
      expect(await camposConError({ search: 'a'.repeat(500) })).toContain(
        'search',
      );
    });
  });

  /**
   * El DTO se valida a mano y no declarándolo como tipo del `@Query()`, porque
   * el `ValidationPipe` global lleva `forbidNonWhitelisted: true` y con eso un
   * `?utm_source=whatsapp` pegado en un enlace compartido devolvía 400 y
   * dejaba el catálogo en blanco. En una tienda que se comparte por WhatsApp
   * ése es el caso normal, no el raro.
   */
  describe('validarCatalogQuery', () => {
    it('ignora los parámetros de más de un enlace compartido', () => {
      expect(() =>
        validarCatalogQuery({ utm_source: 'whatsapp', fbclid: 'abc123' }),
      ).not.toThrow();
    });

    it('los parámetros de más no estorban a los buenos', () => {
      const dto = validarCatalogQuery({
        search: 'pint azul',
        page: '2',
        utm_source: 'whatsapp',
      });

      expect(dto.search).toBe('pint azul');
      expect(dto.page).toBe(2);
    });

    it('sigue dando 400 en los parámetros que sí conocemos', () => {
      for (const malo of [
        { page: '0' },
        { page: 'abc' },
        { limit: '99999' },
        { sortBy: 'password' },
      ]) {
        expect(() => validarCatalogQuery(malo)).toThrow(BadRequestException);
      }
    });

    it('el error dice qué parámetro está mal', () => {
      try {
        validarCatalogQuery({ page: '0' });
        throw new Error('debería haber lanzado');
      } catch (error) {
        expect(JSON.stringify((error as BadRequestException).getResponse())).toContain(
          'page',
        );
      }
    });

    it('convierte los números que llegan como texto en la URL', () => {
      const dto = validarCatalogQuery({ page: '3', limit: '24' });

      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(24);
    });
  });
});
