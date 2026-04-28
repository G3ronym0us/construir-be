import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGuestCustomerIdToOrder1777386485632 implements MigrationInterface {
    name = 'AddGuestCustomerIdToOrder1777386485632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "guest_customer_id" integer`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_2f916ebd21611fb8a6911ade4d6" FOREIGN KEY ("guest_customer_id") REFERENCES "guest_customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_2f916ebd21611fb8a6911ade4d6"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "guest_customer_id"`);
    }

}
