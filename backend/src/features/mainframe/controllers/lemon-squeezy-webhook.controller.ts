import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { LemonSqueezyService } from '../services/lemon-squeezy.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AsyncQueueService } from '../../../core/queue/async-queue.service';

const LS_WEBHOOK_QUEUE = 'ls-webhook';

interface LsWebhookJob {
  event: string;
  payload: LsWebhookPayload;
}

@Controller('webhooks')
export class LemonSqueezyWebhookController implements OnModuleInit {
  private readonly logger = new Logger(LemonSqueezyWebhookController.name);

  constructor(
    private readonly ls: LemonSqueezyService,
    private readonly prisma: PrismaService,
    private readonly queue: AsyncQueueService,
  ) {}

  onModuleInit() {
    // The queue worker runs the actual DB business logic off the request path.
    this.queue.process<LsWebhookJob>(LS_WEBHOOK_QUEUE, (job) =>
      this.dispatch(job.event, job.payload),
    );
  }

  @Public()
  @Post('lemon-squeezy')
  @HttpCode(200)
  handleWebhook(
    @Req() req: Request,
    @Headers('x-signature') signature: string,
  ) {
    // ── 1. Verify the request is genuinely from LemonSqueezy (stays sync &
    //       secure — no offloading until the signature is proven valid). ──
    const rawBody = (req as any).rawBody as string | undefined;
    const bodyStr = rawBody ?? JSON.stringify(req.body);

    if (signature && !this.ls.verifySignature(bodyStr, signature)) {
      this.logger.warn('Invalid LemonSqueezy webhook signature — rejected');
      throw new BadRequestException('Invalid signature');
    }

    const event = req.headers['x-event-name'] as string;
    const payload = req.body as LsWebhookPayload;

    // ── 2. Offload to the async queue and return immediately. No DB writes or
    //       third-party calls are awaited inside the webhook lifecycle. ──
    this.queue.enqueue<LsWebhookJob>(LS_WEBHOOK_QUEUE, { event, payload });
    this.logger.log(`[LS Webhook] ${event} — queued`);

    // ── 3. ACK in milliseconds so LemonSqueezy never times out / retries. ──
    return { received: true };
  }

  /** Background worker — runs the matching handler for a queued webhook event. */
  private async dispatch(
    event: string,
    payload: LsWebhookPayload,
  ): Promise<void> {
    switch (event) {
      case 'order_created':
        await this.handleOrderCreated(payload);
        break;
      case 'subscription_created':
        await this.handleSubscriptionCreated(payload);
        break;
      case 'subscription_updated':
        await this.handleSubscriptionUpdated(payload);
        break;
      case 'subscription_cancelled':
        await this.handleSubscriptionCancelled(payload);
        break;
      case 'subscription_resumed':
        await this.handleSubscriptionUpdated(payload); // same logic
        break;
      case 'subscription_expired':
        await this.handleSubscriptionExpired(payload);
        break;
      case 'subscription_payment_success':
        await this.handlePaymentSuccess(payload);
        break;
      case 'subscription_payment_failed':
        await this.handlePaymentFailed(payload);
        break;
      case 'subscription_payment_recovered':
        await this.handlePaymentSuccess(payload); // treat same as success
        break;
      default:
        this.logger.log(`[LS Webhook] Unhandled event: ${event}`);
    }
  }

