import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { LemonSqueezyService } from '../services/lemon-squeezy.service';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Controller('webhooks')
export class LemonSqueezyWebhookController {
  private readonly logger = new Logger(LemonSqueezyWebhookController.name);

  constructor(
    private readonly ls: LemonSqueezyService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('lemon-squeezy')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Headers('x-signature') signature: string,
  ) {
    // Verify the request is genuinely from LemonSqueezy
    const rawBody = (req as any).rawBody as string | undefined;
    const bodyStr = rawBody ?? JSON.stringify(req.body);

    if (signature && !this.ls.verifySignature(bodyStr, signature)) {
      this.logger.warn('Invalid LemonSqueezy webhook signature — rejected');
      throw new BadRequestException('Invalid signature');
    }

    const event = req.headers['x-event-name'] as string;
    const payload = req.body as LsWebhookPayload;

    this.logger.log(`[LS Webhook] ${event}`);

    try {
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
    } catch (err) {
      this.logger.error(`[LS Webhook] Error handling ${event}: ${err}`);
      // Return 200 anyway — LS will retry on non-200 which would flood us
    }

    return { received: true };
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
        currentPeriodStart: createdAt,
        currentPeriodEnd: renewsAt,
        nextBillingDate: renewsAt,
        lastPaymentAt: new Date(),
      },
    });

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: profileId },
      data: { status: status as any },
    });

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

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: sub.customerProfileId },
      data: { status: status as any },
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

    await this.prisma.mf_subscriptions.update({
      where: { id: sub.id },
      data: {
        lsStatus: 'cancelled',
        isActive: false,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled via LemonSqueezy',
      },
    });

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: sub.customerProfileId },
      data: { status: 'SUSPENDED' as any },
    });

    this.logger.log(`[LS] Subscription CANCELLED  lsId=${lsId}`);
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

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: sub.customerProfileId },
      data: { status: 'INACTIVE' as any },
    });

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
        lastPaymentAt: new Date(),
        currentPeriodEnd: renewsAt,
        nextBillingDate: renewsAt,
      },
    });

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: sub.customerProfileId },
      data: { status: 'ACTIVE' as any },
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

    await this.prisma.mf_customer_profiles.updateMany({
      where: { id: sub.customerProfileId },
      data: { status: 'PAYMENT_WARNING' as any },
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
