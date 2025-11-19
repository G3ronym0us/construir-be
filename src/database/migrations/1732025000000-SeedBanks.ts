import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBanks1732025000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO banks (code, name, active) VALUES
      ('0001', 'BANCO CENTRAL DE VENEZUELA', true),
      ('0102', 'BANCO DE VENEZUELA, S.A. BANCO UNIVERSAL', true),
      ('0104', 'BANCO VENEZOLANO DE CRÉDITO, S.A BANCO UNIVERSAL', true),
      ('0105', 'BANCO MERCANTIL C.A., BANCO UNIVERSAL', true),
      ('0108', 'BANCO PROVINCIAL, S.A. BANCO UNIVERSAL', true),
      ('0114', 'BANCO DEL CARIBE C.A., BANCO UNIVERSAL', true),
      ('0115', 'BANCO EXTERIOR C.A., BANCO UNIVERSAL', true),
      ('0128', 'BANCO CARONÍ C.A., BANCO UNIVERSAL', true),
      ('0134', 'BANESCO BANCO UNIVERSAL, C.A.', true),
      ('0137', 'BANCO SOFITASA BANCO UNIVERSAL, C.A .', true),
      ('0138', 'BANCO PLAZA, BANCO UNIVERSAL', true),
      ('0146', 'BANCO DE LA GENTE EMPRENDEDORA C.A.', true),
      ('0151', 'BANCO FONDO COMÚN, C.A BANCO UNIVERSAL', true),
      ('0156', '100% BANCO, BANCO COMERCIAL, C.A', true),
      ('0157', 'DELSUR, BANCO UNIVERSAL C.A.', true),
      ('0163', 'BANCO DEL TESORO C.A., BANCO UNIVERSAL', true),
      ('0166', 'BANCO AGRÍCOLA DE VENEZUELA C.A., BANCO UNIVERSAL', true),
      ('0168', 'BANCRECER S.A., BANCO MICROFINANCIERO', true),
      ('0169', 'R4, BANCO MICROFINANCIERO, C.A.', true),
      ('0171', 'BANCO ACTIVO C.A., BANCO UNIVERSAL', true),
      ('0172', 'BANCAMIGA BANCO UNIVERSAL, C.A.', true),
      ('0173', 'BANCO INTERNACIONAL DE DESARROLLO C.A., BANCO UNIVERSAL', true),
      ('0174', 'BANPLUS BANCO UNIVERSAL, C.A.', true),
      ('0175', 'BANCO DIGITAL DE LOS TRABAJADORES, BANCO UNIVERSAL C.A.', true),
      ('0177', 'BANCO DE LA FUERZA ARMADA NACIONAL BOLIVARIANA, B.U.', true),
      ('0178', 'N58 BANCO DIGITAL, BANCO MICROFINANCIERO', true),
      ('0191', 'BANCO NACIONAL DE CRÉDITO C.A., BANCO UNIVERSAL', true)
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM banks WHERE code IN (
      '0001', '0102', '0104', '0105', '0108', '0114', '0115', '0128',
      '0134', '0137', '0138', '0146', '0151', '0156', '0157', '0163',
      '0166', '0168', '0169', '0171', '0172', '0173', '0174', '0175',
      '0177', '0178', '0191'
    )`);
  }
}
