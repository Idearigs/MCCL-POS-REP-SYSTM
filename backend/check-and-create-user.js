const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking database connection...');

    // Check if database is accessible
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // Check for existing tenants
    console.log('🏢 Checking for tenants...');
    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenant(s)`);

    let tenant;
    if (tenants.length === 0) {
      console.log('\n📝 Creating default tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Buy Me Jewellery',
          domain: 'buymejewellery.co.uk',
          subdomain: 'buymejewellery',
          subscriptionPlan: 'premium',
          status: 'ACTIVE',
        },
      });
      console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);
    } else {
      tenant = tenants[0];
      console.log(`✅ Using existing tenant: ${tenant.name} (ID: ${tenant.id})`);
    }

    // Check for existing users
    console.log('\n👥 Checking for users...');
    const users = await prisma.user.findMany({
      include: {
        tenant: true,
      },
    });

    console.log(`Found ${users.length} user(s)`);

    if (users.length > 0) {
      console.log('\n📋 Existing Users:');
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Tenant: ${user.tenant.name}`);
      });
    }

    // Create a test user if none exist
    if (users.length === 0) {
      console.log('\n🔐 No users found. Creating admin user...');

      const hashedPassword = await bcrypt.hash('admin123', 12);

      const adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'admin@buymejewellery.com',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'OWNER',
          isActive: true,
        },
      });

      console.log('✅ Admin user created successfully!');
      console.log('\n🔑 LOGIN CREDENTIALS:');
      console.log('   Email: admin@buymejewellery.com');
      console.log('   Password: admin123');
      console.log('   Role: OWNER');
    } else {
      console.log('\n⚠️  Users already exist in the database.');
      console.log('\n🔑 CREATING TEMPORARY LOGIN:');

      const hashedPassword = await bcrypt.hash('temp123', 12);

      const tempUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'temp@test.com',
          password: hashedPassword,
          firstName: 'Temporary',
          lastName: 'User',
          role: 'OWNER',
          isActive: true,
        },
      });

      console.log('✅ Temporary user created successfully!');
      console.log('\n🔑 TEMPORARY LOGIN CREDENTIALS:');
      console.log('   Email: temp@test.com');
      console.log('   Password: temp123');
      console.log('   Role: OWNER');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P1001') {
      console.error('\n⚠️  Cannot reach database server. Please check:');
      console.error('   - Database server is running');
      console.error('   - Connection details are correct');
      console.error('   - Network/firewall allows connection');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
