import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';

const router = Router();

function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// POST /webhooks/lemonsqueezy
// LemonSqueezy calls this when a subscription event happens.
// Mount BEFORE express.json() middleware so we get the raw body.
router.post(
  '/webhooks/lemonsqueezy',
  // raw body is injected by express.raw() mounted in index.ts for this path
  async (req: Request, res: Response) => {
    const signature = (req.headers['x-signature'] as string) || '';

    if (!verifySignature(req.body as Buffer, signature)) {
      console.warn('[lemon-webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let event: any;
    try {
      event = JSON.parse((req.body as Buffer).toString());
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const eventName: string = event.meta?.event_name || '';
    const profileId: string = event.meta?.custom_data?.profile_id || '';
    const attrs = event.data?.attributes || {};

    console.log(`[lemon-webhook] ${eventName} | profileId=${profileId || 'none'}`);

    if (!profileId) {
      // No profile ID in custom_data — nothing we can do, but return 200
      // so LemonSqueezy doesn't keep retrying
      return res.json({ received: true, note: 'no profile_id in custom_data' });
    }

    try {
      switch (eventName) {
        case 'subscription_created':
        case 'subscription_payment_success': {
          const renewsAt = attrs.renews_at || attrs.ends_at;
          await activateTenant(profileId, renewsAt);
          break;
        }

        case 'subscription_payment_failed': {
          await setTenantStatus(profileId, 'PAYMENT_DUE');
          break;
        }

        case 'subscription_cancelled': {
          // Cancelled but may still be active until period ends
          const endsAt = attrs.ends_at;
          if (endsAt && new Date(endsAt) > new Date()) {
            // Still within paid period — keep active, mark in notes
            await prisma.mf_activity_logs.create({
              data: {
                customerProfileId: profileId,
                action: 'subscription.cancelled',
                description: `Subscription cancelled via LemonSqueezy. Active until ${new Date(endsAt).toLocaleDateString()}`,
                actorType: 'system',
              },
            });
          } else {
            await setTenantStatus(profileId, 'SUSPENDED');
          }
          break;
        }

        case 'subscription_expired': {
          await setTenantStatus(profileId, 'SUSPENDED');
          break;
        }

        case 'subscription_updated': {
          if (attrs.status === 'active') {
            await activateTenant(profileId, attrs.renews_at);
          }
          break;
        }

        // One-time payment (e.g. custom dev invoice)
        case 'order_created': {
          if (attrs.status === 'paid') {
            await prisma.mf_activity_logs.create({
              data: {
                customerProfileId: profileId,
                action: 'payment.received',
                description: `One-time payment received via LemonSqueezy — £${(Number(attrs.total || 0) / 100).toFixed(2)}`,
                actorType: 'system',
                metadata: { orderId: event.data?.id, total: attrs.total },
              },
            });
          }
          break;
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[lemon-webhook] Processing error:', err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

async function activateTenant(profileId: string, renewsAt?: string) {
  // 1. Update mainframe profile to ACTIVE
  await prisma.mf_customer_profiles.update({
    where: { id: profileId },
    data: { status: 'ACTIVE' },
  }).catch(() => {/* profile may not exist */});

  // 2. Update subscription billing dates
  if (renewsAt) {
    await prisma.mf_subscriptions.updateMany({
      where: { customerProfileId: profileId },
      data: {
        isActive: true,
        lastPaymentAt: new Date(),
        currentPeriodEnd: new Date(renewsAt),
        nextBillingDate: new Date(renewsAt),
      },
    }).catch(() => {});
  }

  // 3. Sync to POS backend tenant status
  await syncToPOS(profileId, 'ACTIVE', null, renewsAt || null);

  // 4. Log
  await prisma.mf_activity_logs.create({
    data: {
      customerProfileId: profileId,
      action: 'subscription.activated',
      description: `Subscription activated via LemonSqueezy payment${renewsAt ? ` — renews ${new Date(renewsAt).toLocaleDateString()}` : ''}`,
      actorType: 'system',
    },
  }).catch(() => {});
}

async function setTenantStatus(profileId: string, status: 'PAYMENT_DUE' | 'SUSPENDED') {
  const profileStatus = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

  await prisma.mf_customer_profiles.update({
    where: { id: profileId },
    data: { status: profileStatus },
  }).catch(() => {});

  await syncToPOS(profileId, status, status === 'SUSPENDED' ? 'PAYMENT_OVERDUE' : null, null);

  await prisma.mf_activity_logs.create({
    data: {
      customerProfileId: profileId,
      action: `subscription.${status.toLowerCase()}`,
      description: `Tenant status set to ${status} via LemonSqueezy webhook`,
      actorType: 'system',
    },
  }).catch(() => {});
}

async function syncToPOS(
  profileId: string,
  status: string,
  suspendedReason: string | null,
  billingDueDate: string | null,
) {
  const posUrl = process.env.POS_BACKEND_URL;
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!posUrl || !apiKey) return;

  await fetch(`${posUrl}/mainframe/customer-profiles/${profileId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': apiKey,
    },
    body: JSON.stringify({ status, suspendedReason, billingDueDate }),
  }).catch(err => console.error('[lemon-webhook] POS sync failed:', err));
}

export default router;
