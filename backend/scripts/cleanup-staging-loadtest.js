/* eslint-disable */
/**
 * Removes everything the load-test seeder created (SEEDTEST- tagged rows).
 * Deletes in FK-safe order. STAGING only.
 *
 * Usage:
 *   SEED_CONFIRM=yes TENANT=behoney node scripts/cleanup-staging-loadtest.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TENANT_KEY = process.env.TENANT || 'behoney';

async function main() {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error('Refusing to run: set SEED_CONFIRM=yes to proceed.');
    process.exit(1);
  }
  const tenant = await prisma.tenants.findFirst({
    where: { OR: [{ id: TENANT_KEY }, { subdomain: TENANT_KEY }] },
  });
  if (!tenant) {
    console.error(`Tenant "${TENANT_KEY}" not found.`);
    process.exit(1);
  }
  const tenantId = tenant.id;

  const sales = await prisma.sales.deleteMany({
    where: { tenantId, saleNumber: { startsWith: 'SEEDTEST-' } },
  });
  const repairs = await prisma.repairs.deleteMany({
    where: { tenantId, repairNumber: { startsWith: 'SEEDTEST-' } },
  });
  const customers = await prisma.customers.deleteMany({
    where: { tenantId, notes: 'SEEDTEST' },
  });
  const products = await prisma.products.deleteMany({
    where: { tenantId, sku: { startsWith: 'SEEDTEST-' } },
  });

  console.log(
    `Removed → sales:${sales.count} repairs:${repairs.count} customers:${customers.count} products:${products.count}`,
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
