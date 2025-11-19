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

async function deleteMissingImages() {
  console.log('🔍 Conectando a la base de datos...\n');

  await AppDataSource.initialize();

  const imageRepository = AppDataSource.getRepository(ProductImage);

  console.log('📊 Obteniendo todas las imágenes de la base de datos...\n');
  const allImages = await imageRepository.find({
    relations: ['product'],
  });

  console.log(`Total de imágenes en BD: ${allImages.length}\n`);

  const toDelete: ProductImage[] = [];
  const toKeep: ProductImage[] = [];

  for (const image of allImages) {
    try {
      // Extraer el path local de la URL
      const urlMatch = image.url.match(/\/uploads\/(.+)$/);

      if (!urlMatch) {
        console.warn(`⚠️  URL inválida (ID: ${image.id}): ${image.url}`);
        toDelete.push(image);
        continue;
      }

      const relativePath = urlMatch[1];
      const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);

      if (fs.existsSync(fullPath)) {
        toKeep.push(image);
      } else {
        toDelete.push(image);
      }
    } catch (error) {
      console.error(`Error procesando imagen ${image.id}:`, error.message);
      toDelete.push(image);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 ANÁLISIS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Imágenes a conservar: ${toKeep.length}`);
  console.log(`❌ Imágenes a eliminar: ${toDelete.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (toDelete.length === 0) {
    console.log('✅ No hay imágenes para eliminar');
    await AppDataSource.destroy();
    return;
  }

  console.log('🗑️  Eliminando registros de imágenes faltantes...\n');

  let deleted = 0;
  const batchSize = 100;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    await imageRepository.remove(batch);
    deleted += batch.length;

    const percent = ((deleted / toDelete.length) * 100).toFixed(1);
    console.log(`🗑️  Progreso: ${percent}% (${deleted}/${toDelete.length})`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 RESUMEN DE LIMPIEZA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🗑️  Registros eliminados: ${deleted}`);
  console.log(`✅ Registros conservados: ${toKeep.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await AppDataSource.destroy();

  console.log('✅ Limpieza completada');
}

deleteMissingImages().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
