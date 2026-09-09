import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3BucketName: string;
}

export interface AppConfig {
  port: number;
  url: string;
  frontendUrl: string;
  storeName: string;
  storeAddress: string;
  storeCity: string;
  storePhone: string;
  storeEmail: string;
  storeHours: string;
  storeMapUrl: string;
  /** Enlace de contacto que ocho plantillas de correo ofrecen al cliente. */
  storeWhatsappUrl: string;
  /** Sólo lo usa la plantilla de invitación, que es un correo interno. */
  storeRif: string;
  /** Zona IANA en la que el ERP espera las fechas. WooCommerce emite hora local del sitio. */
  storeTimezone: string;
}

export interface BcvRatesConfig {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  adminNotificationEmail: string;
}

export interface AnalyticsConfig {
  /**
   * Días que se conservan las filas de `page_views` antes de purgarlas.
   * `null` cuando el valor del entorno no se entiende: quien purga no borra
   * nada en ese caso.
   */
  pageViewRetentionDays: number | null;
  /** Tope de filas que la purga borra en una sola ejecución. */
  pageViewPurgeBatchLimit: number;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'construir_db',
  }),
);

export const jwtConfig = registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  }),
);

export const awsConfig = registerAs(
  'aws',
  (): AwsConfig => ({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3BucketName: process.env.AWS_S3_BUCKET_NAME || 'construir-products',
  }),
);

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    url: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4000',
    storeName: process.env.STORE_NAME || 'Construir',
    // Sin valores de relleno a propósito. Antes caían a marcadores tipo
    // "Tu dirección de tienda aquí" que llegaban al comprador en el paso de
    // retiro y en los correos. Vacío es honesto: quien lo consume oculta el
    // bloque. Se usa ?? y no || para respetar un STORE_* definido como "".
    storeAddress: process.env.STORE_ADDRESS ?? '',
    storeCity: process.env.STORE_CITY ?? '',
    storePhone: process.env.STORE_PHONE ?? '',
    storeEmail: process.env.STORE_EMAIL ?? '',
    storeHours: process.env.STORE_HOURS ?? '',
    storeMapUrl: process.env.STORE_MAP_URL ?? '',
    // Se usa ?? y no ||, igual que los STORE_* vecinos: una cadena vacía es un
    // valor deliberado, y las plantillas ocultan el bloque cuando llega vacío.
    storeWhatsappUrl: process.env.STORE_WHATSAPP_URL ?? '',
    storeRif: process.env.STORE_RIF ?? '',
    // Explícita y no heredada del servidor: el contrato del ERP emite fechas
    // sin marcador de zona, así que un servidor en UTC las corría 4 horas.
    storeTimezone: process.env.STORE_TIMEZONE || 'America/Caracas',
  }),
);

// Servicio centralizado de tasas BCV. La API key es obligatoria: sin ella el
// servicio responde 401 y `BCVService` se queda sirviendo su caché / la tasa
// ya guardada en `exchange_rates`.
export const bcvRatesConfig = registerAs(
  'bcvRates',
  (): BcvRatesConfig => ({
    url: process.env.BCV_RATES_URL || 'https://rates.cambiosloscriollitos.com',
    apiKey: process.env.BCV_RATES_API_KEY || '',
    timeoutMs: parseInt(process.env.BCV_RATES_TIMEOUT_MS || '10000', 10),
  }),
);

export const emailConfig = registerAs(
  'email',
  (): EmailConfig => ({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || '"Construir" <noreply@construir.com>',
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || '',
  }),
);

/**
 * Lee un número entero del entorno **exigiendo que el valor entero lo sea**.
 *
 * `parseInt` no vale aquí, y no es una sutileza: se queda con el prefijo
 * numérico y descarta el resto sin avisar. `"1e9"`, `"1_000"` y `"1 año"` los
 * convierte los tres en `1`. Como este valor lo edita el dueño de la tienda
 * —que es justo quien escribe `1e5`—, un dedazo así convertía la purga
 * nocturna en "borra todo lo anterior a un día", y lo hacía informando de
 * éxito. Devuelve `null` cuando el texto no es exactamente un entero positivo,
 * y quien lo consume decide qué hacer con esa ausencia.
 */
function enteroPositivoDelEntorno(valor: string | undefined): number | null {
  if (valor === undefined) return null;

  const limpio = valor.trim();
  if (!/^[0-9]+$/.test(limpio)) return null;

  const numero = Number(limpio);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

/**
 * El plazo de retención de las visitas es una decisión del dueño de la tienda,
 * no del código, así que vive en el entorno. El defecto de 180 días cubre de
 * sobra el único uso real (totales del día, del mes y páginas más visitadas)
 * sin acumular historial a perpetuidad.
 *
 * Un valor que no se entienda **no cae al defecto**: cae a `null`, y entonces
 * no se purga nada. Caer a 180 escondería el dedazo; no purgar deja la tabla
 * creciendo, que es un problema visible y reversible, en vez de borrar datos
 * que no se recuperan.
 */
export const analyticsConfig = registerAs(
  'analytics',
  (): AnalyticsConfig => ({
    // Se distingue "no configurado" de "configurado con basura": lo primero
    // usa el defecto, lo segundo cae a null y no se purga. Con un `?` a secas
    // una cadena vacía habría caído al defecto, escondiendo el error.
    pageViewRetentionDays:
      process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS === undefined
        ? 180
        : enteroPositivoDelEntorno(
            process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS,
          ),
    // Tope por ejecución. La purga es un DELETE sobre una tabla sin techo: la
    // primera vez que corra sobre un histórico grande, sin lote, sería un
    // bloqueo largo. Lo que sobre se borra en la ejecución del día siguiente.
    pageViewPurgeBatchLimit:
      enteroPositivoDelEntorno(
        process.env.ANALYTICS_PAGE_VIEW_PURGE_BATCH_LIMIT,
      ) ?? 50000,
  }),
);
