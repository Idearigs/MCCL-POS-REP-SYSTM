import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('mainframe/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
}
