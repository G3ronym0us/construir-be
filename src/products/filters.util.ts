import { WhereExpressionBuilder } from 'typeorm';

/**
 * Filtros del catálogo que no son ni búsqueda, ni categoría, ni orden.
 *
 * Los precios van en **USD con IVA**, que es la misma unidad que `priceWithIva`
 * guarda en la tabla. Podría parecer más natural filtrar en bolívares, que es
 * lo que el cliente ve en grande, pero el precio en VES se deriva de la tasa
 * BCV y esa tasa cambia todos los días: un enlace con "de Bs. 1.000 a Bs.
 * 2.000" compartido por WhatsApp seleccionaría un conjunto de productos
 * distinto mañana, sin que nadie hubiera tocado el catálogo. En USD el rango
 * significa siempre lo mismo; la pantalla se encarga de enseñarlo en las dos
 * monedas.
 */
export interface FiltrosDeCatalogo {
  /** Precio mínimo en USD con IVA, inclusive. */
  minPrice?: number;
  /** Precio máximo en USD con IVA, inclusive. */
  maxPrice?: number;
  /**
   * Unidades mínimas en inventario, inclusive.
   *
   * El catálogo ya esconde lo agotado (`inventory > 0`), así que un filtro de
   * "en stock" a secas no quitaría ni un producto. Lo que sí distingue es
   * cuánto hay: quien compra para una obra se lleva varias unidades y no le
   * sirve un renglón con tres. Por eso el parámetro es un número y no un
   * booleano.
   */
  minInventory?: number;
}

/**
 * Añade al `WHERE` del QueryBuilder los filtros que vengan definidos.
 *
 * Los filtros ausentes no añaden ninguna condición: un filtro sin poner no
 * puede restringir el catálogo. El prefijo `alias` evita que dos llamadas en
 * la misma consulta se pisen los parámetros.
 *
 * No hace falta índice para esto: son ~1.100 filas publicadas y la consulta ya
 * recorre la tabla por el `translate()` de la búsqueda, así que un índice más
 * no cambiaría el plan ni el tiempo medido.
 */
export function aplicarFiltrosDeCatalogo(
  builder: WhereExpressionBuilder,
  filtros: FiltrosDeCatalogo,
  alias = 'filtro',
): void {
  if (filtros.minPrice !== undefined) {
    builder.andWhere(`product.priceWithIva >= :${alias}MinPrice`, {
      [`${alias}MinPrice`]: filtros.minPrice,
    });
  }

  if (filtros.maxPrice !== undefined) {
    builder.andWhere(`product.priceWithIva <= :${alias}MaxPrice`, {
      [`${alias}MaxPrice`]: filtros.maxPrice,
    });
  }

  if (filtros.minInventory !== undefined) {
    builder.andWhere(`product.inventory >= :${alias}MinInventory`, {
      [`${alias}MinInventory`]: filtros.minInventory,
    });
  }
}
