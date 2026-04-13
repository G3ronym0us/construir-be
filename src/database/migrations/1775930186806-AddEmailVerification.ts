import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerification1775930186806 implements MigrationInterface {
    name = 'AddEmailVerification1775930186806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verification_token" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_baf4ca2a5aa907023a2f3748be1" UNIQUE ("email_verification_token")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verification_expires_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_baf4ca2a5aa907023a2f3748be1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
    }

}
