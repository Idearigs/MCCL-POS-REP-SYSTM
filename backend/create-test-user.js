const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test tenant and user...\n');

    // Check if tenant already exists
    let tenant = await prisma.tenant.findFirst({
      where: { subdomain: 'test' }
    });

    if (!tenant) {
      // Create test tenant
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Jewelry Store',
          domain: 'test.local',
          subdomain: 'test',
          status: 'ACTIVE',
          subscriptionPlan: 'premium',
        },
      });
      console.log('✅ Created test tenant:', tenant.name);
    } else {
      console.log('ℹ️  Test tenant already exists:', tenant.name);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'admin@test.local' }
    });

    if (existingUser) {
      console.log('ℹ️  User already exists');
      console.log('\n📋 LOGIN CREDENTIALS:');
      console.log('═══════════════════════════════════════');
      console.log('Email:    admin@test.local');
      console.log('Password: admin123');
      console.log('Tenant:   test');
      console.log('═══════════════════════════════════════\n');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'admin@test.local',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'OWNER',
        tenantId: tenant.id,
        isActive: true,
      },
    });

    console.log('✅ Created test user:', user.email);
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════');
    console.log('Email:    admin@test.local');
    console.log('Password: admin123');
    console.log('Tenant:   test');
    console.log('Role:     OWNER');
    console.log('═══════════════════════════════════════\n');

    console.log('🎉 Test user created successfully!\n');
    console.log('You can now login with these credentials at:');
    console.log('http://localhost:8081/login\n');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
