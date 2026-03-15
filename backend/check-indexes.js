const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkIndexes() {
  try {
    console.log('🔍 Checking database indexes...\n');

    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'products'
      AND indexname LIKE 'unique_active%'
      ORDER BY indexname
    `;

    console.log('📊 Current unique indexes on products table:');
    console.log(JSON.stringify(indexes, null, 2));

    if (indexes.length === 0) {
      console.log('\n❌ No partial unique indexes found!');
      console.log('   The old composite unique constraints might still be in place.');
    } else {
      console.log('\n✅ Found partial unique indexes');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkIndexes();
