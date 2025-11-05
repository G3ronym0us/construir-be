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

interface ProductRow {
  id: number;
  category: string;
}

interface CategoryRow {
  id: number;
  uuid: string;
  name: string;
  slug: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

async function migrateCategories() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Step 1: Get all unique categories from products (old string-based categories)
    console.log('\n📊 Step 1: Extracting unique categories from products...');
    const products = await dataSource.query<ProductRow[]>(`
      SELECT DISTINCT category
      FROM products
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `);

    if (products.length === 0) {
      console.log('⚠️  No categories found in products table');
      await dataSource.destroy();
      return;
    }

    console.log(`   Found ${products.length} unique categories:`);
    products.forEach((p, i) => console.log(`   ${i + 1}. ${p.category}`));

    // Step 2: Create Category entities for each unique category
    console.log('\n🏗️  Step 2: Creating Category entities...');
    const categoryMap = new Map<string, number>(); // Maps old category name -> new category ID

    for (const product of products) {
      const categoryName = product.category;
      const slug = generateSlug(categoryName);

      // Check if category already exists
      const existing = await dataSource.query<CategoryRow[]>(
        `SELECT id, uuid, name, slug FROM categories WHERE slug = $1`,
        [slug]
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  Category "${categoryName}" already exists (slug: ${slug})`);
        categoryMap.set(categoryName, existing[0].id);
        continue;
      }

      // Create new category
      const result = await dataSource.query<CategoryRow[]>(
        `INSERT INTO categories (name, slug, "order", "isActive")
         VALUES ($1, $2, 0, true)
         RETURNING id, uuid, name, slug`,
        [categoryName, slug]
      );

      const newCategory = result[0];
      categoryMap.set(categoryName, newCategory.id);
      console.log(`   ✅ Created category: "${newCategory.name}" (UUID: ${newCategory.uuid})`);
    }

    // Step 3: Backup old category column data
    console.log('\n💾 Step 3: Creating backup of old category data...');

    // Check if backup column exists
    const columnCheck = await dataSource.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'category_backup'
    `);

    if (columnCheck.length === 0) {
      await dataSource.query(`
        ALTER TABLE products ADD COLUMN category_backup VARCHAR
      `);
      console.log('   ✅ Created category_backup column');
    }

    await dataSource.query(`
      UPDATE products
      SET category_backup = category
      WHERE category IS NOT NULL
    `);
    console.log('   ✅ Backed up old category data to category_backup column');

    // Step 4: Update products with category_id references
    console.log('\n🔗 Step 4: Linking products to Category entities...');

    let updatedCount = 0;
    for (const [categoryName, categoryId] of categoryMap.entries()) {
      const result = await dataSource.query(
        `UPDATE products
         SET category_id = $1
         WHERE category = $2`,
        [categoryId, categoryName]
      );

      const count = result[1] || 0;
      updatedCount += count;
      console.log(`   ✅ Updated ${count} products with category "${categoryName}"`);
    }

    // Step 5: Drop old category column
    console.log('\n🗑️  Step 5: Cleaning up old category column...');
    await dataSource.query(`
      ALTER TABLE products DROP COLUMN category
    `);
    console.log('   ✅ Dropped old category column (backup preserved in category_backup)');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Categories created: ${categoryMap.size}`);
    console.log(`   - Products updated: ${updatedCount}`);
    console.log(`   - Backup column: category_backup (can be removed later)`);
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

migrateCategories();
