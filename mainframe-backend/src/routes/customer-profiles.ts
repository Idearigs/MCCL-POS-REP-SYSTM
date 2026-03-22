import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

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

    const created = await prisma.mf_customer_profiles.findUnique({
      where: { id: profile.id },
      include: profileInclude,
    });
    return res.status(201).json(formatProfile(created));
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
    const { status } = req.body;
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

    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/customer-profiles/:id/features
router.get('/:id/features', requireAuth, async (req, res) => {
  try {
    const features = await prisma.mf_customer_features.findMany({
      where: { customerProfileId: req.params.id },
      include: { feature: true },
    });
    return res.json(features);
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
