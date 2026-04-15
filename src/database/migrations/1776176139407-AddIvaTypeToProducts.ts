import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIvaTypeToProducts1776176139407 implements MigrationInterface {
  name = 'AddIvaTypeToProducts1776176139407';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "iva_type" smallint NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "iva_type"`);
  }
}
