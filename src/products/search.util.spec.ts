import { Brackets, WhereExpressionBuilder } from 'typeorm';
import {
  aplicarBusquedaDeProductos,
  escaparComodinesLike,
  normalizarTermino,
  separarTerminos,
} from './search.util';

/**
 * Regresión reportada por el cliente: buscó "pint azul" en /productos y no
 * salió NINGÚN producto, aunque el catálogo tiene 24 pinturas azules.
 *
 * La causa era que la búsqueda pasaba lo escrito entero como una sola cadena a
 * `ILIKE '%pint azul%'`, o sea que exigía la frase literal y en ese orden. Los
 * productos se llaman "PINT PLAST AZUL 1G SOLINTEX 185": las dos palabras
 * están, pero nunca pegadas, así que la frase no casaba nunca.
 *
 * Comprobado contra construir_db antes del arreglo:
 *   name ILIKE '%pint azul%'                ->  0 productos
 *   name ILIKE '%pint%' AND name ILIKE '%azul%' -> 24 productos
 *
 * A esto se suma que el catálogo está cargado en MAYÚSCULAS y sin tildes
 * ("PINT TRAFICO AMARILLO SEÑAL"), mientras que la gente escribe en minúscula
 * y con tildes. Por eso los dos lados de la comparación se normalizan.
 */
