import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { buildHmacHeaders } from '../../../shared/utils/hmac-build';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);
  private readonly mainframeUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.mainframeUrl =
      this.config.get<string>('MAINFRAME_BACKEND_URL') ||
      'http://localhost:3001/api/v1';
  }

  /** Called by the POS frontend on login to know which features are enabled for this tenant.
   *  The x-tenant-id header may contain either the subdomain (e.g. "buymejewellery") or
   *  the internal tenant CUID (e.g. "cmgjqfaxy0000o72w07x7d1yk"). The mainframe always
   *  expects the subdomain, so we resolve it from the tenants table first. */
  async getTenantFeatures(
    tenantIdOrSubdomain: string,
  ): Promise<{ features: string[]; _source?: string; betaExpiresAt?: string | null; isBetaTester?: boolean }> {
    // Resolve the real subdomain — look up the tenant by its internal ID first.
    // If not found (already a subdomain), use the value as-is.
    let subdomain = tenantIdOrSubdomain;
    try {
      const tenant = await this.prisma.tenants.findUnique({
        where: { id: tenantIdOrSubdomain },
        select: { subdomain: true },
      });
      if (tenant?.subdomain) subdomain = tenant.subdomain;
    } catch {
      // Not found or error — fall through and use original value
    }

    const url = `${this.mainframeUrl}/mainframe/tenant-features/${subdomain}`;
    try {
      const { data } = await axios.get<{ features: string[]; betaExpiresAt?: string | null; isBetaTester?: boolean }>(url, {
        headers: { ...buildHmacHeaders('') },
        timeout: 5000,
      });
      return { ...data, _source: 'mainframe' };
    } catch (err: unknown) {
      const errObj = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = errObj?.response?.status;
      const message =
        errObj?.response?.data?.message || errObj?.message || 'unknown';
      this.logger.error(
        `[FeaturesService] getTenantFeatures FAILED for "${subdomain}" → ${url} → ${status ?? 'no-response'}: ${message}`,
      );
      // Fail open — frontend will show all features when mainframe is unreachable
      return { features: [], _source: 'error' };
    }
  }

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
      // Core features — always on, included in base plan
      {
        featureKey: 'pos',
        featureName: 'Point of Sale',
        category: 'Core',
        description: 'Main POS terminal for sales and transactions',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      {
        featureKey: 'inventory',
        featureName: 'Inventory Management',
        category: 'Core',
        description: 'Product and stock management',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      {
        featureKey: 'customers',
        featureName: 'Customer Management',
        category: 'Core',
        description: 'Customer database and history',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      {
        featureKey: 'sales',
        featureName: 'Sales & Transactions',
        category: 'Core',
        description: 'Sales processing and reporting',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      {
        featureKey: 'repairs',
        featureName: 'Repair Management',
        category: 'Core',
        description: 'Repair job tracking and management',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      {
        featureKey: 'cashiers',
        featureName: 'Staff & Cashiers',
        category: 'Core',
        description: 'Staff and cashier management',
        isIncludedInBase: true,
        additionalCost: 0,
      },
      // Standard features — Professional plan+
      {
        featureKey: 'shifts',
        featureName: 'Shift Management',
        category: 'Standard',
        description: 'Staff shift tracking and handover',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'float_management',
        featureName: 'Float Management',
        category: 'Standard',
        description: 'Cash drawer float management',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'petty_cash',
        featureName: 'Petty Cash',
        category: 'Standard',
        description: 'Petty cash tracking and management',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'stock_taking',
        featureName: 'Stock Taking',
        category: 'Standard',
        description: 'Stock audit and reconciliation',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'calendar',
        featureName: 'Calendar',
        category: 'Standard',
        description: 'Appointments and scheduling',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'tasks',
        featureName: 'Tasks',
        category: 'Standard',
        description: 'Task and workflow management',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      {
        featureKey: 'history',
        featureName: 'Transaction History',
        category: 'Standard',
        description: 'Full transaction history and audit trail',
        isIncludedInBase: false,
        additionalCost: 0,
      },
      // Premium features — Business plan+
      {
        featureKey: 'financial_intelligence',
        featureName: 'Financial Intelligence',
        category: 'Premium',
        description: 'Advanced financial analytics and reporting',
        isIncludedInBase: false,
        additionalCost: 20,
      },
      {
        featureKey: 'chatbot',
        featureName: 'AI Business Insights',
        category: 'Premium',
        description: 'AI-powered business insights and recommendations',
        isIncludedInBase: false,
        additionalCost: 20,
      },
      {
        featureKey: 'google_drive',
        featureName: 'Google Drive Integration',
        category: 'Premium',
        description: 'Cloud storage and document management',
        isIncludedInBase: false,
        additionalCost: 20,
      },
    ];

    for (const feature of defaultFeatures) {
      await this.prisma.mf_features.upsert({
        where: { featureKey: feature.featureKey },
        update: {
          featureName: feature.featureName,
          category: feature.category,
          description: feature.description,
          isIncludedInBase: feature.isIncludedInBase,
          additionalCost: feature.additionalCost,
        },
        create: {
          featureKey: feature.featureKey,
          featureName: feature.featureName,
          category: feature.category,
          description: feature.description,
          isIncludedInBase: feature.isIncludedInBase,
          additionalCost: feature.additionalCost,
          isEnabled: true,
          status: 'STABLE',
          currentVersion: '1.0.0',
          dependsOn: [],
        },
      });
    }

    return { success: true, count: defaultFeatures.length };
  }
}
