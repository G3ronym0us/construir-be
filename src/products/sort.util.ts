/**
 * Columnas por las que se puede ordenar el catálogo.
 *
 * `ProductsService` interpola el nombre de la columna en el SQL
 * (`product.${sortBy}`) porque un ORDER BY no admite parámetros. Hoy TypeORM
 * rechaza lo que no sea una propiedad conocida de la entidad, así que no se
 * consiguió explotar; pero eso es una salvaguarda de la librería, no nuestra,
 * y `GET /products` es un endpoint público sin autenticar. Esta lista es
 * defensa en profundidad: lo que no esté aquí no llega al SQL.
 *
 * Sólo se listan las columnas que el listado ofrece de verdad
 * (`SORT_OPTIONS` en el frontend) más las que ya usaba el panel de admin.
 */
export const COLUMNAS_ORDENABLES = [
  'createdAt',
  'updatedAt',
  'name',
  'price',
  'inventory',
  'sku',
] as const;

export type ColumnaOrdenable = (typeof COLUMNAS_ORDENABLES)[number];

export const ORDEN_POR_DEFECTO: ColumnaOrdenable = 'createdAt';

export function esColumnaOrdenable(valor: unknown): valor is ColumnaOrdenable {
  return COLUMNAS_ORDENABLES.includes(valor as ColumnaOrdenable);
}

/**
 * Devuelve una columna de la lista blanca, o la de por defecto.
 *
 * Se cae al valor por defecto en vez de lanzar porque quien llame puede ser el
 * panel de admin con un `sortBy` viejo guardado en un enlace: mejor un listado
 * ordenado por fecha que un 500.
 */
export function columnaOrdenableSegura(sortBy?: string): ColumnaOrdenable {
  return esColumnaOrdenable(sortBy) ? sortBy : ORDEN_POR_DEFECTO;
}

/** El sentido del orden; cualquier cosa que no sea ASC se trata como DESC. */
export function sentidoOrdenSeguro(sortOrder?: string): 'ASC' | 'DESC' {
  return String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
}
