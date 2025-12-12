import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerRoleAndUserSoftDelete1733970000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CUSTOMER to the users_role_enum type
    await queryRunner.query(`
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'customer';
    `);

    // Add is_active column
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // Add deleted_at column for soft delete
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
    `);

    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS is_active;
    `);

    // Note: PostgreSQL doesn't support removing enum values directly
    console.log(
      'WARNING: Enum value "customer" cannot be removed automatically from PostgreSQL.',
    );
    console.log(
      'If rollback is needed, manually update users with customer role to another role first.',
    );
  }
}
