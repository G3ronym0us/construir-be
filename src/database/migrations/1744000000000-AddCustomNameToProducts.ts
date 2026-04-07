import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomNameToProducts1744000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN "custom_name" VARCHAR NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" DROP COLUMN "custom_name"
    `);
  }
}
