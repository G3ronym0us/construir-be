import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderVesTaxAndBackfillProductIva1785368587148
  implements MigrationInterface
{
  name = 'AddOrderVesTaxAndBackfillProductIva1785368587148';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Backfill de los derivados USD que quedaron congelados en la tasa de
    //    AddIvaToProductsTable. Las alícuotas van literales, no importadas de
    //    IVA_RATES: una migración es un registro histórico y debe producir el
    //    mismo resultado si mañana cambia el enum o la alícuota legal.
    await queryRunner.query(`UPDATE products SET iva = ROUND(price * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2)`);
    await queryRunner.query(`UPDATE products SET price_with_iva = price + iva`);

    // 2. Idem VES. Es idempotente: applyVesPrices ya los mantiene, pero se
    //    normaliza por si alguna fila quedó fuera de sincronía.
    await queryRunner.query(`UPDATE products SET iva_ves = ROUND(price_ves * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2) WHERE price_ves IS NOT NULL`);
    await queryRunner.query(
      `UPDATE products SET price_with_iva_ves = price_ves + iva_ves WHERE price_ves IS NOT NULL`,
    );

    // 3. Columnas para el desglose en VES. El cliente paga en bolívares, así
    //    que el desglose que ve tiene que existir en esa moneda. Se usa
    //    numeric(10,2) por consistencia con subtotal_ves y total_ves; ambos
    //    montos nuevos son siempre menores que total_ves, así que alcanza.
    await queryRunner.query(`ALTER TABLE "orders" ADD "tax_ves" numeric(10,2)`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "discount_amount_ves" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "discount_amount_ves"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax_ves"`);
    // El backfill de precios no se revierte: recalcular valores correctos no
    // tiene inverso significativo.
  }
}
