import { Router } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /mainframe/roadmap
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, featureKey } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (featureKey) where.featureKey = featureKey;

    const items = await prisma.mf_roadmap_items.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/roadmap/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await prisma.mf_roadmap_items.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Roadmap item not found' });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/roadmap
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, featureKey, status, priority, assignedTo, targetVersion, dueDate } = req.body;
    const item = await prisma.mf_roadmap_items.create({
      data: {
        id:            randomUUID(),
        title,
        description,
        featureKey,
        status:        status        || 'BACKLOG',
        priority:      priority      || 'MEDIUM',
        assignedTo,
        targetVersion,
        dueDate:       dueDate ? new Date(dueDate) : undefined,
      },
    });
    return res.status(201).json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/roadmap/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, featureKey, status, priority, assignedTo, targetVersion, dueDate } = req.body;
    const item = await prisma.mf_roadmap_items.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        featureKey,
        status,
        priority,
        assignedTo,
        targetVersion,
        dueDate:     dueDate ? new Date(dueDate) : null,
        completedAt: status === 'SHIPPED' ? new Date() : null,
        updatedAt:   new Date(),
      },
    });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /mainframe/roadmap/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.mf_roadmap_items.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
