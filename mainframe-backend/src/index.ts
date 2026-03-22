import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import prisma from './lib/prisma';

import adminsRouter from './routes/admins';
import customerProfilesRouter from './routes/customer-profiles';
import customerUsersRouter from './routes/customer-users';
import subscriptionsRouter from './routes/subscriptions';
import featuresRouter from './routes/features';
import bugReportsRouter from './routes/bug-reports';
import featureRequestsRouter from './routes/feature-requests';
import subdomainRouter from './routes/subdomain';
import credentialsRouter from './routes/credentials';
import tenantFeaturesRouter from './routes/tenant-features';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// CORS — allow mainframe-admin frontend origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5174,http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Health check (no auth)
app.get('/health', async (_req, res) => {
  const adminCount = await prisma.mf_admins.count().catch(() => -1);
  res.json({ status: 'ok', service: 'mainframe-backend', timestamp: new Date().toISOString(), adminCount });
});

// One-time setup — creates default admin if none exist.
// Protected by SETUP_TOKEN env var. Remove or unset the env var after first use.
app.post('/setup', async (req, res) => {
  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken) {
    return res.status(404).json({ message: 'Not found' });
  }
  if (req.headers['x-setup-token'] !== setupToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const SALT = process.env.PASSWORD_SALT || 'truedesk-mainframe-salt';
  const EMAIL = 'admin@truedesk.co.uk';
  const PASSWORD = 'TrueDesk@2026';
  const passwordHash = crypto.createHash('sha256').update(PASSWORD + SALT).digest('hex');

  await prisma.mf_admins.upsert({
    where: { email: EMAIL },
    update: { passwordHash, isActive: true },
    create: { firstName: 'Super', lastName: 'Admin', email: EMAIL, passwordHash, role: 'superadmin' },
  });

  return res.json({ message: 'Admin created/reset', email: EMAIL, password: PASSWORD });
});

// API routes under /api/v1/mainframe/...
const api = express.Router();
api.use('/mainframe/admins', adminsRouter);
api.use('/mainframe/customer-profiles', customerProfilesRouter);
api.use('/mainframe/customer-users', customerUsersRouter);
api.use('/mainframe/subscriptions', subscriptionsRouter);
api.use('/mainframe/features', featuresRouter);
api.use('/mainframe/bug-reports', bugReportsRouter);
api.use('/mainframe/feature-requests', featureRequestsRouter);
api.use('/mainframe/subdomain', subdomainRouter);
api.use('/mainframe/credentials', credentialsRouter);
api.use('/mainframe/tenant-features', tenantFeaturesRouter);

app.use('/api/v1', api);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function seedAdmin() {
  const SALT = process.env.PASSWORD_SALT || 'truedesk-mainframe-salt';
  const EMAIL = 'admin@truedesk.co.uk';
  const PASSWORD = 'TrueDesk@2026';
  const passwordHash = crypto.createHash('sha256').update(PASSWORD + SALT).digest('hex');

  try {
    const count = await prisma.mf_admins.count();
    if (count === 0) {
      await prisma.mf_admins.create({
        data: {
          firstName: 'Super',
          lastName: 'Admin',
          email: EMAIL,
          passwordHash,
          role: 'superadmin',
        },
      });
      console.log(`✅ Default admin seeded: ${EMAIL}`);
    }
  } catch (err) {
    console.error('⚠️  Admin seed failed (non-fatal):', err);
  }
}

async function seedFeatures() {
  const features = [
    // Core features
    { featureKey: 'pos', featureName: 'Point of Sale', description: 'Main POS terminal for sales and transactions', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    { featureKey: 'inventory', featureName: 'Inventory Management', description: 'Product and stock management', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    { featureKey: 'customers', featureName: 'Customer Management', description: 'Customer database and history', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    { featureKey: 'sales', featureName: 'Sales & Transactions', description: 'Sales processing and reporting', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    { featureKey: 'repairs', featureName: 'Repair Management', description: 'Repair job tracking and management', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    { featureKey: 'cashiers', featureName: 'Staff & Cashiers', description: 'Staff and cashier management', category: 'Core', isIncludedInBase: true, additionalCost: 0 },
    // Standard features
    { featureKey: 'shifts', featureName: 'Shift Management', description: 'Staff shift tracking and handover', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'float_management', featureName: 'Float Management', description: 'Cash drawer float management', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'petty_cash', featureName: 'Petty Cash', description: 'Petty cash tracking and management', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'stock_taking', featureName: 'Stock Taking', description: 'Stock audit and reconciliation', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'calendar', featureName: 'Calendar', description: 'Appointments and scheduling', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'tasks', featureName: 'Tasks', description: 'Task and workflow management', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    { featureKey: 'history', featureName: 'Transaction History', description: 'Full transaction history and audit trail', category: 'Standard', isIncludedInBase: false, additionalCost: 0 },
    // Premium features
    { featureKey: 'financial_intelligence', featureName: 'Financial Intelligence', description: 'Advanced financial analytics and reporting', category: 'Premium', isIncludedInBase: false, additionalCost: 20 },
    { featureKey: 'chatbot', featureName: 'AI Business Insights', description: 'AI-powered business insights and recommendations', category: 'Premium', isIncludedInBase: false, additionalCost: 20 },
    { featureKey: 'google_drive', featureName: 'Google Drive Integration', description: 'Cloud storage and document management', category: 'Premium', isIncludedInBase: false, additionalCost: 20 },
  ];

  try {
    for (const f of features) {
      await prisma.mf_features.upsert({
        where: { featureKey: f.featureKey },
        update: {
          featureName: f.featureName,
          category: f.category,
          description: f.description,
          isIncludedInBase: f.isIncludedInBase,
          additionalCost: f.additionalCost,
        },
        create: {
          featureKey: f.featureKey,
          featureName: f.featureName,
          category: f.category,
          description: f.description,
          isIncludedInBase: f.isIncludedInBase,
          additionalCost: f.additionalCost,
          isEnabled: true,
          status: 'STABLE',
          currentVersion: '1.0.0',
          dependsOn: [],
        },
      });
    }
    console.log(`✅ ${features.length} features seeded/updated`);
  } catch (err) {
    console.error('⚠️  Feature seed failed (non-fatal):', err);
  }
}

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  await seedAdmin();
  await seedFeatures();

  app.listen(PORT, () => {
    console.log(`🚀 Mainframe Backend running on http://localhost:${PORT}`);
    console.log(`   API prefix: /api/v1/mainframe/...`);
  });
}

bootstrap();