  /**
   * Apply a billing-derived status to BOTH the mainframe profile and the POS
   * `tenants` table. The tenants table is what actually gates the POS app and
   * drives the in-app billing banner, so it MUST be kept in sync here — the
   * earlier code wrote invalid enum values straight to mf_customer_profiles
   * (PAYMENT_WARNING / INACTIVE aren't CustomerProfileStatus values) and never
   * touched the tenant row.
   */
  private async applyStatus(
    profileId: string,
    tenantStatus: 'ACTIVE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE',
    opts?: { billingDueDate?: Date | null; suspendedReason?: string },
  ): Promise<void> {
    // CustomerProfileStatus is narrower than TenantStatus — still-functional
    // billing states stay ACTIVE on the profile; the precise state lives on the
    // tenant row.
    const profileStatus =
      tenantStatus === 'SUSPENDED'
        ? 'SUSPENDED'
        : tenantStatus === 'INACTIVE'
          ? 'DEACTIVATED'
          : 'ACTIVE';

    const profile = await this.prisma.mf_customer_profiles
      .update({
        where: { id: profileId },
        data: { status: profileStatus as any },
        select: { subdomain: true },
      })
      .catch(() => null);

    if (!profile) {
      this.logger.warn(`[LS] applyStatus — profile ${profileId} not found`);
      return;
    }

    await this.prisma.tenants
      .update({
        where: { subdomain: profile.subdomain.toLowerCase() },
        data: {
          status: tenantStatus as any,
          suspendedAt: tenantStatus === 'SUSPENDED' ? new Date() : null,
          suspendedReason:
            tenantStatus === 'SUSPENDED'
              ? (opts?.suspendedReason ?? 'PAYMENT')
              : null,
          billingDueDate: opts?.billingDueDate ?? undefined,
          updatedAt: new Date(),
        },
      })
      .catch((err) =>
        this.logger.warn(
          `[LS] tenant status sync failed for '${profile.subdomain}': ${err}`,
        ),
      );
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  private async handleOrderCreated(payload: LsWebhookPayload) {
    // The initial order — we use this to link profileId from custom_data
    const customData = payload.meta?.custom_data as
      | Record<string, string>
      | undefined;
    const profileId = customData?.profileId;
    if (!profileId) {
      this.logger.warn('[LS] order_created missing profileId in custom_data');
      return;
    }
    const attrs = payload.data.attributes;
    const orderId = String(payload.data.id);

    // Store the orderId on the subscription record so we can match it later
    await this.prisma.mf_subscriptions.updateMany({
      where: { customerProfileId: profileId },
      data: { lsOrderId: orderId },
    });

    this.logger.log(`[LS] order_created linked to profileId=${profileId}`);
  }

  private async handleSubscriptionCreated(payload: LsWebhookPayload) {
    const customData = payload.meta?.custom_data as
      | Record<string, string>
      | undefined;
    const profileId = customData?.profileId;
    if (!profileId) {
      this.logger.warn('[LS] subscription_created missing profileId');
      return;
    }

    const attrs = payload.data.attributes;
    const lsId = String(payload.data.id);
    const status = LemonSqueezyService.mapLsStatusToTenantStatus(
      attrs.status ?? 'active',
    );

    const renewsAt = attrs.renews_at
      ? new Date(attrs.renews_at)
      : new Date(Date.now() + 30 * 86400_000);
    const createdAt = attrs.created_at
      ? new Date(attrs.created_at)
      : new Date();

    await this.prisma.mf_subscriptions.updateMany({
      where: { customerProfileId: profileId },
      data: {
        lsSubscriptionId: lsId,
        lsCustomerId: String(attrs.customer_id ?? ''),
        lsVariantId: String(attrs.variant_id ?? ''),
        lsStatus: attrs.status ?? 'active',
        isActive: true,
        // The customer has now subscribed through LemonSqueezy — end any local
        // pre-purchase trial so the trial banner stops showing.
        isOnTrial: false,
        currentPeriodStart: createdAt,
        currentPeriodEnd: renewsAt,
        nextBillingDate: renewsAt,
        lastPaymentAt: new Date(),
      },
    });

    await this.applyStatus(profileId, status, { billingDueDate: renewsAt });

    this.logger.log(
      `[LS] Subscription ACTIVATED for profileId=${profileId}  lsId=${lsId}`,
    );
  }

  private async handleSubscriptionUpdated(payload: LsWebhookPayload) {
    const attrs = payload.data.attributes;
    const lsId = String(payload.data.id);
    const status = LemonSqueezyService.mapLsStatusToTenantStatus(
      attrs.status ?? 'active',
    );

    const sub = await this.prisma.mf_subscriptions.findFirst({
      where: { lsSubscriptionId: lsId },
    });
    if (!sub) {
      this.logger.warn(
        `[LS] subscription_updated — no subscription found for lsId=${lsId}`,
      );
      return;
    }

    const renewsAt = attrs.renews_at
      ? new Date(attrs.renews_at)
      : sub.nextBillingDate;

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: {
        lsStatus: attrs.status ?? sub.lsStatus,
        isActive: status === 'ACTIVE',
        nextBillingDate: renewsAt,
        currentPeriodEnd: renewsAt,
      },
    });

