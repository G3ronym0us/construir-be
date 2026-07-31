import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Congela el desglose de IVA de cada renglón al crear el pedido.
 *
 * `order_items` guardaba `price` y `subtotal` con IVA incluido, pero no la base
 * ni el impuesto. El contrato del ERP pide el monto SIN impuesto por renglón, y
 * derivarlo al leer obligaba a consultar `products.iva_type` — el estado vivo
 * del producto. Con eso, un cambio de alícuota le reescribía el impuesto a
 * órdenes ya facturadas, y un producto borrado hacía asumir 16% sobre una línea
 * que podía ser exenta.
 *
 * Sin backfill, a propósito: las filas existentes quedan en NULL y el
 * serializador deriva su desglose al vuelo. Rellenarlas con la alícuota actual
 * sería cometer exactamente el error que esta columna evita.
 */
export class AddIvaBreakdownToOrderItems1785480000000
  implements MigrationInterface
{
  name = 'AddIvaBreakdownToOrderItems1785480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "base" numeric(10,2)`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" ADD "iva" numeric(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "iva"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "base"`);
  }
}
