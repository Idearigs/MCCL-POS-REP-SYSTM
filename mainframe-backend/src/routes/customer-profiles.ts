import { Router } from 'express';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

function generateTempPassword(): string {
  // e.g. "Td#Ab12xY9" - readable but random
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = 'Td#';
  for (let i = 0; i < 7; i++) {
    pw += chars[crypto.randomInt(chars.length)];
  }
  return pw;
}

// Map mainframe profile statuses → POS tenant statuses
const MF_TO_POS_STATUS: Record<string, string> = {
  ACTIVE:         'ACTIVE',
  SUSPENDED:      'SUSPENDED',
  DEACTIVATED:    'SUSPENDED',
  MAINTENANCE:    'INACTIVE',
  PENDING_SETUP:  'INACTIVE',
};

/**
 * Sync a tenant's status from the mainframe profile to the POS tenants table.
 * Called whenever the mainframe updates a customer profile's status.
 * Non-fatal — logs errors but never throws, so the mainframe update always succeeds.
 */
async function syncStatusToPOS(subdomain: string, mfStatus: string, opts?: { suspendedReason?: string }): Promise<void> {
  const posBackendUrl = process.env.POS_BACKEND_URL || 'http://localhost:3002/api/v1';
  const internalKey   = process.env.INTERNAL_API_KEY || '';
  const posStatus     = MF_TO_POS_STATUS[mfStatus] ?? 'INACTIVE';

  const body = JSON.stringify({
    subdomain,
    status: posStatus,
    suspendedReason: posStatus === 'SUSPENDED' ? (opts?.suspendedReason || 'MANUAL') : undefined,
  });

  return new Promise((resolve) => {
    const url = new URL(`${posBackendUrl}/auth/tenant-status`);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-internal-key': internalKey,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Mainframe] POS tenant status synced: ${subdomain} → ${posStatus}`);
          } else {
            console.error(`[Mainframe] POS status sync failed: ${res.statusCode} ${raw}`);
          }
          resolve();
        });
      },
    );
    req.on('error', (err) => {
      console.error(`[Mainframe] POS status sync error for ${subdomain}:`, err.message);
      resolve(); // non-fatal
    });
    req.write(body);
    req.end();
  });
}

/**
 * Call the POS backend to provision a new tenant + owner user.
 * Called after creating an mf_customer_profile.
 */
