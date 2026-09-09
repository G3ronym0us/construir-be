import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina `page_views.ip_address`.
 *
 * El endpoint público de analítica guardaba la IP de cada visitante en cada
 * fila, sin caducidad. Ninguna consulta la leía: las dos únicas lecturas de la
 * tabla cuentan filas por fecha y agrupan por `path`. Era, literalmente, un
 * dato personal retenido a perpetuidad a cambio de nada.
 *
 * **Esto deja las IPs fuera del alcance de SQL, que es lo que la aplicación
 * necesita.** No basta con dejar de escribirlas: el histórico seguiría ahí.
 *
 * **Lo que esta migración NO hace es borrarlas del disco, y conviene no
 * engañarse.** En Postgres el `DROP COLUMN` sólo marca el atributo como
 * eliminado; los bytes de las filas ya escritas siguen en el fichero de datos y
 * son legibles en un respaldo físico. Aquí hubo antes un `UPDATE ... SET NULL`
 * pensado para forzar la reescritura de cada fila: se midió y no servía —los
 * bytes seguían en el heap con y sin él— mientras que duplicaba el tamaño en
 * disco y alargaba el bloqueo de la migración, en una tabla pensada para
 * crecer. Se quitó.
 *
 * Lo único que borra de verdad es `VACUUM FULL page_views`, que no puede correr
 * dentro de la transacción de una migración. Es un paso obligatorio del
 * despliegue, no una recomendación: ver `docs/despliegue-analitica.md`.
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
      `ALTER TABLE "page_views" DROP COLUMN IF EXISTS "ip_address"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "page_views" ADD "ip_address" character varying(45)`,
    );
  }
}
