import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { v1SwaggerConfig } from './api-v1/common/swagger/swagger-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
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
