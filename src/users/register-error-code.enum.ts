/**
 * Motivo por el que se rechazó un registro, en un identificador estable.
 *
 * Mismo problema que tenía el login (ver `AuthErrorCode`): la pantalla de
 * registro pintaba tal cual el `message` de esta API, así que al cliente le
 * salía "Email already exists" o el listado crudo del validador
 * ("phone must be a string, identificationNumber should not be empty") — en
 * inglés, aunque tuviera la tienda en español, y con la redacción de un log.
 *
 * El `code` es el contrato con el frontend; el `message` se conserva igual que
 * antes para no romper a ningún cliente que lo estuviera leyendo.
 */
export enum RegisterErrorCode {
  /** Ya hay una cuenta con ese correo. El frontend ofrece iniciar sesión. */
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  /** El correo no tiene forma de correo. */
  INVALID_EMAIL = 'INVALID_EMAIL',
  /** La contraseña no llega al mínimo. */
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  /** El teléfono no es un móvil venezolano. */
  INVALID_PHONE = 'INVALID_PHONE',
  /** La cédula no tiene 7 u 8 dígitos. */
  INVALID_IDENTIFICATION = 'INVALID_IDENTIFICATION',
  /** Falta algún campo obligatorio. */
  MISSING_FIELDS = 'MISSING_FIELDS',
  /** Cualquier otro rechazo del validador. */
  INVALID_DATA = 'INVALID_DATA',
}
