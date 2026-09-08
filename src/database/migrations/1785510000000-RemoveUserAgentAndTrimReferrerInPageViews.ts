import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina `page_views.userAgent` y recorta los `referrer` ya guardados a su origen.
 *
 * Continúa lo empezado al quitar la IP. El `user_agent` tampoco lo leía nadie —
 * las dos únicas consultas de la tabla cuentan filas por fecha y agrupan por
 * `path`— y es media huella de navegador: cruzado con `path` y `created_at`
 * reidentifica sesiones aunque la IP ya no esté.
 *
 * El `referrer` se guardaba entero, con su ruta y su query. No era un riesgo
 * teórico: en esta tabla había cuatro filas con el `?token=` de una invitación
 * de registro, un secreto de un solo uso copiado a un almacén de analítica que
 * nadie vigila. Lo que se consulta del referrer es "de dónde llega la gente", y
 * para eso basta el origen.
 *
 * Igual que en la migración de la IP, el `UPDATE ... SET NULL` previo al DROP no
 * es redundante: en Postgres el `DROP COLUMN` sólo marca el atributo como
 * eliminado y los bytes de las filas ya escritas siguen en el fichero de datos,
 * ilegibles por SQL pero presentes en un respaldo físico. El UPDATE reescribe
 * cada fila y deja las versiones viejas como muertas, que autovacuum recupera.
 * El recorte de los referrer históricos reescribe las filas por el mismo motivo.
 *
 * El `down` devuelve la columna vacía y no repone las rutas: ni se puede ni se
 * querría. Es la parte irreversible, y es intencionada.
 */
export class RemoveUserAgentAndTrimReferrerInPageViews1785510000000
  implements MigrationInterface
{
  name = 'RemoveUserAgentAndTrimReferrerInPageViews1785510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Recorta los referrer http(s) ya guardados a "esquema://host[:puerto]".
    //    El mismo criterio que `aOrigenDeReferrer` aplica en tiempo de escritura.
    await queryRunner.query(`
      UPDATE "page_views"
      SET "referrer" = substring("referrer" from '^https?://[^/?#]+')
      WHERE "referrer" ~* '^https?://[^/?#]+'
    `);

    // 2. Lo que no era una URL http(s) utilizable (cadena vacía, about:blank,
    //    basura) pasa a NULL, que es como se representa "no hay procedencia".
    await queryRunner.query(`
      UPDATE "page_views"
      SET "referrer" = NULL
      WHERE "referrer" IS NOT NULL AND "referrer" !~* '^https?://[^/?#]+$'
    `);

    // 3. El navegador se va entero.
    await queryRunner.query(
      `UPDATE "page_views" SET "userAgent" = NULL WHERE "userAgent" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_views" DROP COLUMN IF EXISTS "userAgent"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "page_views" ADD "userAgent" text`);
  }
}
