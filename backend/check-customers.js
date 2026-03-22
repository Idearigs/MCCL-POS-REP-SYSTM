const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    console.log('🔍 Checking customer data in VPS database...\n');

    // Get total count
    const totalCount = await prisma.customer.count();
    console.log(`📊 Total customers in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  No customers found in the database!');
      console.log('   This could mean:');
      console.log('   1. No customers have been created yet');
      console.log('   2. There is an issue with customer creation\n');
    } else {
      // Get the most recent customers
      const customers = await prisma.customer.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: {
            select: { name: true }
          }
        }
      });

      console.log('📝 Most recent customers:\n');
      customers.forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.firstName} ${customer.lastName}`);
        console.log(`   Email: ${customer.email || 'N/A'}`);
        console.log(`   Phone: ${customer.phone || 'N/A'}`);
        console.log(`   Tenant: ${customer.tenant.name}`);
        console.log(`   Created: ${customer.createdAt.toLocaleString()}`);
        console.log(`   Active: ${customer.isActive}`);
        console.log('');
      });
    }

    // Check by tenant
    const buymejewelleryCustomers = await prisma.customer.count({
      where: { tenant: { subdomain: 'buymejewellery' } }
    });
    console.log(`👤 Customers for "buymejewellery" tenant: ${buymejewelleryCustomers}`);

  } catch (error) {
    console.error('❌ Error checking customers:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
