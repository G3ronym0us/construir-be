import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Desbloquea las cuentas que existían ANTES de que hubiera verificación de
 * correo.
 *
 * La migración `AddEmailVerification` (abril de 2026) añadió la columna con
 * `NOT NULL DEFAULT false` y no rellenó lo que ya estaba: todas las cuentas
 * anteriores quedaron marcadas como "no verificadas" de un día para otro. Para
 * esas personas la consecuencia es total — `login` las rechaza con
 * `EMAIL_NOT_VERIFIED` y la recuperación de contraseña tampoco les manda nada,
 * así que no pueden entrar NI recuperar. Quedaron encerradas fuera de una
 * cuenta que el día anterior les funcionaba, y sin ninguna salida por sí solas.
 *
 * Se reconoce a esas cuentas por no tener token de verificación: quien pasó
 * por el flujo nuevo tiene uno (si está pendiente) o lo tuvo y se le limpió al
 * verificar, en cuyo caso ya está en `true`. Token nulo y `email_verified` en
 * `false` a la vez sólo puede significar que la cuenta nunca conoció el flujo.
 *
 * No se tocan las cuentas con token pendiente: ésas sí recibieron su enlace y
 * no lo han usado, que es exactamente lo que la verificación quiere comprobar.
 */
export class VerificarCuentasAnterioresAlaVerificacion1785550000000
  implements MigrationInterface
{
  name = 'VerificarCuentasAnterioresAlaVerificacion1785550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const resultado = await queryRunner.query(`
      UPDATE "users"
      SET "email_verified" = true
      WHERE "email_verified" = false
        AND "email_verification_token" IS NULL
        AND "role" IN ('customer', 'user')
      RETURNING "id"
    `);

    // `resultado.length` NO es el número de filas, aunque lo parezca: para un
    // UPDATE con RETURNING el driver de Postgres devuelve la tupla
    // `[filas, cuántasAfectó]`, así que su longitud es 2 SIEMPRE — también
    // cuando no se tocó ninguna fila (`[[], 0]`). Comprobado contra la base.
    // Un informe que dice "2" pase lo que pase es peor que no informar: es la
    // única señal que va a quedar de esta migración en el log del despliegue.
    const filas = Array.isArray(resultado?.[0]) ? resultado[0] : resultado;
    const cuantas = Array.isArray(filas) ? filas.length : 0;
    console.log(
      `Cuentas anteriores a la verificación desbloqueadas: ${cuantas}`,
    );
  }

  public async down(): Promise<void> {
    // A propósito no hace nada, y conviene explicar por qué en vez de dejar un
    // `down` que parezca simétrico.
    //
    // Revertir exigiría saber QUÉ filas tocó esta migración, y no se puede
    // deducir después: la condición que las identificaba —token nulo y sin
    // verificar— deja de cumplirse en cuanto se aplica. Volver a poner en
    // `false` todo lo que hoy tiene el token nulo y está verificado alcanzaría
    // también a quien verificó por las buenas, porque verificar es justamente
    // lo que limpia el token. Se cerraría fuera a gente que sí hizo lo que se
    // le pidió, para deshacer un desbloqueo que no le hace daño a nadie.
  }
}
