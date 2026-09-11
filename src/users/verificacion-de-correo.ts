import { UserRole } from './user.entity';

/**
 * ¿A esta cuenta se le exige tener el correo verificado?
 *
 * Sólo a quien se registró solo. Los roles de la tienda (`admin`,
 * `order_admin`) los da de alta otro administrador desde el panel, que escribe
 * la dirección a mano y no recibe ningún enlace de verificación: exigirles algo
 * que el sistema nunca les ofreció es exigirles lo imposible.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VIVE EN UN SOLO SITIO A PROPÓSITO. Antes esta regla estaba escrita dos
 * veces —una en el login y otra en la recuperación de contraseña— y las dos
 * copias se separaron sin que nadie lo notara.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * El login exceptuaba a los administradores; la recuperación de contraseña
 * no. El resultado, medido en producción el 11-09-2026: los tres
 * administradores podían entrar pero **no podían recuperar su contraseña
 * jamás**, y el fallo era mudo por partida doble — `requestPasswordReset`
 * hacía `return` sin registrar nada, y el endpoint responde éxito siempre
 * para no revelar qué correos existen. Desde fuera es idéntico a "el correo
 * se envió y no llegó", que fue exactamente el síntoma reportado.
 *
 * Si mañana hay que cambiar a quién se le exige, se cambia acá y las dos
 * puertas cambian juntas.
 */
export function exigeCorreoVerificado(role: string): boolean {
  return role === UserRole.CUSTOMER || role === UserRole.USER;
}

/**
 * ¿Esta cuenta tiene que verificar su correo antes de poder usarse?
 *
 * Une las dos mitades: el rol al que se le exige y el estado actual de la
 * cuenta. Es la pregunta que hacen tanto el login como la recuperación.
 */
export function leFaltaVerificarElCorreo(cuenta: {
  role: string;
  emailVerified: boolean;
}): boolean {
  return !cuenta.emailVerified && exigeCorreoVerificado(cuenta.role);
}
