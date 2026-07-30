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
