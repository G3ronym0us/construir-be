import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Borra tres fichas de invitado que son datos de prueba, no clientes.
 *
 * Se colaron probando el checkout de invitado y desde entonces salen en el
 * listado de clientes del panel, mezcladas con las de verdad. Se reconocen sin
 * ambigüedad: nombres de generador de datos falsos (Quinn Hester, Adria Baker,
 * Kameko Wyatt), correos desechables de `mailinator.com` o el correo del dueño
 * repetido en dos fichas, teléfonos de Estados Unidos (`+1 (406) 729-6503`) en
 * una tienda que sólo vende en Venezuela, y una cédula que es el relleno
 * «Nostrud dicta do sun».
 *
 *   1  Quinn Hester   djesus1703@gmail.com   +1 (406) 729-6503
 *   2  Adria Baker    djesus1703@gmail.com   +1 (253) 356-7256
 *   5  Kameko Wyatt   hoto@mailinator.com    +1 (608) 117-3202
 *
 * **Ninguna tiene un pedido detrás.** Su `orders_count` dice 3/1/1, pero ese
 * contador está desnormalizado y se quedó viejo: no hay una sola fila de
 * `orders` con `guest_customer_id` 1, 2 o 5. La única clave foránea que apunta
 * a esta tabla es esa, así que el borrado no arrastra nada.
 *
 * Sí existen dos pedidos antiguos (12 y 13) con el correo del dueño, pero
 * llevan `guest_customer_id` nulo y no son de estas fichas: se quedan donde
 * están.
 *
 * El `down` repone las tres filas con sus valores originales, incluido el
 * `uuid`, que es lo que las identifica de puertas afuera. El `id` se fuerza
 * también para no dejar huecos raros, y después se recoloca la secuencia.
 *
 * OJO al probar en local: `app.module.ts` levanta con `migrationsRun: true`, así
 * que esto se aplica solo al arrancar el backend contra la base de desarrollo,
 * que es compartida.
 */
export class DeleteTestGuestCustomers1785540000000
  implements MigrationInterface
{
  name = 'DeleteTestGuestCustomers1785540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // El `NOT EXISTS` no es adorno: si alguien llegara a enlazar un pedido real
    // a una de estas fichas antes de que la migración corra, se prefiere dejar
    // la fila viva a romper el pedido.
    await queryRunner.query(`
      DELETE FROM guest_customers gc
      WHERE gc.id IN (1, 2, 5)
        AND NOT EXISTS (
          SELECT 1 FROM orders o WHERE o.guest_customer_id = gc.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO guest_customers
        (id, identification_type, identification_number, first_name, last_name,
         email, phone, country, orders_count, last_order_date,
         created_at, updated_at, uuid)
      VALUES
        (1, 'E', 'Nostrud dicta do sun', 'Quinn', 'Hester',
         'djesus1703@gmail.com', '+1 (406) 729-6503', 'Venezuela', 3,
         '2026-03-05 18:40:15.796', '2026-03-05 18:29:13.019523',
         '2026-03-05 18:40:15.81856',
         '8d579e89-b1ea-4420-84ed-a12322ee40ac'),
        (2, 'E', '26129229', 'Adria', 'Baker',
         'djesus1703@gmail.com', '+1 (253) 356-7256', 'Venezuela', 1,
         '2026-03-05 18:52:27.03', '2026-03-05 18:52:27.044648',
         '2026-03-05 18:52:27.044648',
         'a84d8573-fd33-415c-ad2c-02c5dc863f24'),
        (5, 'E', '12345678', 'Kameko', 'Wyatt',
         'hoto@mailinator.com', '+1 (608) 117-3202', 'Venezuela', 1,
         '2026-04-10 16:17:45.736', '2026-04-10 16:17:45.737787',
         '2026-04-10 16:17:45.737787',
         'd70ce1e3-939d-402d-8880-e5544428e6d6')
      ON CONFLICT (id) DO NOTHING
    `);

    // Reponer ids a mano no mueve la secuencia, y la siguiente alta chocaría
    // contra la clave primaria si la secuencia se hubiera quedado atrás.
    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('guest_customers', 'id'),
        GREATEST((SELECT MAX(id) FROM guest_customers), 1)
      )
    `);
  }
}
