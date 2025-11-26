import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { ExchangeRateTasksService } from '../exchange-rates/exchange-rate-tasks.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
  console.log('🚀 Initializing exchange rate system...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const exchangeRatesService = app.get(ExchangeRatesService);
  const exchangeRateTasksService = app.get(ExchangeRateTasksService);

  try {
    // 1. Check if exchange rate already exists for today
    console.log('📊 Checking for existing exchange rates...');
    const existingRates = await dataSource.query(`
      SELECT COUNT(*) as count FROM exchange_rates
    `);

    const rateCount = parseInt(existingRates[0].count);
    console.log(`  Found ${rateCount} existing exchange rate(s)\n`);

    // 2. Sync exchange rate from BCV API
    console.log('💱 Fetching current exchange rate from BCV...');
    const exchangeRate = await exchangeRatesService.sync();
    console.log(`  ✅ Exchange rate synchronized: ${exchangeRate.rate} VES/USD`);
    console.log(`  📅 Date: ${exchangeRate.date}`);
    console.log(`  📡 Source: ${exchangeRate.source}\n`);

    // 3. Count products to update
    const productsCount = await dataSource.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL
    `);
    const totalProducts = parseInt(productsCount[0].count);
    console.log(`📦 Updating VES prices for ${totalProducts} product(s)...`);

    // 4. Update all product prices in VES
    await exchangeRateTasksService.updateAllProductPrices();
    console.log('  ✅ All product prices updated successfully!\n');

    // 5. Show sample of updated products
    const samples = await dataSource.query(`
      SELECT name, price, price_ves
      FROM products
      WHERE deleted_at IS NULL AND price_ves IS NOT NULL
      LIMIT 5
    `);

    if (samples.length > 0) {
      console.log('📋 Sample product prices:');
      samples.forEach((sample: any, index: number) => {
        console.log(`  ${index + 1}. ${sample.name}`);
        console.log(`     USD: $${Number(sample.price).toFixed(2)}`);
        console.log(`     VES: Bs. ${Number(sample.price_ves).toFixed(2)}\n`);
      });
    }

    // 6. Show statistics
    const stats = await dataSource.query(`
      SELECT
        COUNT(*) as total_products,
        COUNT(price_ves) as products_with_ves_price,
        MIN(price_ves) as min_price_ves,
        MAX(price_ves) as max_price_ves,
        AVG(price_ves)::numeric(10,2) as avg_price_ves
      FROM products
      WHERE deleted_at IS NULL
    `);

    const stat = stats[0];
    console.log('📊 Summary:');
    console.log(`  Total products: ${stat.total_products}`);
    console.log(`  Products with VES price: ${stat.products_with_ves_price}`);
    console.log(`  Min VES price: Bs. ${Number(stat.min_price_ves).toFixed(2)}`);
    console.log(`  Max VES price: Bs. ${Number(stat.max_price_ves).toFixed(2)}`);
    console.log(`  Avg VES price: Bs. ${Number(stat.avg_price_ves).toFixed(2)}\n`);

    console.log('✨ Exchange rate initialization completed successfully!');
    console.log('\n💡 The system will automatically update prices daily at 1:00 AM');
    console.log('💡 You can also manually sync with: POST /exchange-rates/sync\n');

  } catch (error) {
    console.error('❌ Error initializing exchange rate:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
