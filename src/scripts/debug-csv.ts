import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

async function debugCSV() {
  const csvPath = path.join(process.env.HOME || '', 'Descargas', 'wc-product-export-7-10-2025-1759873182189.csv');

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let headers: string[] = [];

  for await (const line of rl) {
    lineCount++;

    if (lineCount === 1) {
      // Parse headers
      const parts = line.split(',');
      headers = parts.map(h => h.trim().replace(/^"|"$/g, ''));

      console.log('Headers found:');
      headers.forEach((h, i) => {
        if (h.toLowerCase().includes('categ') || h.toLowerCase().includes('sku')) {
          console.log(`  [${i}]: ${h}`);
        }
      });
      continue;
    }

    if (lineCount <= 5) {
      const parts = line.split(',');
      console.log(`\nLine ${lineCount}:`);
      console.log(`  Total fields: ${parts.length}`);
      console.log(`  SKU (field 2): ${parts[2]}`);
      console.log(`  Categories (field 28): ${parts[28]}`);
    }

    if (lineCount > 5) break;
  }
}

debugCSV();
