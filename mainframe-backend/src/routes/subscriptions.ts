import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

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

// GET /mainframe/subscriptions/stats
router.get('/stats', requireAuth, async (_req, res) => {
  try {
    const [total, active, totalRevenue] = await Promise.all([
      prisma.mf_subscriptions.count(),
      prisma.mf_subscriptions.count({ where: { isActive: true } }),
      prisma.mf_subscriptions.aggregate({ _sum: { basePrice: true } }),
    ]);
    const byPlan = await prisma.mf_subscriptions.groupBy({
      by: ['plan'],
      _count: true,
    });
    return res.json({ total, active, totalRevenue: totalRevenue._sum.basePrice || 0, byPlan });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/subscriptions/profile/:profileId
router.get('/profile/:profileId', requireAuth, async (req, res) => {
  try {
    const subscription = await prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: req.params.profileId },
      include: {
        customerProfile: { select: { businessName: true, subdomain: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    return res.json(subscription);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /mainframe/subscriptions/profile/:profileId/plan
router.put('/profile/:profileId/plan', requireAuth, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const subscription = await prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: req.params.profileId },
    });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

    const planConfig = getPlanConfig(plan);
    const updated = await prisma.mf_subscriptions.update({
      where: { id: subscription.id },
      data: {
        plan: plan as any,
        billingCycle: (billingCycle as any) || subscription.billingCycle,
        basePrice: planConfig.basePrice,
        perUserPrice: planConfig.perUserPrice,
        includedUsers: planConfig.includedUsers,
        maxUsers: planConfig.maxUsers,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/subscriptions/profile/:profileId/cancel
router.post('/profile/:profileId/cancel', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const subscription = await prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: req.params.profileId },
    });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

    const updated = await prisma.mf_subscriptions.update({
      where: { id: subscription.id },
      data: { isActive: false, cancelledAt: new Date(), cancellationReason: reason },
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/subscriptions/profile/:profileId/generate-invoice
router.post('/profile/:profileId/generate-invoice', requireAuth, async (req, res) => {
  try {
    const subscription = await prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: req.params.profileId },
      include: { customerProfile: true },
    });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });

    const extraUsers = Math.max(0, subscription.currentUsers - subscription.includedUsers);
    const userCharges = extraUsers * Number(subscription.perUserPrice);
    const subtotal = Number(subscription.basePrice) + userCharges;
    const discount = subtotal * (Number(subscription.discountPercent || 0) / 100);
    const tax = (subtotal - discount) * 0.2;
    const total = subtotal - discount + tax;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoice = await prisma.mf_invoices.create({
      data: {
        customerProfileId: req.params.profileId,
        subscriptionId: subscription.id,
        invoiceNumber: `INV-${Date.now()}`,
        subtotal,
        discount,
        tax,
        total,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        dueDate,
        lineItems: [
          { description: `${subscription.plan} Plan`, amount: Number(subscription.basePrice) },
          ...(userCharges > 0 ? [{ description: `${extraUsers} extra users`, amount: userCharges }] : []),
        ],
      },
    });
    return res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /mainframe/subscriptions/profile/:profileId/invoices
router.get('/profile/:profileId/invoices', requireAuth, async (req, res) => {
  try {
    const invoices = await prisma.mf_invoices.findMany({
      where: { customerProfileId: req.params.profileId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(invoices);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/subscriptions/invoices/:invoiceId/mark-paid
router.post('/invoices/:invoiceId/mark-paid', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const invoice = await prisma.mf_invoices.update({
      where: { id: req.params.invoiceId },
      data: { status: 'paid', paidAt: new Date(), transactionId },
    });
    return res.json(invoice);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
