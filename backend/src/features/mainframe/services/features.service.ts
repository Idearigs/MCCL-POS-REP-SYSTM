import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class FeaturesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    featureKey: string;
    featureName: string;
    description?: string;
    category?: string;
    isIncludedInBase?: boolean;
    additionalCost?: number;
    dependsOn?: string[];
  }) {
    const existing = await this.prisma.mf_features.findUnique({
      where: { featureKey: data.featureKey },
    });

    if (existing) {
      throw new ConflictException('Feature key already exists');
    }

    return this.prisma.mf_features.create({
      data: {
        featureKey: data.featureKey,
        featureName: data.featureName,
        description: data.description,
        category: data.category,
        isIncludedInBase: data.isIncludedInBase ?? true,
        additionalCost: data.additionalCost || 0,
        dependsOn: data.dependsOn || [],
        status: 'STABLE',
        currentVersion: '1.0.0',
      },
    });
  }

  async findAll(options?: { category?: string; status?: string }) {
    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.mf_features.findMany({
      where,
      orderBy: [{ category: 'asc' }, { featureName: 'asc' }],
      include: {
        _count: {
          select: { customerFeatures: true, versions: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const feature = await this.prisma.mf_features.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        customerFeatures: {
          include: {
            customerProfile: {
              select: { businessName: true, subdomain: true },
            },
          },
          take: 20,
        },
      },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    return feature;
  }

  async update(
    id: string,
    data: {
      featureName?: string;
      description?: string;
      category?: string;
      isIncludedInBase?: boolean;
      additionalCost?: number;
      status?: string;
      isBeta?: boolean;
    },
  ) {
    return this.prisma.mf_features.update({
      where: { id },
      data: {
        ...data,
        status: data.status as any,
      },
    });
  }

  async createVersion(
    featureId: string,
    data: {
      version: string;
      versionType: string;
      releaseNotes?: string;
      changelog?: any;
    },
  ) {
    const feature = await this.prisma.mf_features.findUnique({
      where: { id: featureId },
    });

    if (!feature) {
      throw new NotFoundException('Feature not found');
    }

    // Create the version
    const newVersion = await this.prisma.mf_feature_versions.create({
      data: {
        featureId,
        version: data.version,
        versionType: data.versionType as any,
        releaseNotes: data.releaseNotes,
        changelog: data.changelog,
        previousVersionId: feature.currentVersion,
      },
    });

    // Update feature's current version if this is stable
    if (data.versionType === 'STABLE') {
      await this.prisma.mf_features.update({
        where: { id: featureId },
        data: { currentVersion: data.version },
      });
    } else if (data.versionType === 'BETA') {
      await this.prisma.mf_features.update({
        where: { id: featureId },
        data: { betaVersion: data.version, isBeta: true },
      });
    }

    return newVersion;
  }

  async deployVersion(featureId: string, versionId: string) {
    const version = await this.prisma.mf_feature_versions.findUnique({
      where: { id: versionId },
    });

    if (!version || version.featureId !== featureId) {
      throw new NotFoundException('Version not found');
    }

    await this.prisma.mf_feature_versions.update({
      where: { id: versionId },
      data: {
        deployedAt: new Date(),
        deployedBy: 'system', // Would use actual admin ID
      },
    });

    await this.prisma.mf_features.update({
      where: { id: featureId },
      data: { currentVersion: version.version },
    });

    return { success: true, version: version.version };
  }

  async getStats() {
    const [total, stable, beta, deprecated] = await Promise.all([
      this.prisma.mf_features.count(),
      this.prisma.mf_features.count({ where: { status: 'STABLE' } }),
      this.prisma.mf_features.count({ where: { status: 'BETA' } }),
      this.prisma.mf_features.count({ where: { status: 'DEPRECATED' } }),
    ]);

    const categories = await this.prisma.mf_features.groupBy({
      by: ['category'],
      _count: true,
    });

    return {
      total,
      stable,
      beta,
      deprecated,
      byCategory: categories,
    };
  }

  async seedDefaultFeatures() {
    const defaultFeatures = [
      {
        featureKey: 'pos',
        featureName: 'Point of Sale',
        category: 'Core',
        description: 'Main POS terminal for sales',
      },
      {
        featureKey: 'inventory',
        featureName: 'Inventory Management',
        category: 'Core',
        description: 'Product and stock management',
      },
      {
        featureKey: 'customers',
        featureName: 'Customer Management',
        category: 'Core',
        description: 'Customer database and history',
      },
      {
        featureKey: 'repairs',
        featureName: 'Repair Management',
        category: 'Services',
        description: 'Repair job tracking',
      },
      {
        featureKey: 'sales-reports',
        featureName: 'Sales Reports',
        category: 'Reports',
        description: 'Sales analytics and reports',
      },
      {
        featureKey: 'calendar',
        featureName: 'Calendar',
        category: 'Tools',
        description: 'Appointments and scheduling',
      },
      {
        featureKey: 'dashboard',
        featureName: 'Dashboard',
        category: 'Core',
        description: 'Business overview dashboard',
      },
      {
        featureKey: 'gold-rate',
        featureName: 'Gold Rate Tracker',
        category: 'Tools',
        description: 'Live gold price tracking',
      },
      {
        featureKey: 'layaway',
        featureName: 'Layaway Plans',
        category: 'Sales',
        description: 'Payment plan management',
      },
      {
        featureKey: 'trade-in',
        featureName: 'Trade-In',
        category: 'Sales',
        description: 'Trade-in value calculator',
      },
      {
        featureKey: 'stock-take',
        featureName: 'Stock Taking',
        category: 'Inventory',
        description: 'Stock audit functionality',
      },
      {
        featureKey: 'float-management',
        featureName: 'Float Management',
        category: 'Finance',
        description: 'Cash drawer management',
      },
      {
        featureKey: 'shifts',
        featureName: 'Shift Management',
        category: 'Operations',
        description: 'Staff shift tracking',
      },
      {
        featureKey: 'petty-cash',
        featureName: 'Petty Cash',
        category: 'Finance',
        description: 'Petty cash tracking',
      },
      {
        featureKey: 'financial-reports',
        featureName: 'Financial Reports',
        category: 'Reports',
        description: 'Financial analytics',
        isIncludedInBase: false,
        additionalCost: 20,
      },
      {
        featureKey: 'ai-insights',
        featureName: 'AI Business Insights',
        category: 'Premium',
        description: 'AI-powered recommendations',
        isIncludedInBase: false,
        additionalCost: 50,
      },
    ];

    for (const feature of defaultFeatures) {
      await this.prisma.mf_features.upsert({
        where: { featureKey: feature.featureKey },
        update: {},
        create: {
          ...feature,
          isIncludedInBase: feature.isIncludedInBase ?? true,
          additionalCost: feature.additionalCost || 0,
          status: 'STABLE',
          currentVersion: '1.0.0',
        },
      });
    }

    return { success: true, count: defaultFeatures.length };
  }
}
