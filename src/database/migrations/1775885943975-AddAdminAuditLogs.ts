import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminAuditLogs1775885943975 implements MigrationInterface {
    name = 'AddAdminAuditLogs1775885943975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admin_audit_logs" ("id" SERIAL NOT NULL, "user_id" integer, "user_email" character varying NOT NULL, "user_full_name" character varying NOT NULL, "action" character varying NOT NULL, "resource" character varying NOT NULL, "resource_id" character varying, "details" jsonb, "ip_address" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de7a8fc2fbb525484c71a86bb96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_created_at" ON "admin_audit_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_resource" ON "admin_audit_logs" ("resource") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_logs_user_id" ON "admin_audit_logs" ("user_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_resource"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_created_at"`);
        await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
    }

}
