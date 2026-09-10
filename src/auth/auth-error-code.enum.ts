/**
 * Motivo por el que se rechazó un inicio de sesión, en un identificador
 * estable.
 *
 * El frontend tiene que decirle al cliente qué le pasó — y decírselo en el
 * idioma que eligió. Antes pintaba tal cual el `message` de esta API, así que
 * al usuario le salía "Invalid credentials" o "Account is deactivated": en
 * inglés y con la redacción de un log, sin importar el idioma de la tienda.
 *
 * Traducir buscando por ese texto en inglés es frágil: el día que alguien
 * reescriba un mensaje acá, el frontend deja de reconocerlo y se cae al texto
 * crudo otra vez, sin que nada falle en las pruebas. El `code` es el contrato:
 * el `message` queda como detalle para logs y para clientes viejos.
 */
export enum AuthErrorCode {
  /** Correo inexistente o contraseña equivocada. */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** La cuenta existe pero fue desactivada por un administrador. */
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  /** Falta confirmar el correo. El frontend ofrece reenviar el enlace. */
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  /** La cuenta fue eliminada. */
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
}
