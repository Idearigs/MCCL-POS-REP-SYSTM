"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
let SubscriptionsService = class SubscriptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByProfile(profileId) {
        const subscription = await this.prisma.mf_subscriptions.findUnique({
            where: { customerProfileId: profileId },
            include: {
                customerProfile: { select: { businessName: true, subdomain: true } },
                invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Subscription not found');
        return subscription;
    }
    async updatePlan(profileId, data) {
        const subscription = await this.prisma.mf_subscriptions.findUnique({
            where: { customerProfileId: profileId },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Subscription not found');
        const planConfig = this.getPlanConfig(data.plan);
        return this.prisma.mf_subscriptions.update({
            where: { id: subscription.id },
            data: {
                plan: data.plan,
                billingCycle: data.billingCycle || subscription.billingCycle,
                basePrice: planConfig.basePrice,
                perUserPrice: planConfig.perUserPrice,
                includedUsers: planConfig.includedUsers,
                maxUsers: planConfig.maxUsers,
            },
        });
    }
    async cancel(profileId, reason) {
        const subscription = await this.prisma.mf_subscriptions.findUnique({
            where: { customerProfileId: profileId },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Subscription not found');
        return this.prisma.mf_subscriptions.update({
            where: { id: subscription.id },
            data: {
                isActive: false,
                cancelledAt: new Date(),
                cancellationReason: reason,
            },
        });
    }
    async generateInvoice(profileId) {
        const subscription = await this.prisma.mf_subscriptions.findUnique({
            where: { customerProfileId: profileId },
            include: { customerProfile: true },
        });
        if (!subscription)
            throw new common_1.NotFoundException('Subscription not found');
        const extraUsers = Math.max(0, subscription.currentUsers - subscription.includedUsers);
        const userCharges = extraUsers * Number(subscription.perUserPrice);
        const subtotal = Number(subscription.basePrice) + userCharges;
        const discount = subtotal * (Number(subscription.discountPercent || 0) / 100);
        const tax = (subtotal - discount) * 0.2;
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
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
    async getInvoices(profileId) {
        return this.prisma.mf_invoices.findMany({
            where: { customerProfileId: profileId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async markInvoicePaid(invoiceId, transactionId) {
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
    getPlanConfig(plan) {
        const configs = {
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
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map