import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 Checking products in database...\n');

  try {
    // Total products
    const total = await dataSource.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL
    `);
    console.log(`📊 Total products: ${total[0].count}`);

    // Published products
    const published = await dataSource.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL AND published = true
    `);
    console.log(`✅ Published products: ${published[0].count}`);

    // Featured products
    const featured = await dataSource.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL AND featured = true
    `);
    console.log(`⭐ Featured products: ${featured[0].count}`);

    // Published AND Featured
    const both = await dataSource.query(`
      SELECT COUNT(*) as count FROM products
      WHERE deleted_at IS NULL AND published = true AND featured = true
    `);
    console.log(`🌟 Published AND Featured: ${both[0].count}`);

    // Sample products
    const samples = await dataSource.query(`
      SELECT name, sku, published, featured
      FROM products
      WHERE deleted_at IS NULL
      LIMIT 5
    `);

    console.log('\n📋 Sample products:');
    samples.forEach((p: any, index: number) => {
      console.log(`  ${index + 1}. ${p.name} (${p.sku}) - Published: ${p.published}, Featured: ${p.featured}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
