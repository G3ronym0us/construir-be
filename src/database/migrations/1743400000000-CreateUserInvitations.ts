import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserInvitations1743400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_invitations" (
        "id" SERIAL PRIMARY KEY,
        "uuid" VARCHAR NOT NULL,
        "email" VARCHAR NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "first_name" VARCHAR NULL,
        "last_name" VARCHAR NULL,
        "token" VARCHAR(128) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ NULL,
        "invited_by_user_id" INTEGER NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_user_invitations_uuid" UNIQUE ("uuid"),
        CONSTRAINT "uq_user_invitations_token" UNIQUE ("token")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_user_invitations_email" ON "user_invitations" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_invitations_expires_at" ON "user_invitations" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_invitations"`);
  }
}
