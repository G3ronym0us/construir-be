import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderAdminRole1733961000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ORDER_ADMIN to the users_role_enum type
    await queryRunner.query(`
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'order_admin';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum or migrating data
    // For safety, we'll leave the enum value in place during rollback
    console.log(
      'WARNING: Enum value "order_admin" cannot be removed automatically from PostgreSQL.',
    );
    console.log(
      'If rollback is needed, manually update users with order_admin role to another role first.',
    );
  }
}
