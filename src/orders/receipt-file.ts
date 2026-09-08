/**
 * Reconocimiento del tipo real de un comprobante de pago.
 *
 * El endpoint de subida es de invitado: no hay sesión, y el `mimetype` y el
 * nombre del fichero los escribe entero el cliente. Antes se validaba contra
 * `file.mimetype` y la extensión de la clave en S3 salía de `originalname`, así
 * que bastaba con mandar `Content-Type: image/png` y llamar al archivo
 * `x.html`: quedaba un HTML servido desde el dominio del bucket, que además es
 * el mismo donde viven las imágenes de la tienda.
 *
 * Aquí no se le cree nada al cliente: el tipo sale de los primeros bytes del
 * fichero, y de ahí salen también la extensión y el `Content-Type` con los que
 * se guarda.
 */

export interface ReceiptFileType {
  mimeType: string;
  extension: string;
}

/** Tamaño máximo de un comprobante. Es una foto del teléfono o un PDF. */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const SIGNATURES: Array<{
  type: ReceiptFileType;
  matches: (buffer: Buffer) => boolean;
}> = [
  {
    type: { mimeType: 'image/jpeg', extension: 'jpg' },
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: { mimeType: 'image/png', extension: 'png' },
    matches: (b) =>
      b.length >= 8 &&
      b.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  {
    // RIFF....WEBP: los 4 bytes del medio son el tamaño, y varían.
    type: { mimeType: 'image/webp', extension: 'webp' },
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    type: { mimeType: 'application/pdf', extension: 'pdf' },
    matches: (b) => b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-',
  },
];

/**
 * Devuelve el tipo del fichero según sus bytes, o `null` si no es ninguno de
 * los que aceptamos.
 */
export function detectReceiptFileType(buffer: Buffer): ReceiptFileType | null {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  return SIGNATURES.find(({ matches }) => matches(buffer))?.type ?? null;
}
