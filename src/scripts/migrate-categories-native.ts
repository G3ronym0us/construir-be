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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function migrateCategories() {
  try {
    console.log('🚀 Starting category migration...\n');

    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const csvPath = path.join(process.env.HOME || '', 'Descargas', 'wc-product-export-7-10-2025-1759873182189.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV not found: ${csvPath}`);
      await dataSource.destroy();
      return;
    }

    console.log(`📄 Reading: ${csvPath}\n`);

    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    let headers: string[] = [];
    const categoryMap = new Map<string, CategoryRow>();
    const uniqueCategories = new Set<string>();
    const productCategories: Array<{sku: string, categories: string[]}> = [];

    for await (const line of rl) {
      lineNumber++;

      if (lineNumber === 1) {
        headers = parseCSVLine(line);
        console.log(`📋 Found ${headers.length} columns`);
        const catIndex = headers.findIndex(h => h === 'Categorías');
        const skuIndex = headers.findIndex(h => h === 'SKU');
        console.log(`   SKU column: ${skuIndex}`);
        console.log(`   Categorías column: ${catIndex}\n`);
        continue;
      }

      const fields = parseCSVLine(line);
      const skuIndex = headers.indexOf('SKU');
      const catIndex = headers.indexOf('Categorías');

      if (skuIndex === -1 || catIndex === -1) continue;

      const sku = fields[skuIndex]?.trim();
      const categoriesField = fields[catIndex]?.trim();

      if (!sku || !categoriesField) continue;

      // Split by comma or > for hierarchical categories
      const categories = categoriesField
        .split(/[,>]/)
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if (categories.length > 0) {
        productCategories.push({ sku, categories });
        categories.forEach(cat => uniqueCategories.add(cat));
      }
    }

    console.log(`✅ Parsed ${lineNumber - 1} products`);
    console.log(`📊 Found ${productCategories.length} products with categories`);
    console.log(`🔖 Found ${uniqueCategories.size} unique categories:\n`);

    Array.from(uniqueCategories).sort().forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat}`);
    });

    if (uniqueCategories.size === 0) {
      console.log('\n❌ No categories found');
      await dataSource.destroy();
      return;
    }

    // Create category entities
    console.log('\n🏗️  Creating categories...');
    for (const categoryName of Array.from(uniqueCategories)) {
      const slug = generateSlug(categoryName);

      const existing = await dataSource.query<CategoryRow[]>(
        `SELECT id, uuid, name, slug FROM categories WHERE slug = $1`,
        [slug]
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  Exists: "${categoryName}"`);
        categoryMap.set(categoryName, existing[0]);
        continue;
      }

      const result = await dataSource.query<CategoryRow[]>(
        `INSERT INTO categories (name, slug, "order", "isActive")
         VALUES ($1, $2, 0, true)
         RETURNING id, uuid, name, slug`,
        [categoryName, slug]
      );

      categoryMap.set(categoryName, result[0]);
      console.log(`   ✅ Created: "${categoryName}"`);
    }

    // Link products to categories
    console.log('\n🔗 Linking products...');
    let linkedCount = 0;
    let notFoundCount = 0;

    for (const { sku, categories } of productCategories) {
      const product = await dataSource.query(
        `SELECT id FROM products WHERE sku = $1`,
        [sku]
      );

      if (product.length === 0) {
        notFoundCount++;
        continue;
      }

      const productId = product[0].id;

      for (const categoryName of categories) {
        const category = categoryMap.get(categoryName);
        if (!category) continue;

        const existingLink = await dataSource.query(
          `SELECT * FROM product_categories WHERE product_id = $1 AND category_id = $2`,
          [productId, category.id]
        );

        if (existingLink.length > 0) continue;

        await dataSource.query(
          `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
          [productId, category.id]
        );

        linkedCount++;
      }
    }

    console.log(`   ✅ ${linkedCount} links created`);
    if (notFoundCount > 0) {
      console.log(`   ⚠️  ${notFoundCount} products not found`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Migration complete!');
    console.log('='.repeat(50));
    console.log(`Categories: ${uniqueCategories.size}`);
    console.log(`Links: ${linkedCount}`);
    console.log('='.repeat(50));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

migrateCategories();
