import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToUserTable1775932517940 implements MigrationInterface {
  name = 'AddPhoneToUserTable1775932517940';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "phone" character varying(20)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_identification_type_enum" AS ENUM('V', 'E', 'J', 'G', 'P')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "identification_type" "public"."users_identification_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "identification_number" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "identification_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "identification_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."users_identification_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
  }
}
