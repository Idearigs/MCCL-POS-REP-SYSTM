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
var CustomerProfilesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerProfilesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const customer_profile_dto_1 = require("../dto/customer-profile.dto");
const subdomain_service_1 = require("./subdomain.service");
const config_1 = require("@nestjs/config");
const MF_TO_POS_STATUS = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DEACTIVATED: 'SUSPENDED',
    MAINTENANCE: 'INACTIVE',
    PENDING_SETUP: 'INACTIVE',
};
let CustomerProfilesService = CustomerProfilesService_1 = class CustomerProfilesService {
    prisma;
    subdomainService;
    config;
    logger = new common_1.Logger(CustomerProfilesService_1.name);
    constructor(prisma, subdomainService, config) {
        this.prisma = prisma;
        this.subdomainService = subdomainService;
        this.config = config;
    }
    async syncTenantStatusToPOS(subdomain, mfStatus, opts) {
        const posStatus = MF_TO_POS_STATUS[mfStatus] ?? 'INACTIVE';
        const isSuspended = posStatus === 'SUSPENDED';
        try {
            await this.prisma.tenants.update({
                where: { subdomain: subdomain.toLowerCase() },
                data: {
                    status: posStatus,
                    suspendedAt: isSuspended ? new Date() : null,
                    suspendedReason: isSuspended ? (opts?.suspendedReason || 'MANUAL') : null,
                    billingDueDate: opts?.billingDueDate ? new Date(opts.billingDueDate) : undefined,
                    updatedAt: new Date(),
                },
            });
            this.logger.log(`Tenant '${subdomain}' status synced: ${mfStatus} → ${posStatus}`);
        }
        catch (err) {
            this.logger.error(`Failed to sync tenant status for '${subdomain}': ${err.message}`);
        }
    }
    async create(dto) {
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!subdomainRegex.test(dto.subdomain.toLowerCase())) {
            throw new common_1.BadRequestException('Subdomain must contain only lowercase letters, numbers, and hyphens');
        }
        const existingSubdomain = await this.prisma.mf_customer_profiles.findUnique({
            where: { subdomain: dto.subdomain.toLowerCase() },
        });
        if (existingSubdomain) {
            throw new common_1.ConflictException('Subdomain is already taken');
        }
        const existingEmail = await this.prisma.mf_customer_profiles.findUnique({
            where: { businessEmail: dto.businessEmail.toLowerCase() },
        });
        if (existingEmail) {
            throw new common_1.ConflictException('Business email is already registered');
        }
        const databaseName = `truedesk_${dto.subdomain.toLowerCase().replace(/-/g, '_')}`;
        const profile = await this.prisma.mf_customer_profiles.create({
            data: {
                businessName: dto.businessName,
                businessEmail: dto.businessEmail.toLowerCase(),
                businessPhone: dto.businessPhone,
                businessAddress: dto.businessAddress,
                city: dto.city,
                country: dto.country,
                postalCode: dto.postalCode,
                subdomain: dto.subdomain.toLowerCase(),
                customDomain: dto.customDomain,
                databaseName,
                contactFirstName: dto.contactFirstName,
                contactLastName: dto.contactLastName,
                contactEmail: dto.contactEmail.toLowerCase(),
                contactPhone: dto.contactPhone,
                logoUrl: dto.logoUrl,
                primaryColor: dto.primaryColor || '#3B82F6',
                secondaryColor: dto.secondaryColor || '#6366F1',
                internalNotes: dto.internalNotes,
                status: 'PENDING_SETUP',
            },
        });
        const plan = dto.plan || customer_profile_dto_1.SubscriptionPlan.STARTER;
        const billingCycle = dto.billingCycle || customer_profile_dto_1.BillingCycle.MONTHLY;
        const planConfig = this.getPlanConfig(plan);
        const nextBillingDate = this.calculateNextBillingDate(billingCycle);
        await this.prisma.mf_subscriptions.create({
            data: {
                customerProfileId: profile.id,
                plan,
                billingCycle,
                basePrice: planConfig.basePrice,
                perUserPrice: planConfig.perUserPrice,
                includedUsers: planConfig.includedUsers,
                maxUsers: planConfig.maxUsers,
                currentUsers: 1,
                currentPeriodEnd: nextBillingDate,
                nextBillingDate,
            },
        });
        if (dto.featureKeys && dto.featureKeys.length > 0) {
            const features = await this.prisma.mf_features.findMany({
                where: { featureKey: { in: dto.featureKeys } },
            });
            for (const feature of features) {
                await this.prisma.mf_customer_features.create({
                    data: {
                        customerProfileId: profile.id,
                        featureId: feature.id,
                        isEnabled: true,
                    },
                });
            }
        }
        else {
            const baseFeatures = await this.prisma.mf_features.findMany({
                where: { isIncludedInBase: true, isEnabled: true },
            });
            for (const feature of baseFeatures) {
                await this.prisma.mf_customer_features.create({
                    data: {
                        customerProfileId: profile.id,
                        featureId: feature.id,
                        isEnabled: true,
                    },
                });
            }
        }
        await this.logActivity(profile.id, 'profile.created', 'Customer profile created', 'system');
        this.subdomainService
            .provisionSubdomain(profile.id, dto.subdomain.toLowerCase())
            .catch((err) => console.error('Subdomain provisioning failed:', err));
        return this.findOne(profile.id);
    }
    async findAll(options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (options?.status) {
            where.status = options.status;
        }
        if (options?.search) {
            where.OR = [
                { businessName: { contains: options.search, mode: 'insensitive' } },
                { businessEmail: { contains: options.search, mode: 'insensitive' } },
                { subdomain: { contains: options.search, mode: 'insensitive' } },
                { contactFirstName: { contains: options.search, mode: 'insensitive' } },
                { contactLastName: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        const [profiles, total] = await Promise.all([
            this.prisma.mf_customer_profiles.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    subscription: true,
                    enabledFeatures: {
                        include: { feature: true },
                    },
                    _count: {
                        select: { customerUsers: true },
                    },
                },
            }),
            this.prisma.mf_customer_profiles.count({ where }),
        ]);
        return {
            data: profiles.map(this.formatProfileResponse),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { id },
            include: {
                subscription: true,
                enabledFeatures: {
                    include: { feature: true },
                },
                customerUsers: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        isActive: true,
                        lastLoginAt: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        customerUsers: true,
                        bugReports: true,
                        featureRequests: true,
                    },
                },
            },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        return this.formatProfileResponse(profile);
    }
    async findBySubdomain(subdomain) {
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { subdomain: subdomain.toLowerCase() },
            include: {
                subscription: true,
                enabledFeatures: {
                    include: { feature: true },
                },
            },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        return this.formatProfileResponse(profile);
    }
    async update(id, dto) {
        const existing = await this.prisma.mf_customer_profiles.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        const updated = await this.prisma.mf_customer_profiles.update({
            where: { id },
            data: {
                ...dto,
                businessEmail: dto.businessEmail?.toLowerCase(),
                contactEmail: dto.contactEmail?.toLowerCase(),
            },
            include: {
                subscription: true,
                enabledFeatures: {
                    include: { feature: true },
                },
            },
        });
        await this.logActivity(id, 'profile.updated', 'Customer profile updated', 'admin');
        return this.formatProfileResponse(updated);
    }
    async updateStatus(id, status, opts) {
        const profile = await this.prisma.mf_customer_profiles.update({
            where: { id },
            data: {
                status: status,
                setupCompletedAt: status === 'ACTIVE' ? new Date() : undefined,
            },
        });
        await this.logActivity(id, 'profile.status_changed', `Status changed to ${status}`, 'system');
        await this.syncTenantStatusToPOS(profile.subdomain, status, opts);
        return profile;
    }
    async enableFeature(profileId, featureKey) {
        const feature = await this.prisma.mf_features.findUnique({
            where: { featureKey },
        });
        if (!feature) {
            throw new common_1.NotFoundException('Feature not found');
        }
        const existing = await this.prisma.mf_customer_features.findFirst({
            where: { customerProfileId: profileId, featureId: feature.id },
        });
        if (existing) {
            return this.prisma.mf_customer_features.update({
                where: { id: existing.id },
                data: { isEnabled: true, disabledAt: null },
            });
        }
        return this.prisma.mf_customer_features.create({
            data: {
                customerProfileId: profileId,
                featureId: feature.id,
                isEnabled: true,
            },
        });
    }
    async disableFeature(profileId, featureKey) {
        const feature = await this.prisma.mf_features.findUnique({
            where: { featureKey },
        });
        if (!feature) {
            throw new common_1.NotFoundException('Feature not found');
        }
        const existing = await this.prisma.mf_customer_features.findFirst({
            where: { customerProfileId: profileId, featureId: feature.id },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Feature not enabled for this customer');
        }
        return this.prisma.mf_customer_features.update({
            where: { id: existing.id },
            data: { isEnabled: false, disabledAt: new Date() },
        });
    }
    async getActivityLogs(profileId, limit = 50) {
        return this.prisma.mf_activity_logs.findMany({
            where: { customerProfileId: profileId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async getDashboardStats() {
        const [totalProfiles, activeProfiles, pendingProfiles, suspendedProfiles, totalUsers, recentProfiles,] = await Promise.all([
            this.prisma.mf_customer_profiles.count(),
            this.prisma.mf_customer_profiles.count({ where: { status: 'ACTIVE' } }),
            this.prisma.mf_customer_profiles.count({
                where: { status: 'PENDING_SETUP' },
            }),
            this.prisma.mf_customer_profiles.count({
                where: { status: 'SUSPENDED' },
            }),
            this.prisma.mf_customer_users.count(),
            this.prisma.mf_customer_profiles.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    businessName: true,
                    subdomain: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);
        return {
            totalProfiles,
            activeProfiles,
            pendingProfiles,
            suspendedProfiles,
            totalUsers,
            recentProfiles,
        };
    }
    formatProfileResponse(profile) {
        return {
            id: profile.id,
            businessName: profile.businessName,
            businessEmail: profile.businessEmail,
            businessPhone: profile.businessPhone,
            businessAddress: profile.businessAddress,
            city: profile.city,
            country: profile.country,
            postalCode: profile.postalCode,
            subdomain: profile.subdomain,
            customDomain: profile.customDomain,
            fullDomain: `${profile.subdomain}.truedesk.co.uk`,
            databaseName: profile.databaseName,
            status: profile.status,
            setupCompletedAt: profile.setupCompletedAt,
            logoUrl: profile.logoUrl,
            primaryColor: profile.primaryColor,
            secondaryColor: profile.secondaryColor,
            contact: {
                firstName: profile.contactFirstName,
                lastName: profile.contactLastName,
                email: profile.contactEmail,
                phone: profile.contactPhone,
            },
            subscription: profile.subscription
                ? {
                    id: profile.subscription.id,
                    plan: profile.subscription.plan,
                    billingCycle: profile.subscription.billingCycle,
                    basePrice: profile.subscription.basePrice,
                    perUserPrice: profile.subscription.perUserPrice,
                    includedUsers: profile.subscription.includedUsers,
                    maxUsers: profile.subscription.maxUsers,
                    currentUsers: profile.subscription.currentUsers,
                    isOnTrial: profile.subscription.isOnTrial,
                    trialEndsAt: profile.subscription.trialEndsAt,
                    nextBillingDate: profile.subscription.nextBillingDate,
                    isActive: profile.subscription.isActive,
                }
                : null,
            enabledFeatures: profile.enabledFeatures?.map((cf) => ({
                featureKey: cf.feature.featureKey,
                featureName: cf.feature.featureName,
                isEnabled: cf.isEnabled,
                version: cf.version || cf.feature.currentVersion,
            })) || [],
            users: profile.customerUsers || [],
            stats: profile._count
                ? {
                    userCount: profile._count.customerUsers,
                    bugReportCount: profile._count.bugReports,
                    featureRequestCount: profile._count.featureRequests,
                }
                : null,
            internalNotes: profile.internalNotes,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
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
    calculateNextBillingDate(cycle) {
        const now = new Date();
        switch (cycle) {
            case customer_profile_dto_1.BillingCycle.MONTHLY:
                return new Date(now.setMonth(now.getMonth() + 1));
            case customer_profile_dto_1.BillingCycle.QUARTERLY:
                return new Date(now.setMonth(now.getMonth() + 3));
            case customer_profile_dto_1.BillingCycle.YEARLY:
                return new Date(now.setFullYear(now.getFullYear() + 1));
            default:
                return new Date(now.setMonth(now.getMonth() + 1));
        }
    }
    async logActivity(profileId, action, description, actorType, actorId, actorEmail) {
        await this.prisma.mf_activity_logs.create({
            data: {
                customerProfileId: profileId,
                action,
                description,
                actorType,
                actorId,
                actorEmail,
            },
        });
    }
};
exports.CustomerProfilesService = CustomerProfilesService;
exports.CustomerProfilesService = CustomerProfilesService = CustomerProfilesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subdomain_service_1.SubdomainService,
        config_1.ConfigService])
], CustomerProfilesService);
//# sourceMappingURL=customer-profiles.service.js.map