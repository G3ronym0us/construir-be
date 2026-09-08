import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Borra de la base las URL públicas de los comprobantes de pago.
 *
 * Cada `receipt_url` es una dirección directa y permanente a un objeto del
 * bucket que hoy responde 200 a cualquiera, sin credenciales. Mientras siga
 * guardada, cualquier consulta, respaldo o export de la base la reparte, y
 * cualquier código que la lea la va a volver a enseñar. Todas las filas que la
 * tienen guardan también su `receipt_key`, que es lo único que el backend
 * necesita ahora para firmar un enlace temporal, así que la URL no hace falta
 * para nada.
 *
 * Esto NO cierra los objetos que ya están en S3: siguen ahí, bajo `receipts/`,
 * y siguen siendo legibles por quien haya guardado la URL. Eso hay que
 * arreglarlo en la policy del bucket, a mano y desde AWS — está escrito en
 * `docs/comprobantes-privados.md`.
 *
 * La fila sin `receipt_key` (si aparece alguna de una versión anterior) se deja
 * intacta a propósito: borrarle la URL dejaría el comprobante inalcanzable.
 */
export class DropPublicReceiptUrls1785500000000 implements MigrationInterface {
  name = 'DropPublicReceiptUrls1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_info
      SET receipt_url = NULL
      WHERE receipt_url IS NOT NULL
        AND receipt_key IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // No hay vuelta atrás: la URL era derivable de la key, pero volver a
    // escribirla sería reponer justo el dato que esta migración quita.
  }
}
