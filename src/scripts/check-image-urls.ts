import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 Checking current image URLs in database...\n');

  try {
    // Get sample URLs
    const samples = await dataSource.query(`
      SELECT url FROM product_images LIMIT 10
    `);

    console.log('📋 Sample URLs from database:');
    samples.forEach((sample: any, index: number) => {
      console.log(`  ${index + 1}. ${sample.url}`);
    });

    // Count different URL patterns
    const stats = await dataSource.query(`
      SELECT
        CASE
          WHEN url LIKE 'http://54.236.97.190%' THEN 'WordPress (old)'
          WHEN url LIKE 'http://localhost:3000%' THEN 'Localhost (absolute)'
          WHEN url LIKE '/%' THEN 'Relative path'
          ELSE 'Other'
        END as url_type,
        COUNT(*) as count
      FROM product_images
      GROUP BY url_type
    `);

    console.log('\n📊 URL Statistics:');
    stats.forEach((stat: any) => {
      console.log(`  ${stat.url_type}: ${stat.count}`);
    });

    const total = await dataSource.query(`
      SELECT COUNT(*) as count FROM product_images
    `);

    console.log(`\n✅ Total images: ${total[0].count}`);

  } catch (error) {
    console.error('❌ Error checking URLs:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
