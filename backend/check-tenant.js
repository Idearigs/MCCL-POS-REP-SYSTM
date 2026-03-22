const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking tenants in database...\n');

    const tenants = await prisma.tenant.findMany();

    console.log(`Found ${tenants.length} tenant(s):\n`);

    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Domain: ${tenant.domain}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Status: ${tenant.status}`);
      console.log('');
    });

    // Check if there's an ACTIVE tenant
    const activeTenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (activeTenant) {
      console.log(`✅ Active tenant found: ${activeTenant.name}`);
    } else {
      console.log('⚠️  No ACTIVE tenants found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
