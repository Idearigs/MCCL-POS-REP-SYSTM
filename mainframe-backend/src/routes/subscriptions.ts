import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import nodemailer from 'nodemailer';

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

// POST /mainframe/subscriptions/send-offer
// Sends a branded subscription offer email to the tenant with a LemonSqueezy checkout link.
router.post('/send-offer', requireAuth, async (req, res) => {
  const {
    profileId,
    title,
    description,
    plan,
    checkoutUrl,
    features,           // [{ name, description, price, isCustom }]
    confirmModal,       // { title, message, buttonText, buttonLink }
  } = req.body;

  if (!profileId || !title || !checkoutUrl) {
    return res.status(400).json({ message: 'profileId, title and checkoutUrl are required' });
  }

  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { id: profileId },
      select: { businessName: true, businessEmail: true, contactFirstName: true },
    });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const planLabels: Record<string, string> = {
      STARTER: 'Starter',
      PROFESSIONAL: 'Professional',
      BUSINESS: 'Business',
      ENTERPRISE: 'Enterprise',
      CUSTOM: 'Custom',
    };
    const planLabel = planLabels[plan] || plan || 'Custom';

    const standardFeatures = (features || []).filter((f: any) => !f.isCustom);
    const customFeatures   = (features || []).filter((f: any) => f.isCustom);

    const featureRow = (name: string, desc: string, price?: number, highlight = false) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#22c55e;font-size:16px;">✓</span>
            <div>
              <div style="font-weight:${highlight ? '700' : '600'};color:${highlight ? '#7c3aed' : '#1a1a2e'};font-size:14px;">${name}</div>
              ${desc ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${desc}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
          <span style="font-size:13px;font-weight:600;color:${price ? '#7c3aed' : '#22c55e'};">
            ${price ? `+£${price}/mo` : 'Included'}
          </span>
        </td>
      </tr>`;

    const standardRows = standardFeatures.map((f: any) => featureRow(f.name, f.description || '', f.price)).join('');
    const customRows   = customFeatures.map((f: any) => featureRow(f.name, f.description || '', f.price, true)).join('');

    const confirmSection = confirmModal?.title ? `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-top:24px;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#374151;">After your purchase</h3>
        <p style="margin:0 0 12px;color:#6b7280;font-size:13px;">${confirmModal.message || ''}</p>
        ${confirmModal.buttonText ? `
          <a href="${confirmModal.buttonLink || checkoutUrl}"
             style="display:inline-block;background:#1a1a2e;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;text-decoration:none;font-weight:600;">
            ${confirmModal.buttonText}
          </a>` : ''}
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
            <div style="font-size:13px;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:12px;">TrueDesk POS</div>
            <h1 style="margin:0;font-size:28px;font-weight:700;color:#fff;line-height:1.3;">${title}</h1>
            ${plan ? `<div style="display:inline-block;margin-top:16px;background:rgba(124,58,237,0.3);border:1px solid rgba(124,58,237,0.6);border-radius:20px;padding:4px 16px;color:#c4b5fd;font-size:13px;font-weight:600;">${planLabel} Plan</div>` : ''}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 40px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi ${profile.contactFirstName || profile.businessName},</p>
            ${description ? `<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">${description}</p>` : ''}

            ${standardFeatures.length > 0 ? `
            <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a2e;">What's included</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              ${standardRows}
            </table>` : ''}

            ${customFeatures.length > 0 ? `
            <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#7c3aed;">Your Custom Features</h2>
            <p style="margin:0 0 12px;color:#6b7280;font-size:13px;">Features tailored specifically for ${profile.businessName}:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #ede9fe;border-radius:12px;overflow:hidden;margin-bottom:24px;">
              ${customRows}
            </table>` : ''}

            <!-- CTA -->
            <div style="text-align:center;margin:32px 0;">
              <a href="${checkoutUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;padding:16px 40px;border-radius:12px;font-size:17px;font-weight:700;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(124,58,237,0.4);">
                Subscribe Now →
              </a>
              <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">Secure payment powered by LemonSqueezy</p>
            </div>

            ${confirmSection}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This offer was sent by TrueDesk for ${profile.businessName}</p>
            <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} TrueDesk · All rights reserved</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"TrueDesk" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to:   profile.businessEmail,
      subject: title,
      html,
    });

    // Log the activity
    await prisma.mf_activity_logs.create({
      data: {
        customerProfileId: profileId,
        action: 'subscription.offer_sent',
        description: `Subscription offer email sent: "${title}" (${planLabel} plan)`,
        actorType: 'admin',
      },
    });

    return res.json({ sent: true, to: profile.businessEmail });
  } catch (err: any) {
    console.error('[send-offer]', err);
    return res.status(500).json({ message: err.message || 'Failed to send email' });
  }
});

export default router;
