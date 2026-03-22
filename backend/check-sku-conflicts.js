const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSkuConflicts() {
  const sku = 'JWL-20251014-001';

  try {
    console.log(`🔍 Checking for products with SKU: ${sku}\n`);

    const products = await prisma.products.findMany({
      where: { sku },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${products.length} product(s) with this SKU:\n`);

    products.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p.id}`);
      console.log(`   Name: ${p.name}`);
      console.log(`   isActive: ${p.isActive}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log('');
    });

    if (products.length > 1) {
      const activeCount = products.filter(p => p.isActive).length;
      const inactiveCount = products.filter(p => !p.isActive).length;

      console.log(`📊 Active: ${activeCount}, Inactive: ${inactiveCount}`);

      if (inactiveCount > 0) {
        console.log('\n⚠️  There are deleted products with this SKU.');
        console.log('   The partial index should allow this, but Prisma client');
        console.log('   is still enforcing the old 3-field composite constraint.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSkuConflicts();
