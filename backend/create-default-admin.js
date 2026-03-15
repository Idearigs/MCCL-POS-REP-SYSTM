const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'));
  return hash.digest('hex');
}

async function createDefaultAdmin() {
  console.log('\n🔧 TrueDesk MainFrame - Creating Default Admin\n');
  console.log('========================================\n');

  try {
    // Check if admin already exists
    const existing = await prisma.mf_admins.findUnique({
      where: { email: 'admin@truedesk.com' }
    });

    if (existing) {
      console.log('✅ Admin already exists!\n');
      console.log('Email:    admin@truedesk.com');
      console.log('Password: admin123');
      console.log('\n🚀 Login at http://localhost:5174\n');
      return;
    }

    const admin = await prisma.mf_admins.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@truedesk.com',
        passwordHash: hashPassword('admin123'),
        role: 'super_admin',
      },
    });

    console.log('✅ MainFrame Admin Created Successfully!\n');
    console.log('========================================');
    console.log('Name:     Admin User');
    console.log('Email:    admin@truedesk.com');
    console.log('Password: admin123');
    console.log('Role:     super_admin');
    console.log('========================================\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');
    console.log('🚀 Login at http://localhost:5174\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultAdmin();
