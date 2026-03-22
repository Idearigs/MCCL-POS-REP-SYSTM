import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuthOrInternalKey } from '../middleware/auth';

const router = Router();

// GET /mainframe/tenant-features/:subdomain
// Returns { features: string[] } — list of enabled featureKeys for a tenant.
// Called by the POS backend (internal key) and mainframe admin (JWT).
router.get('/:subdomain', requireAuthOrInternalKey, async (req, res) => {
  try {
    const subdomain = req.params.subdomain.toLowerCase();

    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { subdomain },
      select: { id: true, status: true },
    });

    if (!profile) return res.status(404).json({ message: 'Tenant not found' });

    // Suspended/pending tenants get no features — POS will show access-denied
    if (profile.status !== 'ACTIVE') {
      return res.json({ features: [], status: profile.status });
    }

    const customerFeatures = await prisma.mf_customer_features.findMany({
      where: { customerProfileId: profile.id, isEnabled: true },
      include: { feature: { select: { featureKey: true } } },
    });

    return res.json({
      features: customerFeatures.map(cf => cf.feature.featureKey),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