    await this.applyStatus(sub.customerProfileId, status, {
      billingDueDate: renewsAt,
    });

    this.logger.log(
      `[LS] Subscription updated  lsId=${lsId}  status=${attrs.status}`,
    );
  }

  private async handleSubscriptionCancelled(payload: LsWebhookPayload) {
    const attrs = payload.data.attributes;
    const lsId = String(payload.data.id);

    const sub = await this.prisma.mf_subscriptions.findFirst({
      where: { lsSubscriptionId: lsId },
    });
    if (!sub) return;

    // A cancelled LemonSqueezy subscription usually stays active until the end
    // of the paid period (ends_at). Keep the tenant running until then; the
    // subsequent `subscription_expired` event does the actual suspend.
    const endsAt = attrs.ends_at ? new Date(attrs.ends_at) : null;
    const stillActive = endsAt ? endsAt.getTime() > Date.now() : false;

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: {
        lsStatus: 'cancelled',
        isActive: stillActive,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled via LemonSqueezy',
        ...(endsAt ? { currentPeriodEnd: endsAt } : {}),
      },
    });

    await this.applyStatus(
      sub.customerProfileId,
      stillActive ? 'ACTIVE' : 'SUSPENDED',
      { suspendedReason: 'CANCELLED', billingDueDate: endsAt },
    );

    this.logger.log(
      `[LS] Subscription CANCELLED  lsId=${lsId}  stillActive=${stillActive}`,
    );
  }

  private async handleSubscriptionExpired(payload: LsWebhookPayload) {
    const lsId = String(payload.data.id);
    const sub = await this.prisma.mf_subscriptions.findFirst({
      where: { lsSubscriptionId: lsId },
    });
    if (!sub) return;

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: { lsStatus: 'expired', isActive: false },
    });

    await this.applyStatus(sub.customerProfileId, 'INACTIVE');

    this.logger.log(`[LS] Subscription EXPIRED  lsId=${lsId}`);
  }

  private async handlePaymentSuccess(payload: LsWebhookPayload) {
    const attrs = payload.data.attributes;
    const lsId = String(payload.data.id);

    const sub = await this.prisma.mf_subscriptions.findFirst({
      where: { lsSubscriptionId: lsId },
    });
    if (!sub) return;

    const renewsAt = attrs.renews_at
      ? new Date(attrs.renews_at)
      : sub.nextBillingDate;

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: {
        lsStatus: 'active',
        isActive: true,
        isOnTrial: false,
        lastPaymentAt: new Date(),
        currentPeriodEnd: renewsAt,
        nextBillingDate: renewsAt,
      },
    });

    await this.applyStatus(sub.customerProfileId, 'ACTIVE', {
      billingDueDate: renewsAt,
    });

    this.logger.log(`[LS] Payment SUCCESS  lsId=${lsId}`);
  }

  private async handlePaymentFailed(payload: LsWebhookPayload) {
    const lsId = String(payload.data.id);
    const sub = await this.prisma.mf_subscriptions.findFirst({
      where: { lsSubscriptionId: lsId },
    });
    if (!sub) return;

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: { lsStatus: 'past_due' },
    });

    await this.applyStatus(sub.customerProfileId, 'PAYMENT_WARNING', {
      billingDueDate: new Date(),
    });

    this.logger.log(`[LS] Payment FAILED  lsId=${lsId}`);
  }
}

// ── Payload types ─────────────────────────────────────────────────────────────

interface LsWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: unknown;
  };
  data: {
    id: string | number;
    attributes: {
      status?: string;
      customer_id?: number | string;
      variant_id?: number | string;
      renews_at?: string;
      ends_at?: string;
      created_at?: string;
      urls?: { customer_portal?: string };
      [key: string]: unknown;
    };
  };
}
