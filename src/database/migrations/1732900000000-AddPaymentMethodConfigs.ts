import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodConfigs1732900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      CREATE TYPE payment_method_type_enum AS ENUM ('ZELLE', 'PAGOMOVIL', 'TRANSFERENCIA');
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE payment_method_configs (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
        type payment_method_type_enum NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        account_details JSONB NOT NULL,
        active BOOLEAN DEFAULT true NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_payment_method_config_type
      ON payment_method_configs (type);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_payment_method_config_uuid
      ON payment_method_configs (uuid);
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_payment_method_config_active
      ON payment_method_configs (active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payment_method_configs;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method_type_enum;`);
  }
}
