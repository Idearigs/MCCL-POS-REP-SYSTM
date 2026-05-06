import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { generateId } from '../../../shared/utils/id-generator';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {}

  async provisionTenant(data: {
    tenantId: string;
    businessName: string;
    subdomain: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPassword: string;
  }): Promise<{ tenantId: string; userId: string }> {
    const saltRounds = parseInt(
      this.configService.get('HASH_SALT_ROUNDS', '12'),
      10,
    );
    const hashedPassword = await bcrypt.hash(data.ownerPassword, saltRounds);
    const ownerEmail = data.ownerEmail.toLowerCase();

    await this.prismaService.tenants.upsert({
      where: { id: data.tenantId },
      update: {
        name: data.businessName,
        subdomain: data.subdomain.toLowerCase(),
        domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      create: {
        id: data.tenantId,
        name: data.businessName,
        subdomain: data.subdomain.toLowerCase(),
        domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
        status: 'ACTIVE',
        subscriptionPlan: 'basic',
        updatedAt: new Date(),
      },
    });

    const existingUser = await this.prismaService.users.findFirst({
      where: { email: ownerEmail, tenantId: data.tenantId },
    });

    let userId: string;
    if (existingUser) {
      await this.prismaService.users.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      userId = existingUser.id;
    } else {
      userId = generateId();
      await this.prismaService.users.create({
        data: {
          id: userId,
          email: ownerEmail,
          password: hashedPassword,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          role: 'OWNER',
          tenantId: data.tenantId,
          updatedAt: new Date(),
        } as any,
      });
    }

    await this.seedDefaultCategories(data.tenantId);

    this.logger.log(
      `Tenant provisioned: ${data.tenantId} (${data.businessName})`,
    );
    return { tenantId: data.tenantId, userId };
  }

  async seedDefaultCategories(tenantId: string): Promise<void> {
    const DEFAULT_CATEGORIES = [
      'Rings',
      'Necklaces',
      'Bracelets',
      'Earrings',
      'Pendants',
      'Watches',
      'Chains',
      'Other',
    ];

    const existing = await this.prismaService.categories.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    const toCreate = DEFAULT_CATEGORIES.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (toCreate.length > 0) {
      for (const name of toCreate) {
        await this.prismaService.categories.create({
          data: {
            id: generateId(),
            name,
            tenantId,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }
      this.logger.log(
        `Seeded ${toCreate.length} categories for tenant ${tenantId}`,
      );
    }
  }

  async updateTenantStatus(data: {
    subdomain: string;
    status:
      | 'ACTIVE'
      | 'PAYMENT_DUE'
      | 'PAYMENT_WARNING'
      | 'SUSPENDED'
      | 'INACTIVE';
    suspendedReason?: string;
    billingDueDate?: string;
  }): Promise<{ tenantId: string; status: string }> {
    const tenant = await this.prismaService.tenants.findUnique({
      where: { subdomain: data.subdomain.toLowerCase() },
    });

    if (!tenant) {
      throw new Error(`Tenant with subdomain '${data.subdomain}' not found`);
    }

    const updateData: any = { status: data.status, updatedAt: new Date() };

    if (data.status === 'SUSPENDED') {
      updateData.suspendedAt = new Date();
      updateData.suspendedReason = data.suspendedReason || 'MANUAL';
    }
    if (data.status === 'ACTIVE') {
      updateData.suspendedAt = null;
      updateData.suspendedReason = null;
    }
    if (data.billingDueDate) {
      updateData.billingDueDate = new Date(data.billingDueDate);
    }

    const updated = await this.prismaService.tenants.update({
      where: { id: tenant.id },
      data: updateData,
    });

    this.logger.log(
      `Tenant ${data.subdomain} status updated to ${data.status}` +
        ` (reason: ${data.suspendedReason || 'none'})`,
    );

    return { tenantId: updated.id, status: updated.status };
  }

  // ── QZ Tray per-tenant config ─────────────────────────────────────────────

  async getQzConfig(
    tenantId: string,
  ): Promise<{ certificate: string; privateKey: string }> {
    const tenant = await this.prismaService.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    return {
      certificate: (settings['qzCertificate'] as string) ?? '',
      privateKey: (settings['qzPrivateKey'] as string) ?? '',
    };
  }

  async saveQzConfig(
    tenantId: string,
    certificate: string,
    privateKey: string,
  ): Promise<void> {
    const tenant = await this.prismaService.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings ?? {}) as Record<string, unknown>;
    await this.prismaService.tenants.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...existing,
          qzCertificate: certificate,
          qzPrivateKey: privateKey,
        },
        updatedAt: new Date(),
      },
    });
  }
}
