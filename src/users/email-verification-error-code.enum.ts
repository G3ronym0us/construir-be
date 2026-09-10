/**
 * Motivo por el que se rechazó un enlace de verificación de correo, en un
 * identificador estable.
 *
 * Mismo problema que tenían el login y el registro (ver `AuthErrorCode` y
 * `RegisterErrorCode`): la pantalla de verificación clasificaba el fallo
 * buscando trozos del `message` de esta API —`msg.includes('expirado')`,
 * `msg.includes('inválido')`—, así que bastaba con reescribir un mensaje acá
 * para que el frontend dejara de reconocerlo, sin que nada fallara. El `code`
 * es el contrato; el `message` queda como detalle para logs.
 *
 * No hay código para "este enlace ya se usó": ese caso dejó de ser un error.
 * Ver `UsersService.verifyEmail`.
 */
export enum EmailVerificationErrorCode {
  /** No existe ningún enlace con ese token, o la URL vino sin token. */
  TOKEN_INVALID = 'EMAIL_VERIFICATION_TOKEN_INVALID',
  /** El enlace existió pero pasaron sus 24 horas. Se puede pedir otro. */
  TOKEN_EXPIRED = 'EMAIL_VERIFICATION_TOKEN_EXPIRED',
}
