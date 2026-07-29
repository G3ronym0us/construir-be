/**
 * Normaliza una fecha valor a 'YYYY-MM-DD'.
 *
 * Postgres devuelve las columnas `date` como string, pero TypeORM entrega
 * `Date` con otros drivers y en los tests. Comparar fechas valor sin normalizar
 * haría que el cron viera un cambio inexistente y recalculara el catálogo.
 */
export function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value).split('T')[0];
}
