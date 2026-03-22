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
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mainframe-backend', timestamp: new Date().toISOString() });
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

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  await seedAdmin();

  app.listen(PORT, () => {
    console.log(`🚀 Mainframe Backend running on http://localhost:${PORT}`);
    console.log(`   API prefix: /api/v1/mainframe/...`);
  });
}

bootstrap();
