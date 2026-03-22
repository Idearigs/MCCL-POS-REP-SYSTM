const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'));
  return hash.digest('hex');
}

async function createAdmin() {
  console.log('\n🔧 TrueDesk MainFrame - Create Admin User\n');
  console.log('========================================\n');

  try {
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    const role = await question('Role (super_admin/admin) [super_admin]: ') || 'super_admin';

    console.log('\n⏳ Creating admin user...\n');

    // Check if admin already exists
    const existing = await prisma.mf_admins.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      console.log('❌ Error: Admin with this email already exists!\n');
      rl.close();
      process.exit(1);
    }

    const admin = await prisma.mf_admins.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        role,
      },
    });

    console.log('✅ MainFrame Admin Created Successfully!\n');
    console.log('========================================');
    console.log('ID:       ', admin.id);
    console.log('Name:     ', `${admin.firstName} ${admin.lastName}`);
    console.log('Email:    ', admin.email);
    console.log('Role:     ', admin.role);
    console.log('Created:  ', admin.createdAt);
    console.log('========================================\n');
    console.log('🚀 You can now login to MainFrame at http://localhost:5174\n');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();
