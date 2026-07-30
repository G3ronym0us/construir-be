import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Da uuid público a los invitados.
 *
 * `users` y `orders` ya se identifican por uuid hacia afuera; los invitados no
 * tenían más que el id correlativo, así que el módulo de clientes venía armando
 * ids compuestos ("guest-5") para poder direccionarlos. Con esta columna los
 * invitados se referencian igual que todo lo demás.
 *
 * El DEFAULT rellena las filas que ya existen en el mismo ALTER, así que no hace
 * falta backfill aparte. La extensión uuid-ossp ya está activa —es la que usa el
 * default de `users.uuid`— pero se pide igual para que la migración corra en una
 * base recién creada.
 */
export class AddUuidToGuestCustomers1785400000000 implements MigrationInterface {
  name = 'AddUuidToGuestCustomers1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `ALTER TABLE "guest_customers" ADD "uuid" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "guest_customers" ADD CONSTRAINT "UQ_guest_customers_uuid" UNIQUE ("uuid")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "guest_customers" DROP CONSTRAINT "UQ_guest_customers_uuid"`,
    );
    await queryRunner.query(`ALTER TABLE "guest_customers" DROP COLUMN "uuid"`);
  }
}
