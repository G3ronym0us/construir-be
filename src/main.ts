import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { v1SwaggerConfig } from './api-v1/common/swagger/swagger-config';
import { comprobadorDeOrigen, origenesPermitidos } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Lista blanca de orígenes. El porqué está en `src/config/cors.ts`: con la
  // sesión viajando en cookie, el `origin: true` que había acá le daría a
  // cualquier web del internet permiso para hacer peticiones autenticadas en
  // nombre del usuario y leer la respuesta.
  const cors = {
    corsOrigins: process.env.CORS_ORIGINS,
    frontendUrl: process.env.FRONTEND_URL,
    produccion: process.env.NODE_ENV === 'production',
  };

  if (cors.produccion && origenesPermitidos(cors).length === 0) {
    // Ruidoso a propósito: sin orígenes declarados la tienda no puede hablar
    // con la API, y el síntoma que ve el navegador ("CORS error") no dice
    // dónde está la causa.
    logger.error(
      'CORS_ORIGINS y FRONTEND_URL están vacíos en producción: el navegador ' +
        'rechazará todas las peticiones del frontend. Declara el origen de la ' +
        'tienda en CORS_ORIGINS antes de desplegar.',
    );
  }

  app.enableCors({
    origin: comprobadorDeOrigen(cors),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply ClassSerializerInterceptor globally to respect @Exclude() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Serve static files from public directory.
  // `main.js` queda en `dist/src/`, así que subir un solo nivel apunta a
  // `dist/public` — que no existe. `public/` vive en la raíz del repo.
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Setup Swagger documentation
  const document = SwaggerModule.createDocument(app, v1SwaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Construir API V1 - Documentación',
    customfavIcon: 'https://construir.com/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
