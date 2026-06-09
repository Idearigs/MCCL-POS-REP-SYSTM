import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SubscriptionsService } from '../services/subscriptions.service';
import { LemonSqueezyService } from '../services/lemon-squeezy.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import { verifyInternalHmac } from '../../../shared/utils/hmac-verify';

@Controller('mainframe/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly lemonSqueezy: LemonSqueezyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.subscriptionsService.getStats();
  }

  /**
   * Internal — billing/payment status of every tenant, for the Mainframe admin
   * panel's tracking view. Authenticated with the shared HMAC scheme (same as
   * other Mainframe → POS internal calls), not a user JWT.
   */
  @Public()
  @Get('overview')
  async overview(
    @Headers('x-internal-timestamp') timestamp: string,
    @Headers('x-internal-signature') signature: string,
  ) {
    verifyInternalHmac(signature, timestamp, '');
    return this.subscriptionsService.getOverview();
  }

  @Get('profile/:profileId')
  async findByProfile(@Param('profileId') profileId: string) {
    return this.subscriptionsService.findByProfile(profileId);
  }

  @Put('profile/:profileId/plan')
  async updatePlan(
    @Param('profileId') profileId: string,
    @Body() data: { plan: string; billingCycle?: string },
  ) {
    return this.subscriptionsService.updatePlan(profileId, data);
  }

  @Post('profile/:profileId/cancel')
  async cancel(
    @Param('profileId') profileId: string,
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionsService.cancel(profileId, reason);
  }

  @Post('profile/:profileId/generate-invoice')
  async generateInvoice(@Param('profileId') profileId: string) {
    return this.subscriptionsService.generateInvoice(profileId);
  }

  @Get('profile/:profileId/invoices')
  async getInvoices(@Param('profileId') profileId: string) {
    return this.subscriptionsService.getInvoices(profileId);
  }

  @Post('invoices/:invoiceId/mark-paid')
  async markInvoicePaid(
    @Param('invoiceId') invoiceId: string,
    @Body('transactionId') transactionId?: string,
  ) {
    return this.subscriptionsService.markInvoicePaid(invoiceId, transactionId);
  }

  /** Create a LemonSqueezy hosted checkout URL — accepts subdomain (tenant-facing). */
  @Post('create-checkout')
  async createCheckout(@Body('subdomain') subdomain: string) {
    if (!subdomain) throw new BadRequestException('subdomain is required');

    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: { id: true, businessEmail: true, businessName: true },
    });

    // Expected condition (tenant not provisioned for billing) → clean 404 with
    // an actionable message, not a 500. The client surfaces this to the user.
    if (!profile)
      throw new NotFoundException(
        'Billing is not enabled for this account yet. Please contact support to set up your subscription.',
      );

    try {
      const checkoutUrl = await this.lemonSqueezy.createCheckout({
        email: profile.businessEmail,
        name: profile.businessName,
        profileId: profile.id,
        tenantId: subdomain,
      });
      return { checkoutUrl };
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to create checkout: ${err}`,
      );
    }
  }

  /** Get current subscription status by subdomain — tenant-facing. */
  @Get('by-subdomain/:subdomain')
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: { id: true },
    });
    // A tenant with no mainframe billing profile simply has no subscription yet
    // — that's an expected state, not an error. Return null so the client shows
    // its "No subscription / Subscribe now" view instead of an error banner.
    if (!profile) return null;
    try {
      return await this.subscriptionsService.findByProfile(profile.id);
    } catch {
      // Profile exists but no subscription row yet — also "no subscription".
      return null;
    }
  }

  /** Get the LemonSqueezy customer portal URL by subdomain. */
  @Get('portal-url/:subdomain')
  async getPortalUrl(@Param('subdomain') subdomain: string) {
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: { id: true },
    });
    if (!profile) return { portalUrl: null };

    const sub = await this.prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: profile.id },
      select: { lsSubscriptionId: true },
    });
    if (!sub?.lsSubscriptionId) return { portalUrl: null };

    const portalUrl = await this.lemonSqueezy.getCustomerPortalUrl(
      sub.lsSubscriptionId,
    );
    return { portalUrl };
  }
}
