import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Guarda la fecha de la tasa con la que se facturó cada pedido.
 *
 * `OrderPricingService` ya la calcula (`rateDate`) y hasta ahora se descartaba,
 * igual que pasaba con `base` e `iva` por renglón. Los correos rediseñados la
 * muestran junto a la tasa, y la fecha del pedido no sirve de sustituto: la
 * tasa publicada puede ser de meses antes.
 *
 * Sin backfill, a propósito: qué tasa estaba publicada cuando se creó un pedido
 * viejo no se puede reconstruir con certeza. Esas filas quedan en NULL y el
 * correo omite la fecha, mostrando sólo la tasa.
 */
export class AddExchangeRateDateToOrders1785490000000
  implements MigrationInterface
{
  name = 'AddExchangeRateDateToOrders1785490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "exchange_rate_date" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "exchange_rate_date"`,
    );
  }
}
