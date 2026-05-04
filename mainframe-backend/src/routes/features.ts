import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── Lifecycle promotion order ───────────────────────────────────────────────
const PROMOTE_MAP: Record<string, string> = {
  ALPHA: 'BETA',
  BETA:  'STABLE',
  STABLE:'DEPRECATED',
};

// GET /mainframe/features
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, status } = req.query as any;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const features = await prisma.mf_features.findMany({
      where,
      orderBy: [{ category: 'asc' }, { featureName: 'asc' }],
      include: {
        _count: { select: { customerFeatures: true, versions: true } },
      },
    });
    return res.json(features);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/features/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const feature = await prisma.mf_features.findUnique({
      where: { id: req.params.id },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!feature) return res.status(404).json({ message: 'Feature not found' });
    return res.json(feature);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/features — new features always start as ALPHA
router.post('/', requireAuth, async (req, res) => {
  try {
    const { featureKey, featureName, description, category, isIncludedInBase, additionalCost, dependsOn } = req.body;

    const existing = await prisma.mf_features.findUnique({ where: { featureKey } });
    if (existing) return res.status(409).json({ message: 'Feature key already exists' });

    const feature = await prisma.mf_features.create({
      data: {
        featureKey,
        featureName,
        description,
        category,
        isIncludedInBase: isIncludedInBase ?? true,
        additionalCost: additionalCost || 0,
        dependsOn: dependsOn || [],
        status: 'ALPHA',
        currentVersion: '0.1.0',
      },
    });
    return res.status(201).json(feature);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/features/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const feature = await prisma.mf_features.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(feature);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/features/:id/promote — ALPHA→BETA→STABLE→DEPRECATED
router.post('/:id/promote', requireAuth, async (req, res) => {
  try {
    const feature = await prisma.mf_features.findUnique({ where: { id: req.params.id } });
    if (!feature) return res.status(404).json({ message: 'Feature not found' });

    const next = PROMOTE_MAP[feature.status];
    if (!next) {
      return res.status(400).json({ message: `Cannot promote feature in ${feature.status} status` });
    }

    const updated = await prisma.mf_features.update({
      where: { id: req.params.id },
      data: {
        status: next as any,
        ...(next === 'STABLE' ? { isBeta: false } : {}),
        ...(next === 'BETA'   ? { isBeta: true  } : {}),
      },
    });

    // Record version snapshot
    await prisma.mf_feature_versions.create({
      data: {
        featureId:    req.params.id,
        version:      feature.currentVersion,
        versionType:  next as any,
        releaseNotes: `Promoted from ${feature.status} to ${next}`,
        deployedAt:   new Date(),
        deployedBy:   (req as any).admin?.id || 'system',
      },
    }).catch(() => {}); // non-fatal

    return res.json({ previous: feature.status, current: next, feature: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/features/:id/versions
router.post('/:id/versions', requireAuth, async (req, res) => {
  try {
    const { version, changelog, isStable } = req.body;
    const featureVersion = await prisma.mf_feature_versions.create({
      data: {
        featureId: req.params.id,
        version,
        versionType: isStable ? 'STABLE' : 'BETA',
        changelog,
      },
    });

    if (isStable) {
      await prisma.mf_features.update({
        where: { id: req.params.id },
        data: { currentVersion: version },
      });
    }

    return res.status(201).json(featureVersion);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/features/seed-defaults
router.post('/seed-defaults', requireAuth, async (_req, res) => {
  try {
    const defaults = [
      // ── Core ──────────────────────────────────────────────────────────
      { featureKey: 'dashboard',              featureName: 'Dashboard',              category: 'core',       isIncludedInBase: true  },
      { featureKey: 'pos',                    featureName: 'Point of Sale',          category: 'core',       isIncludedInBase: true  },
      { featureKey: 'sales',                  featureName: 'Sales',                  category: 'core',       isIncludedInBase: true  },
      { featureKey: 'inventory',              featureName: 'Inventory Management',   category: 'core',       isIncludedInBase: true  },
      { featureKey: 'customers',              featureName: 'Customer Management',    category: 'core',       isIncludedInBase: true  },
      { featureKey: 'repairs',                featureName: 'Repair Management',      category: 'core',       isIncludedInBase: true  },
      { featureKey: 'history',                featureName: 'History',                category: 'core',       isIncludedInBase: true  },
      // ── Operations ────────────────────────────────────────────────────
      { featureKey: 'shifts',                 featureName: 'Shifts',                 category: 'operations', isIncludedInBase: true  },
      { featureKey: 'cashiers',               featureName: 'Cashiers',               category: 'operations', isIncludedInBase: true  },
      { featureKey: 'stock_taking',           featureName: 'Stock Taking',           category: 'operations', isIncludedInBase: true  },
      // ── Finance ───────────────────────────────────────────────────────
      { featureKey: 'float_management',       featureName: 'Float Management',       category: 'finance',    isIncludedInBase: true  },
      { featureKey: 'petty_cash',             featureName: 'Petty Cash',             category: 'finance',    isIncludedInBase: true  },
      { featureKey: 'sales_reports',          featureName: 'Sales Reports',          category: 'reporting',  isIncludedInBase: true  },
      // ── Tools ─────────────────────────────────────────────────────────
      { featureKey: 'tasks',                  featureName: 'Tasks',                  category: 'tools',      isIncludedInBase: true  },
      { featureKey: 'calendar',               featureName: 'Calendar',               category: 'tools',      isIncludedInBase: true  },
      // ── Premium ───────────────────────────────────────────────────────
      { featureKey: 'financial_intelligence', featureName: 'Financial Intelligence', category: 'analytics',  isIncludedInBase: false },
      { featureKey: 'chatbot',                featureName: 'AI Chatbot',             category: 'ai',         isIncludedInBase: false },
      { featureKey: 'google_drive',           featureName: 'Google Drive',           category: 'integrations', isIncludedInBase: false },
      // ── HRMS ─────────────────────────────────────────────────────────
      { featureKey: 'hrms',                   featureName: 'HR Management',          category: 'hr',         isIncludedInBase: false },
    ];

    const results = [];
    for (const d of defaults) {
      const upserted = await prisma.mf_features.upsert({
        where: { featureKey: d.featureKey },
        update: { featureName: d.featureName, category: d.category, isIncludedInBase: d.isIncludedInBase },
        create: { ...d, status: 'STABLE', currentVersion: '1.0.0' },
      });
      results.push(upserted);
    }

    return res.json({ seeded: results.length, total: defaults.length, features: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
