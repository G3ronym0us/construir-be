import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIvaToProductsTable1776875135007 implements MigrationInterface {
  name = 'AddIvaToProductsTable1776875135007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD "iva" numeric(10,2)`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "price_with_iva" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "iva_ves" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "price_with_iva_ves" numeric(10,2)`,
    );
    await queryRunner.query(`UPDATE products
SET iva = CASE iva_type
    WHEN 0 THEN price * 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN price * 0.08
    WHEN 3 THEN price * 0.24
    ELSE 0 
END;`);
    await queryRunner.query(
      `UPDATE "products" SET price_with_iva = price + iva`,
    );
    await queryRunner.query(`UPDATE products
SET iva_ves = CASE iva_type
    WHEN 0 THEN price_ves * 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN price_ves * 0.08
    WHEN 3 THEN price_ves * 0.24
    ELSE 0 
END;`);
    await queryRunner.query(
      `UPDATE "products" SET price_with_iva_ves = price_ves + iva_ves`,
    );
    await queryRunner.query(`ALTER TABLE products
ALTER COLUMN iva SET NOT NULL,
ALTER COLUMN price_with_iva SET NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "price_with_iva_ves"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "iva_ves"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "price_with_iva"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "iva"`);
  }
}
