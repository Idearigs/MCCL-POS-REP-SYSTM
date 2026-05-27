import { Controller, Get, Post, Put, Body, Param, Query, InternalServerErrorException } from '@nestjs/common';
import { SubscriptionsService } from '../services/subscriptions.service';
import { LemonSqueezyService } from '../services/lemon-squeezy.service';
import { PrismaService } from '../../../core/prisma/prisma.service';

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
    if (!subdomain) throw new InternalServerErrorException('subdomain is required');

    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: { id: true, businessEmail: true, businessName: true },
    });

    if (!profile) throw new InternalServerErrorException('Tenant profile not found');

    try {
      const checkoutUrl = await this.lemonSqueezy.createCheckout({
        email:     profile.businessEmail,
        name:      profile.businessName,
        profileId: profile.id,
        tenantId:  subdomain,
      });
      return { checkoutUrl };
    } catch (err) {
      throw new InternalServerErrorException(`Failed to create checkout: ${err}`);
    }
  }

  /** Get current subscription status by subdomain — tenant-facing. */
  @Get('by-subdomain/:subdomain')
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      select: { id: true },
    });
    if (!profile) throw new InternalServerErrorException('Profile not found');
    return this.subscriptionsService.findByProfile(profile.id);
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

    const portalUrl = await this.lemonSqueezy.getCustomerPortalUrl(sub.lsSubscriptionId);
    return { portalUrl };
  }
}
