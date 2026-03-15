const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDeletedProducts() {
  try {
    console.log('🧹 Cleaning up old deleted products with duplicate SKUs...\n');

    // Find all deleted products (isActive = false)
    const deletedProducts = await prisma.products.findMany({
      where: { isActive: false },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${deletedProducts.length} deleted product(s)\n`);

    if (deletedProducts.length === 0) {
      console.log('✅ No deleted products to clean up');
      return;
    }

    // Hard delete them from database
    for (const product of deletedProducts) {
      console.log(`🗑️  Permanently deleting: ${product.name} (${product.sku})`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Deleted: ${product.createdAt}`);

      await prisma.products.delete({
        where: { id: product.id }
      });

      console.log(`   ✅ Deleted from database\n`);
    }

    console.log(`\n🎉 Successfully cleaned up ${deletedProducts.length} deleted product(s)`);
    console.log('   Product deletion should now work correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDeletedProducts();
