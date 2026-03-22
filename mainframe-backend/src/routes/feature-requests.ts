import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAuthOrInternalKey } from '../middleware/auth';

const router = Router();

// GET /mainframe/feature-requests
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query as any;
    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.mf_feature_requests.findMany({
      where,
      orderBy: [{ votes: 'desc' }, { createdAt: 'desc' }],
      include: { customerProfile: { select: { businessName: true } } },
    });
    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/feature-requests/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await prisma.mf_feature_requests.findUnique({
      where: { id: req.params.id },
      include: { customerProfile: { select: { businessName: true } } },
    });
    if (!request) return res.status(404).json({ message: 'Feature request not found' });
    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/feature-requests (accepts mainframe JWT or internal API key from POS backend)
router.post('/', requireAuthOrInternalKey, async (req, res) => {
  try {
    const { title, description, customerProfileId } = req.body;
    const request = await prisma.mf_feature_requests.create({
      data: { title, description, customerProfileId, status: 'SUBMITTED' },
      include: { customerProfile: { select: { businessName: true } } },
    });
    return res.status(201).json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/feature-requests/:id/vote
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const request = await prisma.mf_feature_requests.update({
      where: { id: req.params.id },
      data: { votes: { increment: 1 } },
    });
    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/feature-requests/:id/status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, estimatedRelease } = req.body;
    const request = await prisma.mf_feature_requests.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        targetVersion: estimatedRelease,
        implementedAt: status === 'RELEASED' ? new Date() : undefined,
      },
    });
    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
