import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuthOrInternalKey } from '../middleware/auth';

const router = Router();

// Canonical tier definitions — single source of truth for the mainframe
const CORE_FEATURES = ['pos', 'inventory', 'customers', 'sales', 'repairs', 'cashiers'];

const STANDARD_FEATURES = ['shifts', 'float_management', 'petty_cash', 'stock_taking', 'calendar', 'tasks', 'history'];

const PREMIUM_FEATURES = ['financial_intelligence', 'chatbot', 'google_drive'];

// Features unlocked per plan (cumulative)
const PLAN_FEATURES: Record<string, string[]> = {
  STARTER:      [],
  PROFESSIONAL: [...STANDARD_FEATURES],
  BUSINESS:     [...STANDARD_FEATURES, ...PREMIUM_FEATURES],
  ENTERPRISE:   [...STANDARD_FEATURES, ...PREMIUM_FEATURES],
  CUSTOM:       [], // Fully controlled by mf_customer_features overrides
};

// GET /mainframe/tenant-features/:subdomain
router.get('/:subdomain', requireAuthOrInternalKey, async (req, res) => {
  try {
    const subdomain = req.params.subdomain.toLowerCase();

    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { subdomain },
      include: { subscription: { select: { plan: true } } },
    });

    if (!profile) return res.status(404).json({ message: 'Tenant not found' });

    if (profile.status !== 'ACTIVE') {
      // Suspended/pending tenants only get core features
      return res.json({ features: CORE_FEATURES, tier: 'suspended' });
    }

    // Start with core features (always enabled)
    const featureSet = new Set<string>(CORE_FEATURES);

    // Add plan-based features
    const plan = (profile.subscription?.plan as string) || 'STARTER';
    const planFeatures = PLAN_FEATURES[plan] || [];
    planFeatures.forEach(f => featureSet.add(f));

    // Apply custom overrides from mf_customer_features
    // These can ADD features not in the plan, or REMOVE non-core Standard/Premium features
    const customOverrides = await prisma.mf_customer_features.findMany({
      where: { customerProfileId: profile.id },
      include: { feature: { select: { featureKey: true } } },
    });

    for (const cf of customOverrides) {
      const key = cf.feature.featureKey;
      if (cf.isEnabled) {
        featureSet.add(key); // Custom add (e.g. upgrade a STARTER to have shifts)
      } else if (!CORE_FEATURES.includes(key)) {
        featureSet.delete(key); // Custom remove (cannot remove core features)
      }
    }

    return res.json({
      features: Array.from(featureSet),
      plan,
      tier: plan.toLowerCase(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
