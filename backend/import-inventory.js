const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function importInventory() {
  try {
    console.log('🔄 Starting inventory import...');

    // Read the CSV file
    const csvPath = 'C:\\Users\\User\\Downloads\\Iposg.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');

    // Remove header and empty lines
    const dataLines = lines.slice(1).filter(line => line.trim());

    console.log(`📊 Found ${dataLines.length} products to import`);

    // Get the tenant ID
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      throw new Error('❌ No tenant found! Please create a tenant first.');
    }

    console.log(`🏢 Using tenant: ${tenant.businessName || tenant.id}`);

    // Ask for confirmation
    console.log('\n⚠️  This will import 2000+ products into the database.');
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];

      try {
        // Parse CSV line
        const parts = parseCSVLine(line);

        const plu = parts[0]?.trim();
        const barcode = parts[1]?.trim();
        const description = parts[2]?.trim();
        const stock = parts[3]?.trim();
        const sellPrice = parts[4]?.trim();
        const vat = parts[5]?.trim();

        // Validate required fields
        if (!plu || !description || !sellPrice) {
          errors.push(`Row ${i + 2}: Missing required fields (PLU, Description, or Sell Price)`);
          errorCount++;
          continue;
        }

        // Parse numeric values
        const stockQuantity = parseInt(stock) || 0;
        const sellingPrice = parseFloat(sellPrice.replace(/[^0-9.]/g, '')) || 0;

        if (sellingPrice <= 0) {
          errors.push(`Row ${i + 2}: Invalid selling price: ${sellPrice}`);
          errorCount++;
          continue;
        }

        // Check if product with this SKU already exists
        const existingProduct = await prisma.products.findFirst({
          where: {
            tenantId: tenant.id,
            sku: plu,
          },
        });

        if (existingProduct) {
          skippedCount++;
          if (skippedCount <= 10) {
            console.log(`⏭️  Skipped duplicate SKU: ${plu} - ${description}`);
          }
          continue;
        }

        // Create product ID
        const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Create the product
        await prisma.products.create({
          data: {
            id: productId,
            tenantId: tenant.id,
            name: description,
            description: vat ? `VAT: ${vat}` : null,
            sku: plu,
            barcode: barcode || null,
            sellingPrice: sellingPrice,
            stockQuantity: stockQuantity,
            minStockLevel: stockQuantity > 0 ? 1 : 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        successCount++;

        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`✅ Progress: ${i + 1}/${dataLines.length} processed (${successCount} imported, ${skippedCount} skipped, ${errorCount} errors)`);
        }
      } catch (error) {
        errorCount++;
        errors.push(`Row ${i + 2}: ${error.message}`);
        if (errorCount <= 10) {
          console.error(`❌ Error on row ${i + 2}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount} products`);
    console.log(`⏭️  Skipped (duplicates): ${skippedCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log(`📊 Total processed: ${dataLines.length} rows`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️  Sample Errors (first 20):');
      errors.slice(0, 20).forEach(err => console.log(`  - ${err}`));
      if (errors.length > 20) {
        console.log(`  ... and ${errors.length - 20} more errors`);
      }

      // Save error log
      const errorLogPath = path.join(__dirname, 'import-errors.log');
      fs.writeFileSync(errorLogPath, errors.join('\n'));
      console.log(`\n📝 Full error log saved to: ${errorLogPath}`);
    }

  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importInventory()
  .then(() => {
    console.log('\n🎉 Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
