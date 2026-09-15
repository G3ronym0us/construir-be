import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea `cart_items.uuid`, que la entidad declara desde abril y ninguna
 * migración había creado.
 *
 * `CartItem.uuid` entró en el commit 130b866 junto con el cambio de
 * `PATCH/DELETE /cart/items/:id` a direccionar por uuid, pero la columna sólo
 * existía en las bases armadas con `schema:sync`. En producción no estaba, así
 * que TODA lectura del carrito —`GET /cart`, y también `POST /cart/items`, que
 * carga el carrito antes de agregar— reventaba con
 * `column Cart__Cart_items.uuid does not exist` y respondía 500. El frontend
 * se traga ese error en el botón, y el síntoma para el cliente con sesión
 * iniciada era que pulsar "Agregar" no hacía nada.
 *
 * El DEFAULT rellena en el mismo ALTER los renglones que ya existen. El nombre
 * de la restricción única es el que genera TypeORM para esta columna, para que
 * la base quede igual que una sincronizada desde las entidades.
 *
 * Idempotente a propósito: las bases locales se arrancan con `schema:sync`
 * (ver `scripts/local-db-bootstrap.sql`) y ya tienen la columna y la
 * restricción; sin las guardas, esta migración las haría fallar al arrancar.
 */
export class AddUuidToCartItems1785560000000 implements MigrationInterface {
  name = 'AddUuidToCartItems1785560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "uuid" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'cart_items'::regclass
            AND conname = 'UQ_f9090bc1781fe0250ba2c53b136'
        ) THEN
          ALTER TABLE "cart_items"
            ADD CONSTRAINT "UQ_f9090bc1781fe0250ba2c53b136" UNIQUE ("uuid");
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "UQ_f9090bc1781fe0250ba2c53b136"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "uuid"`,
    );
  }
}
