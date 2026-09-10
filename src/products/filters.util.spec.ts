import { WhereExpressionBuilder } from 'typeorm';
import { aplicarFiltrosDeCatalogo } from './filters.util';

/**
 * Doble del QueryBuilder que **guarda de verdad** lo que se le pide.
 *
 * Importa que no sea un mock que devuelve lo que le den: un doble así hace que
 * la prueba pase igual aunque `aplicarFiltrosDeCatalogo` no llame a nada. Acá
 * se acumulan las condiciones y los parámetros, y las aserciones son sobre lo
 * acumulado, así que si la función deja de añadir una condición la prueba cae.
 */
function builderEspia() {
  const condiciones: string[] = [];
  const parametros: Record<string, unknown> = {};

  const builder = {
    andWhere(condicion: string, params?: Record<string, unknown>) {
      condiciones.push(condicion);
      Object.assign(parametros, params ?? {});
      return builder;
    },
    orWhere() {
      return builder;
    },
  } as unknown as WhereExpressionBuilder;

  return { builder, condiciones, parametros };
}

describe('aplicarFiltrosDeCatalogo', () => {
  it('no añade ninguna condición cuando no viene ningún filtro', () => {
    const { builder, condiciones } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, {});

    expect(condiciones).toEqual([]);
  });

  it('un filtro sin poner no restringe el catálogo aunque el otro sí', () => {
    const { builder, condiciones, parametros } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, { minPrice: 5 });

    expect(condiciones).toHaveLength(1);
    expect(condiciones[0]).toContain('product.priceWithIva >=');
    expect(parametros).toEqual({ filtroMinPrice: 5 });
  });

  it('filtra por precio mínimo y máximo, ambos inclusive', () => {
    const { builder, condiciones, parametros } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, { minPrice: 5, maxPrice: 20 });

    expect(condiciones).toEqual([
      'product.priceWithIva >= :filtroMinPrice',
      'product.priceWithIva <= :filtroMaxPrice',
    ]);
    expect(parametros).toEqual({ filtroMinPrice: 5, filtroMaxPrice: 20 });
  });

  it('filtra por unidades mínimas en inventario', () => {
    const { builder, condiciones, parametros } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, { minInventory: 6 });

    expect(condiciones).toEqual(['product.inventory >= :filtroMinInventory']);
    expect(parametros).toEqual({ filtroMinInventory: 6 });
  });

  // Un `minPrice: 0` es un filtro puesto a cero, no un filtro ausente. Si se
  // comprobara con `if (filtros.minPrice)` en vez de con `!== undefined`, el
  // cero se caería en silencio.
  it('trata el cero como un valor y no como "sin filtro"', () => {
    const { builder, condiciones, parametros } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, { minPrice: 0, minInventory: 0 });

    expect(condiciones).toHaveLength(2);
    expect(parametros).toEqual({ filtroMinPrice: 0, filtroMinInventory: 0 });
  });

  it('el alias separa los parámetros de dos llamadas en la misma consulta', () => {
    const { builder, parametros } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, { minPrice: 5 }, 'a');
    aplicarFiltrosDeCatalogo(builder, { minPrice: 30 }, 'b');

    expect(parametros).toEqual({ aMinPrice: 5, bMinPrice: 30 });
  });

  // Los valores viajan parametrizados; nunca interpolados en el SQL.
  it('nunca mete el valor dentro del texto de la condición', () => {
    const { builder, condiciones } = builderEspia();

    aplicarFiltrosDeCatalogo(builder, {
      minPrice: 5,
      maxPrice: 20,
      minInventory: 6,
    });

    condiciones.forEach((condicion) => {
      expect(condicion).not.toMatch(/\d/);
    });
  });
});
