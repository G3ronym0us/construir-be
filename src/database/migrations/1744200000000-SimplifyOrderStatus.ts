import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyOrderStatus1744200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move existing payment_review orders back to on-hold so the ERP can process them
    await queryRunner.query(`
      UPDATE orders SET status = 'on-hold' WHERE status = 'payment_review'
    `);

    // Remove obsolete statuses from the enum
    await queryRunner.query(`
      ALTER TYPE orders_status_enum RENAME TO orders_status_enum_old
    `);
    await queryRunner.query(`
      CREATE TYPE orders_status_enum AS ENUM ('on-hold', 'pending', 'completed', 'cancelled')
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ALTER COLUMN status TYPE orders_status_enum
        USING status::text::orders_status_enum
    `);
    await queryRunner.query(`
      DROP TYPE orders_status_enum_old
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE orders_status_enum RENAME TO orders_status_enum_old
    `);
    await queryRunner.query(`
      CREATE TYPE orders_status_enum AS ENUM (
        'on-hold', 'pending', 'payment_review', 'confirmed', 'processing',
        'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE orders
        ALTER COLUMN status TYPE orders_status_enum
        USING status::text::orders_status_enum
    `);
    await queryRunner.query(`
      DROP TYPE orders_status_enum_old
    `);
  }
}
