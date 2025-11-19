import { DataSource } from 'typeorm';
import { ProductImage } from '../src/products/product-image.entity';
import { Product } from '../src/products/product.entity';
import { Category } from '../src/categories/category.entity';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as mime from 'mime-types';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'construir_db',
  entities: [Product, ProductImage, Category],
  synchronize: false,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

async function uploadToS3(
  filePath: string,
  s3Key: string,
): Promise<string | null> {
  try {
    const fileContent = fs.readFileSync(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    return s3Url;
  } catch (error) {
    console.error(`Error subiendo ${filePath}:`, error.message);
    return null;
  }
}

async function migrateImagesToS3() {
  console.log('🔍 Conectando a la base de datos...\n');

  if (!bucketName) {
    console.error('❌ AWS_S3_BUCKET_NAME no está configurado en .env');
    process.exit(1);
  }

  await AppDataSource.initialize();

  const imageRepository = AppDataSource.getRepository(ProductImage);

  console.log('📊 Obteniendo imágenes de la base de datos...\n');
  const allImages = await imageRepository.find({
    relations: ['product'],
  });

  console.log(`Total de imágenes: ${allImages.length}\n`);

  let processed = 0;
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  const progressInterval = Math.ceil(allImages.length / 20);

  for (const image of allImages) {
    processed++;

    try {
      // Saltar si ya está en S3
      if (image.url.includes('s3.amazonaws.com') || image.url.includes('amazonaws.com')) {
        skipped++;
        continue;
      }

      // Extraer el path local
      const urlMatch = image.url.match(/\/uploads\/(.+)$/);
      if (!urlMatch) {
        console.warn(`⚠️  URL inválida (ID: ${image.id}): ${image.url}`);
        errors++;
        continue;
      }

      const relativePath = urlMatch[1];
      const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);

      // Verificar que el archivo existe
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️  Archivo no encontrado (ID: ${image.id}): ${fullPath}`);
        errors++;
        continue;
      }

      // Generar S3 key manteniendo la estructura de carpetas
      const s3Key = `products/${relativePath}`;

      // Subir a S3
      const s3Url = await uploadToS3(fullPath, s3Key);

      if (s3Url) {
        // Actualizar URL y key en la BD
        image.url = s3Url;
        image.key = s3Key;
        await imageRepository.save(image);
        uploaded++;

        if (processed % progressInterval === 0) {
          const percent = ((processed / allImages.length) * 100).toFixed(1);
          console.log(`📤 Progreso: ${percent}% (${processed}/${allImages.length})`);
        }
      } else {
        errors++;
      }
    } catch (error) {
      console.error(`Error procesando imagen ${image.id}:`, error.message);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 RESUMEN DE MIGRACIÓN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Imágenes subidas a S3: ${uploaded}`);
  console.log(`⏭️  Imágenes ya en S3 (omitidas): ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📊 Total procesadas: ${processed}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await AppDataSource.destroy();

  console.log('✅ Migración completada');
}

migrateImagesToS3().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
