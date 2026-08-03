/* eslint-disable */
/**
 * STAGING load-test data seeder — DO NOT RUN AGAINST PRODUCTION.
 *
 * Bulk-inserts realistic volumes (products / customers / repairs / sales) for
 * one tenant so we can measure the UI under real scale (7k customers, 1k+
 * products, tons of repairs/sales). Everything it creates is tagged with a
 * "SEEDTEST-" prefix (sku / repairNumber / saleNumber) and a note, so the
 * companion cleanup script can remove it all in one shot.
 *
 * Safety:
 *  - Refuses to run unless SEED_CONFIRM=yes is set.
 *  - Refuses if DATABASE_URL looks like production (contains a prod host) unless
 *    SEED_ALLOW_PROD_URL=yes (don't).
 *
 * Usage (inside the STAGING backend container, or locally with the staging URL):
 *   SEED_CONFIRM=yes TENANT=behoney node scripts/seed-staging-loadtest.js
 * Optional counts: PRODUCTS=1000 CUSTOMERS=7000 REPAIRS=8000 SALES=10000
 */
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const N_PRODUCTS = parseInt(process.env.PRODUCTS || '1000', 10);
const N_CUSTOMERS = parseInt(process.env.CUSTOMERS || '7000', 10);
const N_REPAIRS = parseInt(process.env.REPAIRS || '8000', 10);
const N_SALES = parseInt(process.env.SALES || '10000', 10);
const TENANT_KEY = process.env.TENANT || 'behoney';
const CHUNK = 500;

const MATERIALS = ['GOLD', 'YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'SILVER', 'PLATINUM', 'DIAMOND'];
const PAY = ['CASH', 'CARD', 'BANK_TRANSFER'];
const REPAIR_STATUS = ['RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'READY_FOR_COLLECTION', 'COLLECTED'];
const FIRST = ['James', 'Sarah', 'Georgia', 'Richard', 'Emma', 'Oliver', 'Sophie', 'Harry', 'Grace', 'Jack', 'Ava', 'Leo'];
const LAST = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hughes'];
const ITEMS = ['9ct gold ring', 'silver necklace', 'diamond earrings', 'watch strap', 'gold chain', 'bracelet', 'pendant'];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const now = () => new Date();

async function chunkedCreate(model, rows, label) {
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await prisma[model].createMany({ data: slice, skipDuplicates: true });
    done += slice.length;
    process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error('Refusing to run: set SEED_CONFIRM=yes to proceed.');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL || '';
  const looksProd = /prod|buymejewellery|(?<!staging[-.])truedesk/i.test(url) && !/staging/i.test(url);
  if (looksProd && process.env.SEED_ALLOW_PROD_URL !== 'yes') {
    console.error('Refusing: DATABASE_URL looks like PRODUCTION. Aborting for safety.');
    process.exit(1);
  }

  const tenant = await prisma.tenants.findFirst({
    where: { OR: [{ id: TENANT_KEY }, { subdomain: TENANT_KEY }] },
  });
  if (!tenant) {
    console.error(`Tenant "${TENANT_KEY}" not found. Set TENANT=<id|subdomain>.`);
    process.exit(1);
  }
  const user = await prisma.users.findFirst({ where: { tenantId: tenant.id } });
  if (!user) {
    console.error(`No user found for tenant ${tenant.id} (needed for createdBy).`);
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log(`Seeding tenant ${tenant.name || tenantId} (${tenantId}) as user ${user.id}`);
  console.log(`Targets → products:${N_PRODUCTS} customers:${N_CUSTOMERS} repairs:${N_REPAIRS} sales:${N_SALES}`);

  // ---- Products ----
  const products = Array.from({ length: N_PRODUCTS }, (_, i) => ({
    id: randomUUID(), tenantId, name: `${rnd(MATERIALS)} item ${i + 1}`,
    sku: `SEEDTEST-P-${i + 1}`, sellingPrice: 50 + Math.floor(Math.random() * 2000),
    costPrice: 20 + Math.floor(Math.random() * 1500), stockQuantity: 1 + Math.floor(Math.random() * 10),
    minStockLevel: 1, material: rnd(MATERIALS), isActive: true,
    description: 'SEEDTEST', updatedAt: now(),
  }));
  await chunkedCreate('products', products, 'products');
  const productIds = products.map((p) => p.id);

  // ---- Customers ----
  const customers = Array.from({ length: N_CUSTOMERS }, (_, i) => ({
    id: randomUUID(), tenantId, firstName: rnd(FIRST), lastName: rnd(LAST),
    email: `seedtest+${i + 1}@example.com`, phone: `07${String(100000000 + i).slice(0, 9)}`,
    totalSpent: Math.floor(Math.random() * 5000), visitCount: Math.floor(Math.random() * 40),
    loyaltyPoints: Math.floor(Math.random() * 500), notes: 'SEEDTEST',
    isActive: true, updatedAt: now(),
  }));
  await chunkedCreate('customers', customers, 'customers');
  const customerIds = customers.map((c) => c.id);

  // ---- Repairs ----
  const repairs = Array.from({ length: N_REPAIRS }, (_, i) => ({
    id: randomUUID(), tenantId, customerId: rnd(customerIds), createdBy: user.id,
    repairNumber: `SEEDTEST-R-${i + 1}`, itemDescription: rnd(ITEMS),
    issueDescription: 'SEEDTEST — needs work', estimatedCost: 10 + Math.floor(Math.random() * 300),
    status: rnd(REPAIR_STATUS), receivedDate: now(), updatedAt: now(),
  }));
  await chunkedCreate('repairs', repairs, 'repairs');

  // ---- Sales ----
  const sales = Array.from({ length: N_SALES }, (_, i) => {
    const subtotal = 20 + Math.floor(Math.random() * 3000);
    return {
      id: randomUUID(), tenantId, customerId: rnd(customerIds), createdBy: user.id,
      saleNumber: `SEEDTEST-S-${i + 1}`, receiptNumber: `SEEDTEST-RC-${i + 1}`,
      clientSaleId: `SEEDTEST-CL-${i + 1}`, subtotal, totalAmount: subtotal,
      paidAmount: subtotal, paymentMethod: rnd(PAY), status: 'COMPLETED', updatedAt: now(),
    };
  });
  await chunkedCreate('sales', sales, 'sales');

  console.log('\n✅ Seed complete. All rows tagged SEEDTEST- (run the cleanup script to remove).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
