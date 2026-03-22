const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateVATData() {
  try {
    console.log('🔄 Starting VAT data migration...');

    // Find all products with VAT in description
    const products = await prisma.products.findMany({
      where: {
        description: {
          startsWith: 'VAT:'
        }
      }
    });

    console.log(`📊 Found ${products.length} products with VAT in description`);

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Extract VAT percentage from description
        // Format: "VAT: 20%" or "VAT: 0%"
        const match = product.description?.match(/VAT:\s*(\d+)%/);

        if (match) {
          const vatRate = parseFloat(match[1]);

          // Update product
          await prisma.products.update({
            where: { id: product.id },
            data: {
              taxRate: vatRate,
              description: null, // Clear the description since it only contained VAT
              updatedAt: new Date(),
            }
          });

          successCount++;

          if (successCount % 100 === 0) {
            console.log(`✅ Migrated ${successCount}/${products.length} products...`);
          }
        } else {
          console.warn(`⚠️  Could not extract VAT from: "${product.description}" for SKU: ${product.sku}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error migrating product ${product.sku}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log('='.repeat(60));

    // Show some examples
    console.log('\n📋 Sample migrated products:');
    const samples = await prisma.products.findMany({
      where: {
        sku: { in: ['5046', '5045', '5044', '5001', '5000'] }
      },
      select: {
        sku: true,
        name: true,
        sellingPrice: true,
        taxRate: true,
        description: true
      }
    });

    samples.forEach(p => {
      console.log(`\nSKU: ${p.sku}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Price: £${p.sellingPrice}`);
      console.log(`  Tax Rate: ${p.taxRate}%`);
      console.log(`  Description: ${p.description || '(empty)'}`);
    });

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateVATData()
  .then(() => {
    console.log('\n🎉 VAT migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
