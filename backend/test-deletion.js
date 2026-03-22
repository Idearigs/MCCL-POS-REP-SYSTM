const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDeletion() {
  const productId = 'cmgq6qmop0005o7kgps1h32bj'; // Watch product

  try {
    console.log(`🧪 Testing soft delete for product: ${productId}\n`);

    // Get the product first
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    if (!product) {
      console.log('❌ Product not found!');
      return;
    }

    console.log(`📦 Product: ${product.name} (${product.sku})`);
    console.log(`   Current isActive: ${product.isActive}\n`);

    // Try to soft delete (set isActive to false)
    console.log('🗑️  Attempting soft delete...');
    const updated = await prisma.products.update({
      where: { id: productId },
      data: { isActive: false }
    });

    console.log('✅ Soft delete successful!');
    console.log(`   New isActive: ${updated.isActive}\n`);

    // Restore it for future tests
    console.log('🔄 Restoring product...');
    await prisma.products.update({
      where: { id: productId },
      data: { isActive: true }
    });
    console.log('✅ Product restored\n');

    console.log('🎉 Product deletion is now working correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.log('\n⚠️  Still getting unique constraint error!');
      console.log('   The Prisma client might need another regeneration.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDeletion();
