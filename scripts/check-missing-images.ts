import { DataSource } from 'typeorm';
import { ProductImage } from '../src/products/product-image.entity';
import { Product } from '../src/products/product.entity';
import { Category } from '../src/categories/category.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

async function checkMissingImages() {
  console.log('🔍 Conectando a la base de datos...\n');

  await AppDataSource.initialize();

  const imageRepository = AppDataSource.getRepository(ProductImage);

  console.log('📊 Obteniendo todas las imágenes de la base de datos...\n');
  const allImages = await imageRepository.find({
    relations: ['product'],
  });

  console.log(`Total de imágenes en BD: ${allImages.length}\n`);

  const missingImages: any[] = [];
  const existingImages: ProductImage[] = [];
  const invalidUrls: any[] = [];

  for (const image of allImages) {
    try {
      // Extraer el path local de la URL
      // Formato esperado: http://localhost:3000/uploads/YYYY/MM/imagen.jpg
      const urlMatch = image.url.match(/\/uploads\/(.+)$/);

      if (!urlMatch) {
        invalidUrls.push({
          id: image.id,
          url: image.url,
          productId: image.productId,
          productName: image.product?.name || 'N/A',
        });
        continue;
      }

      const relativePath = urlMatch[1];
      const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);

      if (fs.existsSync(fullPath)) {
        existingImages.push(image);
      } else {
        missingImages.push({
          id: image.id,
          url: image.url,
          path: fullPath,
          productId: image.productId,
          productName: image.product?.name || 'N/A',
          isPrimary: image.isPrimary,
        });
      }
    } catch (error) {
      console.error(`Error procesando imagen ${image.id}:`, error.message);
    }
  }

  // Resultados
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 RESUMEN');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Imágenes que existen: ${existingImages.length}`);
  console.log(`❌ Imágenes faltantes: ${missingImages.length}`);
  console.log(`⚠️  URLs inválidas: ${invalidUrls.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (invalidUrls.length > 0) {
    console.log('⚠️  URLs INVÁLIDAS (formato incorrecto):');
    console.log('───────────────────────────────────────────────────────────');
    invalidUrls.slice(0, 10).forEach((img) => {
      console.log(`  ID: ${img.id}`);
      console.log(`  URL: ${img.url}`);
      console.log(`  Producto: ${img.productName} (ID: ${img.productId})`);
      console.log('');
    });
    if (invalidUrls.length > 10) {
      console.log(`  ... y ${invalidUrls.length - 10} más\n`);
    }
  }

  if (missingImages.length > 0) {
    console.log('❌ IMÁGENES FALTANTES (en BD pero no en disco):');
    console.log('───────────────────────────────────────────────────────────');
    missingImages.slice(0, 10).forEach((img) => {
      console.log(`  ID: ${img.id}`);
      console.log(`  URL: ${img.url}`);
      console.log(`  Producto: ${img.productName} (ID: ${img.productId})`);
      console.log(`  Primaria: ${img.isPrimary ? 'Sí' : 'No'}`);
      console.log('');
    });
    if (missingImages.length > 10) {
      console.log(`  ... y ${missingImages.length - 10} más\n`);
    }

    // Guardar lista completa en archivo
    const reportPath = path.join(process.cwd(), 'missing-images-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(missingImages, null, 2));
    console.log(`📄 Reporte completo guardado en: ${reportPath}\n`);
  }

  await AppDataSource.destroy();

  console.log('✅ Proceso completado');
}

checkMissingImages().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
