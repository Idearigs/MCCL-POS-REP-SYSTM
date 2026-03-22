const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding categories and suppliers...\n');

  try {
    // Get the tenant
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!tenant) {
      console.error('❌ No active tenant found!');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

    // Define default categories
    const categories = [
      { name: 'Rings', description: 'All types of rings including engagement, wedding, and fashion rings' },
      { name: 'Necklaces', description: 'Necklaces and chains' },
      { name: 'Bracelets', description: 'Bracelets and bangles' },
      { name: 'Earrings', description: 'All types of earrings' },
      { name: 'Pendants', description: 'Pendant jewelry' },
      { name: 'Watches', description: 'Wrist watches' },
      { name: 'Other', description: 'Other jewelry items' },
    ];

    // Create categories
    console.log('📁 Creating categories...');
    for (const category of categories) {
      const existing = await prisma.category.findFirst({
        where: {
          name: category.name,
          tenantId: tenant.id,
        },
      });

      if (existing) {
        console.log(`  ⏭️  ${category.name} already exists`);
      } else {
        const created = await prisma.category.create({
          data: {
            ...category,
            tenantId: tenant.id,
          },
        });
        console.log(`  ✅ Created: ${created.name} (${created.id})`);
      }
    }

    // Define default suppliers
    const suppliers = [
      {
        name: 'Gold Suppliers Ltd',
        contactPerson: 'John Smith',
        email: 'contact@goldsuppliers.com',
        phone: '+44 20 7123 4567',
        notes: 'Primary gold supplier'
      },
      {
        name: 'Diamond Wholesalers',
        contactPerson: 'Sarah Johnson',
        email: 'info@diamondwholesalers.com',
        phone: '+44 20 7234 5678',
        notes: 'Diamond and gemstone supplier'
      },
      {
        name: 'Silver Imports Co',
        contactPerson: 'Mike Chen',
        email: 'sales@silverimports.com',
        phone: '+44 20 7345 6789',
        notes: 'Silver jewelry supplier'
      },
    ];

    console.log('\n🏢 Creating suppliers...');
    for (const supplier of suppliers) {
      const existing = await prisma.supplier.findFirst({
        where: {
          name: supplier.name,
          tenantId: tenant.id,
        },
      });

      if (existing) {
        console.log(`  ⏭️  ${supplier.name} already exists`);
      } else {
        const created = await prisma.supplier.create({
          data: {
            ...supplier,
            tenantId: tenant.id,
          },
        });
        console.log(`  ✅ Created: ${created.name} (${created.id})`);
      }
    }

    // Show all categories with IDs
    console.log('\n📋 Final Categories List:');
    const allCategories = await prisma.category.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });

    allCategories.forEach((cat) => {
      console.log(`  • ${cat.name}: ${cat.id}`);
    });

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n💡 Tip: Your frontend should send categoryId (UUID) not category name when creating products.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