async function provisionPosTenant(data: {
  tenantId: string;
  businessName: string;
  subdomain: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
}): Promise<void> {
  const posBackendUrl = process.env.POS_BACKEND_URL || 'http://localhost:3002/api/v1';
  const internalKey = process.env.INTERNAL_API_KEY || '';

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(`${posBackendUrl}/auth/provision-tenant`);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-internal-key': internalKey,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`POS provisioning failed: ${res.statusCode} ${raw}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const router = Router();

function formatProfile(profile: any) {
  return {
    id: profile.id,
    businessName: profile.businessName,
    businessEmail: profile.businessEmail,
    businessPhone: profile.businessPhone,
    businessAddress: profile.businessAddress,
    city: profile.city,
    country: profile.country,
    postalCode: profile.postalCode,
    subdomain: profile.subdomain,
    customDomain: profile.customDomain,
    fullDomain: `${profile.subdomain}.truedesk.co.uk`,
    databaseName: profile.databaseName,
    status: profile.status,
    setupCompletedAt: profile.setupCompletedAt,
    logoUrl: profile.logoUrl,
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    contact: {
      firstName: profile.contactFirstName,
      lastName: profile.contactLastName,
      email: profile.contactEmail,
      phone: profile.contactPhone,
    },
    subscription: profile.subscription
      ? {
          id: profile.subscription.id,
          plan: profile.subscription.plan,
          billingCycle: profile.subscription.billingCycle,
          basePrice: profile.subscription.basePrice,
          perUserPrice: profile.subscription.perUserPrice,
          includedUsers: profile.subscription.includedUsers,
          maxUsers: profile.subscription.maxUsers,
          currentUsers: profile.subscription.currentUsers,
          isOnTrial: profile.subscription.isOnTrial,
          trialEndsAt: profile.subscription.trialEndsAt,
          nextBillingDate: profile.subscription.nextBillingDate,
          isActive: profile.subscription.isActive,
        }
      : null,
    enabledFeatures:
      profile.enabledFeatures?.map((cf: any) => ({
        featureKey: cf.feature.featureKey,
        featureName: cf.feature.featureName,
        isEnabled: cf.isEnabled,
        version: cf.version || cf.feature.currentVersion,
      })) || [],
    users: profile.customerUsers || [],
    stats: profile._count
      ? {
          userCount: profile._count.customerUsers,
          bugReportCount: profile._count.bugReports,
          featureRequestCount: profile._count.featureRequests,
        }
      : null,
    internalNotes: profile.internalNotes,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function getPlanConfig(plan: string) {
  const configs: Record<string, any> = {
    STARTER: { basePrice: 29, perUserPrice: 10, includedUsers: 1, maxUsers: 3 },
    PROFESSIONAL: { basePrice: 79, perUserPrice: 8, includedUsers: 5, maxUsers: 15 },
    BUSINESS: { basePrice: 199, perUserPrice: 6, includedUsers: 15, maxUsers: 50 },
    ENTERPRISE: { basePrice: 499, perUserPrice: 5, includedUsers: 50, maxUsers: null },
    CUSTOM: { basePrice: 0, perUserPrice: 0, includedUsers: 1, maxUsers: null },
  };
  return configs[plan] || configs.STARTER;
}

function calcNextBillingDate(cycle: string): Date {
  const now = new Date();
  if (cycle === 'QUARTERLY') return new Date(now.setMonth(now.getMonth() + 3));
  if (cycle === 'YEARLY') return new Date(now.setFullYear(now.getFullYear() + 1));
  return new Date(now.setMonth(now.getMonth() + 1));
}

const profileInclude = {
  subscription: true,
  enabledFeatures: { include: { feature: true } },
  customerUsers: {
    select: {
      id: true, firstName: true, lastName: true, email: true,
      role: true, isActive: true, lastLoginAt: true, createdAt: true,
    },
  },
  _count: { select: { customerUsers: true, bugReports: true, featureRequests: true } },
};

// GET /mainframe/customer-profiles/stats
router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const [total, active, pending, suspended, totalUsers, recent] = await Promise.all([
      prisma.mf_customer_profiles.count(),
      prisma.mf_customer_profiles.count({ where: { status: 'ACTIVE' } }),
      prisma.mf_customer_profiles.count({ where: { status: 'PENDING_SETUP' } }),
      prisma.mf_customer_profiles.count({ where: { status: 'SUSPENDED' } }),
      prisma.mf_customer_users.count(),
      prisma.mf_customer_profiles.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, businessName: true, subdomain: true, status: true, createdAt: true },
      }),
    ]);
    return res.json({ totalProfiles: total, activeProfiles: active, pendingProfiles: pending, suspendedProfiles: suspended, totalUsers, recentProfiles: recent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/check-subdomain/:subdomain
router.get('/check-subdomain/:subdomain', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.mf_customer_profiles.findUnique({
      where: { subdomain: req.params.subdomain.toLowerCase() },
    });
    return res.json({ available: !existing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/suggest-subdomain
router.get('/suggest-subdomain', requireAuth, async (req, res) => {
  try {
    const { businessName } = req.query as { businessName: string };
    const base = (businessName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);

    const suggestions: string[] = [];
    for (const candidate of [base, `${base}-pos`, `${base}1`, `${base}-shop`]) {
      if (!candidate) continue;
      const taken = await prisma.mf_customer_profiles.findUnique({
        where: { subdomain: candidate },
      });
      if (!taken) suggestions.push(candidate);
      if (suggestions.length >= 3) break;
    }

    return res.json({ suggestions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
        { contactFirstName: { contains: search, mode: 'insensitive' } },
        { contactLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [profiles, total] = await Promise.all([
      prisma.mf_customer_profiles.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: profileInclude,
      }),
      prisma.mf_customer_profiles.count({ where }),
    ]);

    return res.json({
      data: profiles.map(formatProfile),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { id: req.params.id },
      include: profileInclude,
    });
    if (!profile) return res.status(404).json({ message: 'Customer profile not found' });
    return res.json(formatProfile(profile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/customer-profiles
router.post('/', requireAuth, async (req, res) => {
  try {
    const dto = req.body;
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(dto.subdomain?.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid subdomain format' });
    }

    const [existingSub, existingEmail] = await Promise.all([
      prisma.mf_customer_profiles.findUnique({ where: { subdomain: dto.subdomain.toLowerCase() } }),
      prisma.mf_customer_profiles.findUnique({ where: { businessEmail: dto.businessEmail?.toLowerCase() } }),
    ]);

    if (existingSub) return res.status(409).json({ message: 'Subdomain is already taken' });
    if (existingEmail) return res.status(409).json({ message: 'Business email already registered' });

    const databaseName = `truedesk_${dto.subdomain.toLowerCase().replace(/-/g, '_')}`;

    const profile = await prisma.mf_customer_profiles.create({
      data: {
        businessName: dto.businessName,
        businessEmail: dto.businessEmail.toLowerCase(),
        businessPhone: dto.businessPhone,
        businessAddress: dto.businessAddress,
        city: dto.city,
        country: dto.country,
        postalCode: dto.postalCode,
        subdomain: dto.subdomain.toLowerCase(),
        customDomain: dto.customDomain,
        databaseName,
        contactFirstName: dto.contactFirstName,
        contactLastName: dto.contactLastName,
        contactEmail: dto.contactEmail.toLowerCase(),
        contactPhone: dto.contactPhone,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor || '#3B82F6',
        secondaryColor: dto.secondaryColor || '#6366F1',
        internalNotes: dto.internalNotes,
        status: 'PENDING_SETUP',
      },
    });

    const plan = dto.plan || 'STARTER';
    const billingCycle = dto.billingCycle || 'MONTHLY';
    const planConfig = getPlanConfig(plan);
    const nextBillingDate = calcNextBillingDate(billingCycle);

    await prisma.mf_subscriptions.create({
      data: {
        customerProfileId: profile.id,
        plan: plan as any,
        billingCycle: billingCycle as any,
        basePrice: planConfig.basePrice,
        perUserPrice: planConfig.perUserPrice,
        includedUsers: planConfig.includedUsers,
        maxUsers: planConfig.maxUsers,
        currentUsers: 1,
        currentPeriodEnd: nextBillingDate,
        nextBillingDate,
      },
    });

    // Enable base features
    const baseFeatures = await prisma.mf_features.findMany({
      where: { isIncludedInBase: true, isEnabled: true },
    });
    for (const feature of baseFeatures) {
      await prisma.mf_customer_features.create({
        data: { customerProfileId: profile.id, featureId: feature.id, isEnabled: true },
      });
    }

    await prisma.mf_activity_logs.create({
      data: { customerProfileId: profile.id, action: 'profile.created', description: 'Customer profile created', actorType: 'admin' },
    });

    // If this is an existing client whose POS is already set up, skip provisioning
    // and mark them ACTIVE immediately.
    const isExistingClient = !!dto.isExistingClient;
    const ownerPassword = dto.ownerPassword || generateTempPassword();
    let posProvisioning: { status: string; ownerEmail?: string; ownerPassword?: string; companyCode?: string; error?: string };

    if (isExistingClient) {
      await prisma.mf_customer_profiles.update({
        where: { id: profile.id },
        data: { status: 'ACTIVE' },
      });
      await prisma.mf_activity_logs.create({
        data: {
          customerProfileId: profile.id,
          action: 'profile.activated',
          description: 'Existing client profile created — POS provisioning skipped',
          actorType: 'admin',
        },
      });
      posProvisioning = { status: 'existing', companyCode: dto.subdomain.toLowerCase() };
    } else {
      // Provision the POS tenant so the customer gets their own empty POS system
      try {
        await provisionPosTenant({
          tenantId: dto.subdomain.toLowerCase(),
          businessName: dto.businessName,
          subdomain: dto.subdomain.toLowerCase(),
          ownerEmail: dto.contactEmail.toLowerCase(),
          ownerFirstName: dto.contactFirstName,
          ownerLastName: dto.contactLastName,
          ownerPassword,
        });

        await prisma.mf_customer_profiles.update({
          where: { id: profile.id },
          data: { status: 'ACTIVE' },
        });
        await prisma.mf_activity_logs.create({
          data: {
            customerProfileId: profile.id,
            action: 'profile.activated',
            description: 'Tenant automatically activated after successful POS provisioning',
            actorType: 'system',
          },
        });
        posProvisioning = { status: 'success', ownerEmail: dto.contactEmail, ownerPassword, companyCode: dto.subdomain.toLowerCase() };
      } catch (err: any) {
        console.error('POS provisioning failed (non-fatal):', err.message);
        posProvisioning = { status: 'failed', error: err.message };
      }
    }

    const created = await prisma.mf_customer_profiles.findUnique({
      where: { id: profile.id },
      include: profileInclude,
    });

    return res.status(201).json({
      ...formatProfile(created),
      posProvisioning,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/customer-profiles/:id/reprovision
// Re-runs POS provisioning for a tenant whose initial provisioning failed.
// Generates a fresh temp password and returns the credentials on success.
router.post('/:id/reprovision', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { id: req.params.id },
    });
    if (!profile) return res.status(404).json({ message: 'Customer profile not found' });

    const ownerPassword = generateTempPassword();

    try {
      await provisionPosTenant({
        tenantId: profile.subdomain,
        businessName: profile.businessName,
        subdomain: profile.subdomain,
        ownerEmail: profile.contactEmail,
        ownerFirstName: profile.contactFirstName,
        ownerLastName: profile.contactLastName,
        ownerPassword,
      });

      await prisma.mf_customer_profiles.update({
        where: { id: profile.id },
        data: { status: 'ACTIVE' },
      });

      await prisma.mf_activity_logs.create({
        data: {
          customerProfileId: profile.id,
          action: 'profile.reprovisioned',
          description: 'Tenant re-provisioned in POS backend successfully',
          actorType: 'admin',
        },
      });

      return res.json({
        success: true,
        ownerEmail: profile.contactEmail,
        ownerPassword,
        companyCode: profile.subdomain,
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: err.message,
        hint: 'Check POS_BACKEND_URL and INTERNAL_API_KEY environment variables on the mainframe-backend server',
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /mainframe/customer-profiles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { id: req.params.id },
    });
    if (!profile) return res.status(404).json({ message: 'Customer profile not found' });

    // Cascade delete related records first (activity logs, features, subscriptions)
    await prisma.mf_activity_logs.deleteMany({ where: { customerProfileId: req.params.id } });
    await prisma.mf_customer_features.deleteMany({ where: { customerProfileId: req.params.id } });
    await prisma.mf_subscriptions.deleteMany({ where: { customerProfileId: req.params.id } });
    await prisma.mf_customer_profiles.delete({ where: { id: req.params.id } });

    return res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/customer-profiles/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const dto = req.body;
    const updated = await prisma.mf_customer_profiles.update({
      where: { id: req.params.id },
      data: {
        ...dto,
        businessEmail: dto.businessEmail?.toLowerCase(),
        contactEmail: dto.contactEmail?.toLowerCase(),
      },
      include: profileInclude,
    });

    await prisma.mf_activity_logs.create({
      data: { customerProfileId: req.params.id, action: 'profile.updated', description: 'Profile updated', actorType: 'admin' },
    });

    return res.json(formatProfile(updated));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/customer-profiles/:id/status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, suspendedReason } = req.body;
    const profile = await prisma.mf_customer_profiles.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        setupCompletedAt: status === 'ACTIVE' ? new Date() : undefined,
      },
    });

    await prisma.mf_activity_logs.create({
      data: { customerProfileId: req.params.id, action: 'profile.status_changed', description: `Status changed to ${status}`, actorType: 'admin' },
    });

    // Sync to POS tenants table so the JWT guard immediately enforces the new status
    syncStatusToPOS(profile.subdomain, status, { suspendedReason }).catch(() => {});

    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/:id/features
// Returns ALL mf_features merged with this tenant's enabled/disabled state.
router.get('/:id/features', requireAuth, async (req, res) => {
  try {
    const [allFeatures, customerFeatures] = await Promise.all([
      prisma.mf_features.findMany({
        where: { status: { not: 'DEPRECATED' as any } },
        orderBy: [{ category: 'asc' }, { featureName: 'asc' }],
      }),
      prisma.mf_customer_features.findMany({
        where: { customerProfileId: req.params.id },
      }),
    ]);

    const cfMap = new Map(customerFeatures.map(cf => [cf.featureId, cf]));

    return res.json(allFeatures.map(f => ({
      featureId:        f.id,
      featureKey:       f.featureKey,
      featureName:      f.featureName,
      category:         f.category,
      description:      f.description,
      isIncludedInBase: f.isIncludedInBase,
      additionalCost:   f.additionalCost,
      status:           f.status,
      customerFeatureId: cfMap.get(f.id)?.id ?? null,
      isEnabled:         cfMap.get(f.id)?.isEnabled ?? false,
      config:            cfMap.get(f.id)?.config ?? null,
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/customer-profiles/:id/features/batch
router.put('/:id/features/batch', requireAuth, async (req, res) => {
  try {
    const { features } = req.body as { features: { featureId: string; isEnabled: boolean }[] };
    if (!Array.isArray(features)) return res.status(400).json({ message: 'features must be an array' });

    const results = await Promise.all(
      features.map(({ featureId, isEnabled }) =>
        prisma.mf_customer_features.upsert({
          where: { customerProfileId_featureId: { customerProfileId: req.params.id, featureId } },
          update: { isEnabled, disabledAt: isEnabled ? null : new Date() },
          create: { customerProfileId: req.params.id, featureId, isEnabled },
        }),
      ),
    );

    await prisma.mf_activity_logs.create({
      data: {
        customerProfileId: req.params.id,
        action: 'features.batch_updated',
        description: `${features.filter(f => f.isEnabled).length} features enabled, ${features.filter(f => !f.isEnabled).length} disabled`,
        actorType: 'admin',
      },
    });

    return res.json({ updated: results.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/customer-profiles/:id/features/:featureId
router.put('/:id/features/:featureId', requireAuth, async (req, res) => {
  try {
    const { isEnabled, customConfig } = req.body;
    const existing = await prisma.mf_customer_features.findFirst({
      where: { customerProfileId: req.params.id, featureId: req.params.featureId },
    });

    if (existing) {
      const updated = await prisma.mf_customer_features.update({
        where: { id: existing.id },
        data: { isEnabled, config: customConfig, disabledAt: isEnabled ? null : new Date() },
      });
      return res.json(updated);
    }

    const created = await prisma.mf_customer_features.create({
      data: { customerProfileId: req.params.id, featureId: req.params.featureId, isEnabled, config: customConfig },
    });
    return res.json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/:id/activity
router.get('/:id/activity', requireAuth, async (req, res) => {
  try {
    const logs = await prisma.mf_activity_logs.findMany({
      where: { customerProfileId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
