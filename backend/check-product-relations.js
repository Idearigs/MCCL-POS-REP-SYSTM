const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductRelations() {
  const productId = 'cmgpe0r1t0003o76o8ph6ni4n';

  try {
    console.log(`🔍 Checking product relations for ID: ${productId}\n`);

    // Get the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        inventoryLogs: true,
        saleItems: true,
      }
    });

    if (!product) {
      console.log('❌ Product not found!');
      return;
    }

    console.log(`📦 Product: ${product.name} (${product.sku})`);
    console.log(`   isActive: ${product.isActive}`);
    console.log(`   Created: ${product.createdAt}`);
    console.log('');

    console.log(`🖼️  Product Images: ${product.images.length}`);
    product.images.forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.fileName} (${img.fileSize} bytes)`);
    });
    console.log('');

    console.log(`📊 Inventory Logs: ${product.inventoryLogs.length}`);
    product.inventoryLogs.slice(0, 3).forEach((log, i) => {
      console.log(`   ${i + 1}. ${log.type} - Qty: ${log.quantity} (${new Date(log.createdAt).toLocaleString()})`);
    });
    console.log('');

    console.log(`💰 Sale Items: ${product.saleItems.length}`);
    if (product.saleItems.length > 0) {
      console.log('   ⚠️  WARNING: Product has been sold! This might prevent deletion.');
      product.saleItems.forEach((item, i) => {
        console.log(`   ${i + 1}. Sale ID: ${item.saleId}, Qty: ${item.quantity}`);
      });
    }
    console.log('');

    // Try the soft delete
    console.log('🧪 Testing soft delete...');
    try {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
      });
      console.log('✅ Soft delete successful!');

      // Revert the change
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: true }
      });
      console.log('✅ Reverted change for testing purposes');
    } catch (error) {
      console.log('❌ Soft delete failed:', error.message);
      console.log('\nFull error:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductRelations();
