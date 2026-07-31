import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separa la orden de compra del número de factura.
 *
 * `order_key` guardaba las dos cosas en momentos distintos: el ERP escribe ahí
 * su O/C al acusar recibo (`PUT /api/v1/orders/:id/acknowledge`) y, al
 * facturar (`PUT /api/v1/orders/:id` con `status: completed`), la sobreescribe
 * con el número de factura. La referencia de la O/C se perdía sin dejar rastro,
 * así que no quedaba con qué reconciliar una factura contra su orden de compra.
 *
 * `order_key` conserva su significado —la última referencia escrita— porque ya
 * la consumen la API v1 y el panel. La columna nueva guarda la O/C y no la pisa
 * nadie después.
 *
 * El backfill copia `order_key` a `purchase_order_key` sólo en las órdenes que
 * están en `pending`: son exactamente las que fueron acusadas y todavía no
 * facturadas, así que su `order_key` es con certeza una O/C. En las `completed`
 * el valor ya es el número de factura y la O/C original es irrecuperable — se
 * dejan en NULL a propósito, en vez de rellenarlas con un dato equivocado.
 */
export class AddPurchaseOrderKeyToOrders1785470000000
  implements MigrationInterface
{
  name = 'AddPurchaseOrderKeyToOrders1785470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "purchase_order_key" character varying`,
    );
    await queryRunner.query(
      `UPDATE "orders" SET "purchase_order_key" = "order_key" WHERE "status" = 'pending' AND "order_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "purchase_order_key"`,
    );
  }
}
