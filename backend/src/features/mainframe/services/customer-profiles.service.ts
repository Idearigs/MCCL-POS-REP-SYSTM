import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto, SubscriptionPlan, BillingCycle } from '../dto/customer-profile.dto';
import { SubdomainService } from './subdomain.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerProfilesService {
  constructor(
    private prisma: PrismaService,
    private subdomainService: SubdomainService,
  ) {}

  async create(dto: CreateCustomerProfileDto) {
    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(dto.subdomain.toLowerCase())) {
      throw new BadRequestException('Subdomain must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if subdomain is already taken
    const existingSubdomain = await this.prisma.mf_customer_profiles.findUnique({
      where: { subdomain: dto.subdomain.toLowerCase() },
    });

    if (existingSubdomain) {
      throw new ConflictException('Subdomain is already taken');
    }

    // Check if business email is already registered
    const existingEmail = await this.prisma.mf_customer_profiles.findUnique({
      where: { businessEmail: dto.businessEmail.toLowerCase() },
    });

    if (existingEmail) {
      throw new ConflictException('Business email is already registered');
    }

    // Generate unique database name
    const databaseName = `truedesk_${dto.subdomain.toLowerCase().replace(/-/g, '_')}`;

    // Create customer profile
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

    // Create subscription
    const plan = dto.plan || SubscriptionPlan.STARTER;
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;

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

    // Enable default features
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
    } else {
      // Enable all base features
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

    // Log activity
    await this.logActivity(profile.id, 'profile.created', 'Customer profile created', 'system');

    // Provision subdomain (async - don't wait)
    this.subdomainService.provisionSubdomain(profile.id, dto.subdomain.toLowerCase())
      .catch(err => console.error('Subdomain provisioning failed:', err));

    return this.findOne(profile.id);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

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

  async findOne(id: string) {
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
      throw new NotFoundException('Customer profile not found');
    }

    return this.formatProfileResponse(profile);
  }

  async findBySubdomain(subdomain: string) {
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
      throw new NotFoundException('Customer profile not found');
    }

    return this.formatProfileResponse(profile);
  }

  async update(id: string, dto: UpdateCustomerProfileDto) {
    const existing = await this.prisma.mf_customer_profiles.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Customer profile not found');
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

  async updateStatus(id: string, status: string) {
    const profile = await this.prisma.mf_customer_profiles.update({
      where: { id },
      data: {
        status: status as any,
        setupCompletedAt: status === 'ACTIVE' ? new Date() : undefined,
      },
    });

    await this.logActivity(id, 'profile.status_changed', `Status changed to ${status}`, 'system');

    return profile;
  }

  async enableFeature(profileId: string, featureKey: string) {
    const feature = await this.prisma.mf_features.findUnique({
      where: { featureKey },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
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

  async disableFeature(profileId: string, featureKey: string) {
    const feature = await this.prisma.mf_features.findUnique({
      where: { featureKey },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    const existing = await this.prisma.mf_customer_features.findFirst({
      where: { customerProfileId: profileId, featureId: feature.id },
    });

    if (!existing) {
      throw new NotFoundException('Feature not enabled for this customer');
    }

    return this.prisma.mf_customer_features.update({
      where: { id: existing.id },
      data: { isEnabled: false, disabledAt: new Date() },
    });
  }

  async getActivityLogs(profileId: string, limit = 50) {
    return this.prisma.mf_activity_logs.findMany({
      where: { customerProfileId: profileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getDashboardStats() {
    const [
      totalProfiles,
      activeProfiles,
      pendingProfiles,
      suspendedProfiles,
      totalUsers,
      recentProfiles,
    ] = await Promise.all([
      this.prisma.mf_customer_profiles.count(),
      this.prisma.mf_customer_profiles.count({ where: { status: 'ACTIVE' } }),
      this.prisma.mf_customer_profiles.count({ where: { status: 'PENDING_SETUP' } }),
      this.prisma.mf_customer_profiles.count({ where: { status: 'SUSPENDED' } }),
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

  private formatProfileResponse(profile: any) {
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
      subscription: profile.subscription ? {
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
      } : null,
      enabledFeatures: profile.enabledFeatures?.map((cf: any) => ({
        featureKey: cf.feature.featureKey,
        featureName: cf.feature.featureName,
        isEnabled: cf.isEnabled,
        version: cf.version || cf.feature.currentVersion,
      })) || [],
      users: profile.customerUsers || [],
      stats: profile._count ? {
        userCount: profile._count.customerUsers,
        bugReportCount: profile._count.bugReports,
        featureRequestCount: profile._count.featureRequests,
      } : null,
      internalNotes: profile.internalNotes,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private getPlanConfig(plan: SubscriptionPlan) {
    const configs = {
      STARTER: { basePrice: 29, perUserPrice: 10, includedUsers: 1, maxUsers: 3 },
      PROFESSIONAL: { basePrice: 79, perUserPrice: 8, includedUsers: 5, maxUsers: 15 },
      BUSINESS: { basePrice: 199, perUserPrice: 6, includedUsers: 15, maxUsers: 50 },
      ENTERPRISE: { basePrice: 499, perUserPrice: 5, includedUsers: 50, maxUsers: null },
      CUSTOM: { basePrice: 0, perUserPrice: 0, includedUsers: 1, maxUsers: null },
    };
    return configs[plan] || configs.STARTER;
  }

  private calculateNextBillingDate(cycle: BillingCycle): Date {
    const now = new Date();
    switch (cycle) {
      case BillingCycle.MONTHLY:
        return new Date(now.setMonth(now.getMonth() + 1));
      case BillingCycle.QUARTERLY:
        return new Date(now.setMonth(now.getMonth() + 3));
      case BillingCycle.YEARLY:
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }

  private async logActivity(
    profileId: string | null,
    action: string,
    description: string,
    actorType: string,
    actorId?: string,
    actorEmail?: string,
  ) {
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
}