describe('búsqueda del catálogo de productos', () => {
  /**
   * Doble del QueryBuilder que sólo anota las condiciones que se le piden, sin
   * tocar la base. Lo que importa aquí es la FORMA de la consulta: un
   * `andWhere` por término (AND entre términos) y dentro un grupo de `orWhere`
   * por columna (OR entre columnas).
   */
  function crearBuilderFalso() {
    const condiciones: { sql: string; parametros: Record<string, unknown> }[] =
      [];

    const builder = {
      andWhere(
        condicion: Brackets | string,
        parametros: Record<string, unknown> = {},
      ) {
        if (condicion instanceof Brackets) {
          const orWheres: string[] = [];
          condicion.whereFactory({
            orWhere(sql: string) {
              orWheres.push(sql);
              return this;
            },
            andWhere() {
              return this;
            },
            where() {
              return this;
            },
          } as unknown as WhereExpressionBuilder);
          condiciones.push({ sql: orWheres.join(' OR '), parametros });
        } else {
          condiciones.push({ sql: condicion, parametros });
        }
        return builder;
      },
    };

    return { builder, condiciones };
  }

  /** Los `%término%` que la consulta acabaría exigiendo, en orden. */
  function patronesExigidos(busqueda: string): string[] {
    const { builder, condiciones } = crearBuilderFalso();
    aplicarBusquedaDeProductos(
      builder as unknown as WhereExpressionBuilder,
      busqueda,
    );
    return condiciones.flatMap((c) => Object.values(c.parametros) as string[]);
  }

  describe('separarTerminos', () => {
    it('parte "pint azul" en dos términos independientes', () => {
      expect(separarTerminos('pint azul')).toEqual(['pint', 'azul']);
    });

    it('ignora los espacios de sobra que deja escribir a las apuradas', () => {
      expect(separarTerminos('  pint   azul  ')).toEqual(['pint', 'azul']);
    });

    it('no devuelve términos cuando no se buscó nada', () => {
      expect(separarTerminos(undefined)).toEqual([]);
      expect(separarTerminos('')).toEqual([]);
      expect(separarTerminos('   ')).toEqual([]);
    });

    it('no deja que una parrafada dispare una consulta enorme', () => {
      const muchos = separarTerminos(
        Array.from({ length: 30 }, (_, i) => `palabra${i}`).join(' '),
      );
      expect(muchos).toHaveLength(8);
      expect(separarTerminos('a'.repeat(200))[0]).toHaveLength(60);
    });
  });

  describe('normalizarTermino', () => {
    it('baja a minúsculas: el catálogo está todo en MAYÚSCULAS', () => {
      expect(normalizarTermino('PINT')).toBe('pint');
    });

    it('quita las tildes que el catálogo no tiene pero la gente sí escribe', () => {
      expect(normalizarTermino('Válvula')).toBe('valvula');
      expect(normalizarTermino('CASTAÑO')).toBe('castano');
      expect(normalizarTermino('Señal')).toBe('senal');
    });
  });

  /**
   * Regresión aparte, encontrada en la revisión: el patrón se armaba como
   * `%${termino}%` sin escapar, así que `%` y `_` seguían siendo comodines de
   * LIKE dentro de lo que el usuario escribía.
   *
   * Medido contra la API antes de escapar:
   *   search=%     -> 1089 productos (el catálogo entero)
   *   search=_     -> 1089 productos
   *   search=p_nt  ->  208 productos, casando "pint", "pant" y "pnt"
   *
   * No era inyección — el término sí viaja parametrizado — pero quien pegara
   * un SKU o un código de barras con "_" obtenía resultados de más.
   */
  describe('escaparComodinesLike', () => {
    it('el % del usuario se busca como un % literal, no como comodín', () => {
      expect(escaparComodinesLike('50%')).toBe('50\\%');
    });

    it('el _ del usuario se busca como un _ literal', () => {
      expect(escaparComodinesLike('SKU_123')).toBe('SKU\\_123');
    });

    it('escapa la barra invertida ANTES que los comodines', () => {
      // Si se escapara al revés, la barra que añade el escapado de `%` se
      // volvería a escapar y el comodín quedaría suelto otra vez.
      expect(escaparComodinesLike('a\\%b')).toBe('a\\\\\\%b');
    });

    it('deja en paz lo que no lleva comodines', () => {
      expect(escaparComodinesLike('pint')).toBe('pint');
      expect(escaparComodinesLike('tubo 1/2"')).toBe('tubo 1/2"');
    });

    it('el patrón que llega al SQL lleva los comodines escapados', () => {
      expect(patronesExigidos('p_nt')).toEqual(['%p\\_nt%']);
      expect(patronesExigidos('%')).toEqual(['%\\%%']);
    });

    it('la condición declara ESCAPE para que Postgres lo respete', () => {
      const { builder, condiciones } = crearBuilderFalso();
      aplicarBusquedaDeProductos(
        builder as unknown as WhereExpressionBuilder,
        'pint',
      );

      expect(condiciones[0].sql).toContain("ESCAPE '\\'");
    });
  });

  describe('aplicarBusquedaDeProductos', () => {
    it('exige "pint" Y "azul" por separado, no la frase "pint azul"', () => {
      expect(patronesExigidos('pint azul')).toEqual(['%pint%', '%azul%']);
    });

    it('encuentra igual si las palabras van al revés', () => {
      expect(patronesExigidos('azul pint')).toEqual(['%azul%', '%pint%']);
    });

    it('otro caso real del catálogo: "cemento gris"', () => {
      expect(patronesExigidos('CEMENTO Gris')).toEqual(['%cemento%', '%gris%']);
    });

    it('normaliza lo escrito antes de comparar', () => {
      expect(patronesExigidos('Pínt Azúl')).toEqual(['%pint%', '%azul%']);
    });

    it('una sola palabra sigue funcionando como antes', () => {
      expect(patronesExigidos('cemento')).toEqual(['%cemento%']);
    });

    it('no añade ninguna condición si no se buscó nada', () => {
      const { builder, condiciones } = crearBuilderFalso();
      aplicarBusquedaDeProductos(
        builder as unknown as WhereExpressionBuilder,
        '   ',
      );
      expect(condiciones).toHaveLength(0);
    });

    it('cada término se busca en nombre, nombre propio, SKU y código de barras', () => {
      const { builder, condiciones } = crearBuilderFalso();
      aplicarBusquedaDeProductos(
        builder as unknown as WhereExpressionBuilder,
        'pint',
      );

      expect(condiciones).toHaveLength(1);
      expect(condiciones[0].sql).toContain('product.name');
      expect(condiciones[0].sql).toContain('product.custom_name');
      expect(condiciones[0].sql).toContain('product.sku');
      expect(condiciones[0].sql).toContain('product.barcode');
    });

    it('compara la columna sin tildes: el catálogo trae Ñ y la gente escribe N', () => {
      const { builder, condiciones } = crearBuilderFalso();
      aplicarBusquedaDeProductos(
        builder as unknown as WhereExpressionBuilder,
        'castano',
      );

      expect(condiciones[0].sql).toContain('translate(lower(product.name)');
    });

    it('usa parámetros distintos por término para no pisarse entre sí', () => {
      const { builder, condiciones } = crearBuilderFalso();
      aplicarBusquedaDeProductos(
        builder as unknown as WhereExpressionBuilder,
        'pint azul',
      );

      const nombres = condiciones.flatMap((c) => Object.keys(c.parametros));
      expect(new Set(nombres).size).toBe(nombres.length);
    });
  });
});
