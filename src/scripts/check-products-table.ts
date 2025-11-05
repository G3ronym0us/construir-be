import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'construir',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
});

async function checkTable() {
  try {
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    // Check all columns in products table
    console.log('📋 Products table columns:');
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);

    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if there's any category-related column
    console.log('\n🔍 Looking for category-related columns:');
    const categoryColumns = columns.filter((col: any) =>
      col.column_name.toLowerCase().includes('categ')
    );

    if (categoryColumns.length > 0) {
      console.log('  Found:');
      categoryColumns.forEach((col: any) => {
        console.log(`    ✅ ${col.column_name} (${col.data_type})`);
      });

      // Sample data from category columns
      for (const col of categoryColumns) {
        console.log(`\n  Sample data from ${col.column_name}:`);
        const sample = await dataSource.query(`
          SELECT sku, "${col.column_name}"
          FROM products
          WHERE "${col.column_name}" IS NOT NULL
          LIMIT 5
        `);
        console.table(sample);
      }
    } else {
      console.log('  ❌ No category columns found');
    }

    // Check product_categories junction table
    console.log('\n📊 Checking product_categories junction table:');
    try {
      const junctionCount = await dataSource.query(`
        SELECT COUNT(*) as count FROM product_categories
      `);
      console.log(`  Total links: ${junctionCount[0].count}`);

      if (junctionCount[0].count > 0) {
        console.log('\n  Sample links:');
        const sampleLinks = await dataSource.query(`
          SELECT
            p.sku,
            c.name as category_name
          FROM product_categories pc
          JOIN products p ON p.id = pc.product_id
          JOIN categories c ON c.id = pc.category_id
          LIMIT 10
        `);
        console.table(sampleLinks);
      }
    } catch (e) {
      console.log('  ⚠️  product_categories table might not exist yet');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    await dataSource.destroy();
  }
}

checkTable();
