import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SUBDOMAIN = 'buymejewellery';
// Trial runs to the end of June 2026 (owner-confirmed).
const TRIAL_END = new Date('2026-06-30T23:59:59.000Z');

/**
 * Ensure the launch client (Buy Me Jewellery) has a PROFESSIONAL subscription
 * row on a trial ending 30 Jun 2026, so the LemonSqueezy checkout (which looks
 * the tenant up by subdomain) works and the in-app trial banner has something
 * to count down.
 *
 * Idempotent and safe to run on every boot:
 *   - skips entirely if the tenant has already subscribed via LemonSqueezy
 *     (lsSubscriptionId set) so we never clobber a paying customer;
 *   - creates the subscription if missing, otherwise just (re)affirms the trial.
 */
export async function seedBuymeTrial(prisma: PrismaService): Promise<void> {
  const logger = new Logger('BuymeTrialSeed');

  const profile = await prisma.mf_customer_profiles
    .findUnique({
      where: { subdomain: SUBDOMAIN },
      include: { subscription: true },
    })
    .catch(() => null);

  if (!profile) {
    logger.warn(
      `No mainframe profile for '${SUBDOMAIN}' — skipping trial seed (provision the profile first).`,
    );
    return;
  }

  const sub = profile.subscription;

  if (sub?.lsSubscriptionId) {
    logger.log(
      `'${SUBDOMAIN}' already has a LemonSqueezy subscription — leaving billing untouched.`,
    );
    return;
  }

  if (!sub) {
    await prisma.mf_subscriptions.create({
      data: {
        customerProfileId: profile.id,
        plan: 'PROFESSIONAL' as any,
        billingCycle: 'MONTHLY' as any,
        basePrice: 79,
        perUserPrice: 8,
        includedUsers: 5,
        maxUsers: 15,
        currentUsers: 1,
        isActive: true,
        isOnTrial: true,
        trialEndsAt: TRIAL_END,
        currentPeriodEnd: TRIAL_END,
        nextBillingDate: TRIAL_END,
      },
    });
    logger.log(
      `Created PROFESSIONAL trial for '${SUBDOMAIN}' → ends ${TRIAL_END.toDateString()}`,
    );
    return;
  }

  await prisma.mf_subscriptions.update({
    where: { id: sub.id },
    data: {
      plan: 'PROFESSIONAL' as any,
      isActive: true,
      isOnTrial: true,
      trialEndsAt: TRIAL_END,
    },
  });
  logger.log(
    `Re-affirmed PROFESSIONAL trial for '${SUBDOMAIN}' → ends ${TRIAL_END.toDateString()}`,
  );
}
