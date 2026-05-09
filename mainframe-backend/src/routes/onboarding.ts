/**
 * Public onboarding routes — no auth required.
 * These are called by the client-facing onboarding form page.
 *
 * GET  /api/v1/mainframe/onboarding/:token      — fetch profile data for form pre-fill
 * POST /api/v1/mainframe/onboarding/:token/submit — submit form, provision POS
 */
import { Router } from 'express';
import prisma from '../lib/prisma';
import { provisionPosTenant, generateTempPassword } from '../lib/provision';
import { sendWelcomeEmail } from '../lib/mailer';

const router = Router();

// GET /mainframe/onboarding/:token
router.get('/:token', async (req, res) => {
  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { onboardingToken: req.params.token },
      include: { subscription: true },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Invalid or expired onboarding link.' });
    }
    if (profile.status !== 'ONBOARDING') {
      return res.status(409).json({ message: 'This setup link has already been used.' });
    }
    if (profile.onboardingTokenExpiry && profile.onboardingTokenExpiry < new Date()) {
      return res.status(410).json({ message: 'This setup link has expired. Please contact support@truedesk.co.uk.' });
    }

    return res.json({
      businessName: profile.businessName,
      contactFirstName: profile.contactFirstName,
      contactLastName: profile.contactLastName,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      companyCode: profile.subdomain,
      plan: profile.subscription?.plan ?? 'STARTER',
      monthlyPrice: Number(profile.subscription?.basePrice ?? 29),
      billingCycle: profile.subscription?.billingCycle ?? 'MONTHLY',
    });
  } catch (err) {
    console.error('[Onboarding] GET error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /mainframe/onboarding/:token/submit
router.post('/:token/submit', async (req, res) => {
  try {
    const profile = await prisma.mf_customer_profiles.findUnique({
      where: { onboardingToken: req.params.token },
      include: { subscription: true },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Invalid or expired onboarding link.' });
    }
    if (profile.status !== 'ONBOARDING') {
      return res.status(409).json({ message: 'This setup link has already been used.' });
    }
    if (profile.onboardingTokenExpiry && profile.onboardingTokenExpiry < new Date()) {
      return res.status(410).json({ message: 'This setup link has expired. Please contact support@truedesk.co.uk.' });
    }

    const {
      tradingName,
      vatNumber,
      businessAddress,
      city,
      postalCode,
      country = 'United Kingdom',
      businessPhone,
      termsAccepted,
    } = req.body as {
      tradingName?: string;
      vatNumber?: string;
      businessAddress?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      businessPhone?: string;
      termsAccepted: boolean;
    };

    if (!termsAccepted) {
      return res.status(400).json({ message: 'You must accept the Terms & Conditions.' });
    }
    if (!businessAddress || !city || !postalCode) {
      return res.status(400).json({ message: 'Business address is required.' });
    }

    // Save business details — token stays intact so client can retry if provisioning fails
    await prisma.mf_customer_profiles.update({
      where: { id: profile.id },
      data: {
        tradingName: tradingName || null,
        vatNumber: vatNumber || null,
        businessAddress,
        city,
        postalCode,
        country,
        businessPhone: businessPhone || profile.contactPhone,
        termsAcceptedAt: new Date(),
      },
    });

    // Provision the POS tenant
    const ownerPassword = generateTempPassword();

    try {
      await provisionPosTenant({
        tenantId: profile.subdomain,
        businessName: tradingName || profile.businessName,
        subdomain: profile.subdomain,
        ownerEmail: profile.contactEmail,
        ownerFirstName: profile.contactFirstName,
        ownerLastName: profile.contactLastName,
        ownerPassword,
        tradingName: tradingName || undefined,
        vatNumber: vatNumber || undefined,
        businessAddress,
        city,
        postalCode,
        businessPhone: businessPhone || profile.contactPhone || undefined,
      });
    } catch (provErr) {
      console.error('[Onboarding] POS provisioning failed:', provErr);
      return res.status(502).json({
        message: 'We could not set up your account right now. Please try again or contact support@truedesk.co.uk.',
      });
    }

    // Provisioning succeeded — clear token and mark ACTIVE atomically
    await prisma.mf_customer_profiles.update({
      where: { id: profile.id },
      data: {
        status: 'ACTIVE',
        setupCompletedAt: new Date(),
        onboardingToken: null,
        onboardingTokenExpiry: null,
      },
    });

    await prisma.mf_activity_logs.create({
      data: {
        customerProfileId: profile.id,
        action: 'profile.onboarding_completed',
        description: `Client completed onboarding form and POS was provisioned`,
        actorType: 'client',
        ipAddress: req.ip,
      },
    });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail({
      to: profile.contactEmail,
      firstName: profile.contactFirstName,
      businessName: tradingName || profile.businessName,
      companyCode: profile.subdomain,
      ownerEmail: profile.contactEmail,
      ownerPassword,
    }).catch((e) => console.error('[Onboarding] Welcome email failed:', e));

    return res.json({
      success: true,
      companyCode: profile.subdomain,
      email: profile.contactEmail,
      password: ownerPassword,
      loginUrl: 'https://pos.truedesk.co.uk',
    });
  } catch (err) {
    console.error('[Onboarding] submit error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
