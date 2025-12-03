import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

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

interface CategoryRow {
  id: number;
  uuid: string;
  name: string;
  slug: string;
}

interface ProductCategoryMap {
  sku: string;
  categories: string[];
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

async function parseCSV(filePath: string): Promise<ProductCategoryMap[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const products: ProductCategoryMap[] = [];
  let isFirstLine = true;
  let headers: string[] = [];
  let currentRecord = '';
  let inQuotes = false;

  for await (const line of rl) {
    if (isFirstLine) {
      headers = line.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      isFirstLine = false;
      continue;
    }

    // Handle multi-line records
    currentRecord += (currentRecord ? '\n' : '') + line;

    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (currentRecord.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (inQuotes) {
      continue; // Continue accumulating lines until quotes are balanced
    }

    // Parse the complete record
    const values: string[] = [];
    let currentValue = '';
    let insideQuote = false;

    for (let i = 0; i < currentRecord.length; i++) {
      const char = currentRecord[i];

      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const sku = row['SKU'];
    const categoriesField =
      row['Categorías'] || row['Categories'] || row['Categorias'] || '';

    // Debug: log first few products
    if (values.length > 0 && sku) {
      console.log(`DEBUG: SKU=${sku}, Categories field="${categoriesField}"`);
    }

    if (sku && categoriesField) {
      // Categories can be separated by commas or > (for hierarchical categories)
      const categories = categoriesField
        .split(/[,>]/)
        .map((cat: string) => cat.trim())
        .filter((cat: string) => cat.length > 0);

      if (categories.length > 0) {
        products.push({ sku, categories });
      }
    }

    currentRecord = '';
  }

  return products;
}

async function migrateCategories() {
  try {
    console.log('🚀 Starting category migration from CSV...\n');

    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // Find CSV file
    const csvPath = path.join(
      process.env.HOME || '',
      'Descargas',
      'wc-product-export-7-10-2025-1759873182189.csv',
    );

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      console.log('Please provide the correct path to your CSV file.');
      await dataSource.destroy();
      return;
    }

    console.log(`📄 Reading CSV from: ${csvPath}\n`);

    // Step 1: Parse CSV and extract categories
    console.log('📊 Step 1: Parsing CSV and extracting categories...');
    const productCategoryMaps = await parseCSV(csvPath);
    console.log(
      `   Found ${productCategoryMaps.length} products with categories\n`,
    );

    // Step 2: Get all unique categories
    console.log('🔍 Step 2: Identifying unique categories...');
    const uniqueCategories = new Set<string>();
    productCategoryMaps.forEach((pcm) => {
      pcm.categories.forEach((cat) => uniqueCategories.add(cat));
    });

    console.log(`   Found ${uniqueCategories.size} unique categories:`);
    Array.from(uniqueCategories)
      .sort()
      .forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat}`);
      });

    // Step 3: Create Category entities
    console.log('\n🏗️  Step 3: Creating Category entities...');
    const categoryMap = new Map<string, CategoryRow>(); // Maps category name -> category row

    for (const categoryName of Array.from(uniqueCategories)) {
      const slug = generateSlug(categoryName);

      // Check if category already exists
      const existing = await dataSource.query<CategoryRow[]>(
        `SELECT id, uuid, name, slug FROM categories WHERE slug = $1`,
        [slug],
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  Category "${categoryName}" already exists`);
        categoryMap.set(categoryName, existing[0]);
        continue;
      }

      // Create new category
      const result = await dataSource.query<CategoryRow[]>(
        `INSERT INTO categories (name, slug, "order", "isActive")
         VALUES ($1, $2, 0, true)
         RETURNING id, uuid, name, slug`,
        [categoryName, slug],
      );

      const newCategory = result[0];
      categoryMap.set(categoryName, newCategory);
      console.log(
        `   ✅ Created category: "${newCategory.name}" (UUID: ${newCategory.uuid})`,
      );
    }

    // Step 4: Link products to categories
    console.log('\n🔗 Step 4: Linking products to categories...');
    let linkedCount = 0;
    let notFoundCount = 0;

    for (const pcm of productCategoryMaps) {
      // Find product by SKU
      const product = await dataSource.query(
        `SELECT id FROM products WHERE sku = $1`,
        [pcm.sku],
      );

      if (product.length === 0) {
        console.log(`   ⚠️  Product not found: SKU ${pcm.sku}`);
        notFoundCount++;
        continue;
      }

      const productId = product[0].id;

      // Link to all categories
      for (const categoryName of pcm.categories) {
        const category = categoryMap.get(categoryName);

        if (!category) {
          console.log(`   ⚠️  Category not found: "${categoryName}"`);
          continue;
        }

        // Check if relationship already exists
        const existingLink = await dataSource.query(
          `SELECT * FROM product_categories WHERE product_id = $1 AND category_id = $2`,
          [productId, category.id],
        );

        if (existingLink.length > 0) {
          continue; // Already linked
        }

        // Create the link
        await dataSource.query(
          `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
          [productId, category.id],
        );

        linkedCount++;
      }
    }

    console.log(`   ✅ Linked ${linkedCount} product-category relationships`);
    if (notFoundCount > 0) {
      console.log(`   ⚠️  ${notFoundCount} products not found in database`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Unique categories found: ${uniqueCategories.size}`);
    console.log(`   - Categories created/found: ${categoryMap.size}`);
    console.log(`   - Product-category links created: ${linkedCount}`);
    console.log(`   - Products not found: ${notFoundCount}`);
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

migrateCategories();
