/**
 * Motivo por el que se rechazó un enlace de recuperación de contraseña, en un
 * identificador estable.
 *
 * Hay un solo código a propósito. Inexistente, ya usado y vencido comparten
 * respuesta porque la diferencia entre ellos sólo le sirve a quien esté
 * probando tokens a ver cuál acierta: saber que un token "existió pero venció"
 * confirma que era real. Ese criterio ya lo aplicaba `getResetTokenInfo`; el
 * `code` sólo lo hace legible para el frontend, que hasta ahora tenía que
 * adivinarlo leyendo el texto del mensaje.
 *
 * A diferencia de la verificación de correo —donde "ya se usó" sí se distingue
 * porque no revela nada y evita asustar a quien hizo doble clic—, acá el enlace
 * sigue siendo una llave para cambiar una contraseña.
 */
export enum PasswordResetErrorCode {
  /** El enlace no existe, ya se usó o venció. No se distingue cuál. */
  TOKEN_INVALID = 'PASSWORD_RESET_TOKEN_INVALID',
  /** La contraseña nueva no llega al mínimo. */
  WEAK_PASSWORD = 'PASSWORD_RESET_WEAK_PASSWORD',
}
