import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPaymentMethodConfigs1732900100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO payment_method_configs (type, name, description, icon, account_details, active, display_order)
      VALUES
        (
          'ZELLE',
          'Zelle',
          'Pago mediante Zelle (USD)',
          '💵',
          '{"email": "pagos@construir.com", "beneficiary": "Construir Ferretería C.A."}'::jsonb,
          true,
          1
        ),
        (
          'PAGOMOVIL',
          'Pago Móvil',
          'Pago móvil interbancario (VES)',
          '📱',
          '{"bank": "Banco de Venezuela", "bankCode": "0102", "phone": "0414-1234567", "cedula": "J-12345678-9"}'::jsonb,
          true,
          2
        ),
        (
          'TRANSFERENCIA',
          'Transferencia Bancaria',
          'Transferencia bancaria (VES)',
          '🏦',
          '{"bank": "Banco de Venezuela", "bankCode": "0102", "accountNumber": "0102-0123-45-1234567890", "rif": "J-12345678-9", "beneficiary": "Construir Ferretería C.A."}'::jsonb,
          true,
          3
        )
      ON CONFLICT (type) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM payment_method_configs
      WHERE type IN ('ZELLE', 'PAGOMOVIL', 'TRANSFERENCIA');
    `);
  }
}
