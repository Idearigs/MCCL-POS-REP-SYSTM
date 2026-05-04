import crypto from 'crypto';
import prisma from './lib/prisma';

const EMAIL = 'admin@truedesk.co.uk';
const PASSWORD = 'TrueDesk@2026';
const SALT = process.env.PASSWORD_SALT || 'truedesk-mainframe-salt';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

async function main() {
  const existing = await prisma.mf_admins.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`Admin already exists: ${EMAIL}`);
    return;
  }

  await prisma.mf_admins.create({
    data: {
      firstName: 'Super',
      lastName: 'Admin',
      email: EMAIL,
      passwordHash: hashPassword(PASSWORD),
      role: 'SYSTEM_ARCHITECT' as any,
    },
  });

  console.log('✅ Admin created');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
