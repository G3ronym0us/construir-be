import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔄 Updating image URLs from WordPress to local...\n');

  try {
    // Get API URL from environment or use default
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Check current state
    const beforeStats = await dataSource.query(`
      SELECT
        CASE
          WHEN url LIKE 'http://54.236.97.190%' THEN 'WordPress'
          WHEN url LIKE 'http://%' OR url LIKE 'https://%' THEN 'Absolute'
          ELSE 'Relative'
        END as url_type,
        COUNT(*) as count
      FROM product_images
      GROUP BY url_type
    `);

    console.log('📊 Current URL state:');
    beforeStats.forEach((stat: any) => {
      console.log(`  ${stat.url_type}: ${stat.count}`);
    });
    console.log('');

    let totalUpdated = 0;

    // Update WordPress URLs
    const wordpressResult = await dataSource.query(`
      UPDATE product_images
      SET url = REPLACE(url, 'http://54.236.97.190/wp-content/uploads/', $1)
      WHERE url LIKE 'http://54.236.97.190%'
    `, [`${apiUrl}/uploads/`]);

    if (wordpressResult[1] > 0) {
      console.log(`✅ Updated ${wordpressResult[1]} WordPress URLs`);
      totalUpdated += wordpressResult[1];
    }

    // Update relative URLs to absolute
    const relativeResult = await dataSource.query(`
      UPDATE product_images
      SET url = $1::text || url
      WHERE url LIKE '/%' AND url NOT LIKE 'http://%' AND url NOT LIKE 'https://%'
    `, [apiUrl]);

    if (relativeResult[1] > 0) {
      console.log(`✅ Updated ${relativeResult[1]} relative URLs to absolute`);
      totalUpdated += relativeResult[1];
    }

    if (totalUpdated === 0) {
      console.log('✅ All image URLs are already in absolute format!');
    } else {
      console.log(`\n🎉 Total updated: ${totalUpdated} URLs`);
      console.log(`\n💡 All images now use format: ${apiUrl}/uploads/...\n`);
    }

    // Show sample of updated URLs
    const samples = await dataSource.query(`
      SELECT url FROM product_images LIMIT 5
    `);

    console.log('📋 Sample URLs:');
    samples.forEach((sample: any, index: number) => {
      console.log(`  ${index + 1}. ${sample.url}`);
    });

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error updating image URLs:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
