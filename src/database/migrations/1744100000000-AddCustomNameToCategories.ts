import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomNameToCategories1744100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories" ADD COLUMN "custom_name" VARCHAR NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories" DROP COLUMN "custom_name"
    `);
  }
}
