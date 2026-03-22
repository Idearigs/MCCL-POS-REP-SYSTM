import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /mainframe/subdomain/validate
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { subdomain, excludeProfileId } = req.body;
    const where: any = { subdomain: subdomain?.toLowerCase() };
    if (excludeProfileId) where.id = { not: excludeProfileId };

    const existing = await prisma.mf_customer_profiles.findFirst({ where });
    return res.json({ available: !existing, subdomain });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/subdomain/suggest
router.post('/suggest', requireAuth, async (req, res) => {
  try {
    const { businessName } = req.body;
    const base = (businessName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);

    const suggestions: string[] = [];
    for (const candidate of [base, `${base}-pos`, `${base}1`, `${base}-shop`, `${base}2`]) {
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

export default router;
