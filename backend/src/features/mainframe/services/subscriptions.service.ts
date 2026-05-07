import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findByProfile(profileId: string) {
    const subscription = await this.prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: profileId },
      include: {
        customerProfile: { select: { businessName: true, subdomain: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async updatePlan(
    profileId: string,
    data: { plan: string; billingCycle?: string },
  ) {
    const subscription = await this.prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: profileId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const planConfig = this.getPlanConfig(data.plan);
    return this.prisma.mf_subscriptions.update({
      where: { id: subscription.id },
      data: {
        plan: data.plan as any,
        billingCycle: (data.billingCycle as any) || subscription.billingCycle,
        basePrice: planConfig.basePrice,
        perUserPrice: planConfig.perUserPrice,
        includedUsers: planConfig.includedUsers,
        maxUsers: planConfig.maxUsers,
      },
    });
  }

  async cancel(profileId: string, reason?: string) {
    const subscription = await this.prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: profileId },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    return this.prisma.mf_subscriptions.update({
      where: { id: subscription.id },
      data: {
        isActive: false,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async generateInvoice(profileId: string) {
    const subscription = await this.prisma.mf_subscriptions.findUnique({
      where: { customerProfileId: profileId },
      include: { customerProfile: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const extraUsers = Math.max(
      0,
      subscription.currentUsers - subscription.includedUsers,
    );
    const userCharges = extraUsers * Number(subscription.perUserPrice);
    const subtotal = Number(subscription.basePrice) + userCharges;
    const discount =
      subtotal * (Number(subscription.discountPercent || 0) / 100);
    const tax = (subtotal - discount) * 0.2; // 20% VAT
    const total = subtotal - discount + tax;

    const invoiceNumber = `INV-${Date.now()}`;

    return this.prisma.mf_invoices.create({
      data: {
        customerProfileId: profileId,
        subscriptionId: subscription.id,
        invoiceNumber,
        subtotal,
        discount,
        tax,
        total,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        lineItems: [
          {
            description: `${subscription.plan} Plan`,
            amount: Number(subscription.basePrice),
          },
          ...(extraUsers > 0
            ? [
                {
                  description: `Additional Users (${extraUsers})`,
                  amount: userCharges,
                },
              ]
            : []),
        ],
      },
    });
  }

  async getInvoices(profileId: string) {
    return this.prisma.mf_invoices.findMany({
      where: { customerProfileId: profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markInvoicePaid(invoiceId: string, transactionId?: string) {
    return this.prisma.mf_invoices.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date(), transactionId },
    });
  }

  async getStats() {
    const [total, active, byPlan, mrr] = await Promise.all([
      this.prisma.mf_subscriptions.count(),
      this.prisma.mf_subscriptions.count({ where: { isActive: true } }),
      this.prisma.mf_subscriptions.groupBy({ by: ['plan'], _count: true }),
      this.prisma.mf_subscriptions.aggregate({
        where: { isActive: true, billingCycle: 'MONTHLY' },
        _sum: { basePrice: true },
      }),
    ]);

    return { total, active, byPlan, mrr: mrr._sum.basePrice || 0 };
  }

  private getPlanConfig(plan: string) {
    const configs: Record<string, any> = {
      STARTER: {
        basePrice: 29,
        perUserPrice: 10,
        includedUsers: 1,
        maxUsers: 3,
      },
      PROFESSIONAL: {
        basePrice: 79,
        perUserPrice: 8,
        includedUsers: 5,
        maxUsers: 15,
      },
      BUSINESS: {
        basePrice: 199,
        perUserPrice: 6,
        includedUsers: 15,
        maxUsers: 50,
      },
      ENTERPRISE: {
        basePrice: 499,
        perUserPrice: 5,
        includedUsers: 50,
        maxUsers: null,
      },
      CUSTOM: {
        basePrice: 0,
        perUserPrice: 0,
        includedUsers: 1,
        maxUsers: null,
      },
    };
    return configs[plan] || configs.STARTER;
  }
}
