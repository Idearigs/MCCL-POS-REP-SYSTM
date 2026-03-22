const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductStatus() {
  try {
    console.log('🔍 Checking product status for specific IDs...\n');

    const productIds = [
      'b7u2cp1u1us2k7pzq4vv6u93',
      'o4bs9vc12b32utn9lt8vj0s0',
      'nl7w2ouvrkct9pyfwhncez8o'
    ];

    for (const productId of productIds) {
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
          isActive: true,
          isDamaged: true,
          stockQuantity: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (product) {
        console.log(`✅ Product Found: ${productId}`);
        console.log(`   Name: ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   isActive: ${product.isActive} ${!product.isActive ? '⚠️ INACTIVE' : '✓'}`);
        console.log(`   isDamaged: ${product.isDamaged}`);
        console.log(`   Stock Quantity: ${product.stockQuantity}`);
        console.log(`   Created: ${product.createdAt}`);
        console.log(`   Updated: ${product.updatedAt}`);
        console.log('');
      } else {
        console.log(`❌ Product NOT Found: ${productId}\n`);
      }
    }

    // Also check how many products are active vs inactive in total
    const totalActive = await prisma.products.count({
      where: { isActive: true }
    });

    const totalInactive = await prisma.products.count({
      where: { isActive: false }
    });

    const totalAll = await prisma.products.count();

    console.log('📊 Database Summary:');
    console.log(`   Total Products: ${totalAll}`);
    console.log(`   Active Products: ${totalActive}`);
    console.log(`   Inactive Products: ${totalInactive}`);

  } catch (error) {
    console.error('❌ Error checking product status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductStatus();
