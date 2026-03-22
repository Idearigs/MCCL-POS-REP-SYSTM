import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /mainframe/bug-reports/stats
router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const [total, open, inProgress, resolved, critical, high] = await Promise.all([
      prisma.mf_bug_reports.count(),
      prisma.mf_bug_reports.count({ where: { status: 'OPEN' } }),
      prisma.mf_bug_reports.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.mf_bug_reports.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.mf_bug_reports.count({ where: { priority: 'CRITICAL' } }),
      prisma.mf_bug_reports.count({ where: { priority: 'HIGH' } }),
    ]);

    const byFeature = await prisma.mf_bug_reports.groupBy({
      by: ['featureKey'],
      _count: true,
      where: { featureKey: { not: null } },
    });

    return res.json({ total, open, inProgress, resolved, critical, high, byFeature });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/bug-reports
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, priority, featureKey, customerProfileId, page = '1', limit = '20' } = req.query as any;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (featureKey) where.featureKey = featureKey;
    if (customerProfileId) where.customerProfileId = customerProfileId;

    const [bugs, total] = await Promise.all([
      prisma.mf_bug_reports.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: [{ priority: 'asc' }, { reportedAt: 'desc' }],
        include: { customerProfile: { select: { businessName: true, subdomain: true } } },
      }),
      prisma.mf_bug_reports.count({ where }),
    ]);

    return res.json({ data: bugs, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/bug-reports/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const bug = await prisma.mf_bug_reports.findUnique({
      where: { id: req.params.id },
      include: { customerProfile: { select: { businessName: true, subdomain: true, contactEmail: true } } },
    });
    if (!bug) return res.status(404).json({ message: 'Bug report not found' });
    return res.json(bug);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/bug-reports
router.post('/', requireAuth, async (req, res) => {
  try {
    const bug = await prisma.mf_bug_reports.create({
      data: {
        ...req.body,
        priority: (req.body.priority || 'MEDIUM') as any,
        status: 'OPEN',
        screenshots: req.body.screenshots || [],
      },
      include: { customerProfile: { select: { businessName: true, subdomain: true } } },
    });
    return res.status(201).json(bug);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/bug-reports/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { status, priority, assignedTo, resolution, fixedInVersion } = req.body;
    const updated = await prisma.mf_bug_reports.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        priority: priority as any,
        assignedTo,
        resolution,
        fixedInVersion,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/bug-reports/:id/status (alias for PUT /:id)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const updated = await prisma.mf_bug_reports.update({
      where: { id: req.params.id },
      data: {
        status: status as any,
        resolution,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
