import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina `page_views.ip_address`.
 *
 * El endpoint público de analítica guardaba la IP de cada visitante en cada
 * fila, sin caducidad. Ninguna consulta la leía: las dos únicas lecturas de la
 * tabla cuentan filas por fecha y agrupan por `path`. Era, literalmente, un
 * dato personal retenido a perpetuidad a cambio de nada.
 *
 * **Esto se lleva por delante las IPs ya guardadas, que es justo lo que se
 * busca.** No basta con dejar de escribir la columna: el histórico con IPs
 * reales seguiría ahí.
 *
 * El UPDATE a NULL previo no es redundante con el DROP. En Postgres, `DROP
 * COLUMN` sólo marca el atributo como eliminado: los bytes de las filas ya
 * escritas siguen en el fichero de datos, ilegibles por SQL pero presentes en
 * un respaldo físico o en el disco. El UPDATE reescribe cada fila sin la IP y
 * deja las versiones viejas como muertas, que autovacuum recupera. Para
 * borrarlo del disco en el acto hace falta `VACUUM FULL page_views`, que no
 * puede correr dentro de la transacción de la migración: se ejecuta a mano
 * después.
 *
 * El `down` sólo puede devolver la columna vacía: los datos no se recuperan, y
 * tampoco se querría. Si algún día hicieran falta visitantes únicos, la vía es
 * un identificador derivado (hash con sal rotativa), no reponer esta columna.
 */
export class RemoveIpAddressFromPageViews1785500000000
  implements MigrationInterface
{
  name = 'RemoveIpAddressFromPageViews1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "page_views" SET "ip_address" = NULL WHERE "ip_address" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_views" DROP COLUMN IF EXISTS "ip_address"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "page_views" ADD "ip_address" character varying(45)`,
    );
  }
}
