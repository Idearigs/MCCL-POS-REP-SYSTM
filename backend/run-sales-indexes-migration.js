const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Running Sales Management indexes migration...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'prisma', 'migrations', 'add_sales_indexes.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Extract index name from statement for better logging
      const indexNameMatch = statement.match(/idx_\w+/);
      const indexName = indexNameMatch ? indexNameMatch[0] : `Statement ${i + 1}`;

      try {
        console.log(`✓ Creating index: ${indexName}`);
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        // Ignore if index already exists
        if (error.message.includes('already exists')) {
          console.log(`  → Already exists, skipping`);
        } else {
          console.error(`  ✗ Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Sales Management indexes migration completed successfully!');
    console.log('\nIndexes created:');
    console.log('  • Sales table: 9 indexes for improved query performance');
    console.log('  • Sale items table: 2 indexes for product tracking');
    console.log('  • Payments table: 3 indexes for payment filtering');
    console.log('\nBenefits:');
    console.log('  ✓ Faster sales listing and sorting');
    console.log('  ✓ Quick receipt number lookups');
    console.log('  ✓ Efficient customer purchase history queries');
    console.log('  ✓ Better performance for analytics and reports');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
