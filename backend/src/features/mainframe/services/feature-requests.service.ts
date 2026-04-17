import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { buildHmacHeaders } from '../../../shared/utils/hmac-build';

@Injectable()
export class FeatureRequestsService {
  private readonly logger = new Logger(FeatureRequestsService.name);
  private readonly mainframeUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.mainframeUrl =
      this.config.get<string>('MAINFRAME_BACKEND_URL') ||
      'http://localhost:3001/api/v1';
  }

  async create(data: {
    customerProfileId?: string;
    tenantId?: string;
    title: string;
    description: string;
    priority?: string;
    targetFeatureKey?: string;
  }) {
    // Resolve customerProfileId from tenantId so the request is linked to the tenant
    let customerProfileId = data.customerProfileId;
    if (!customerProfileId && data.tenantId) {
      try {
        const tenant = await this.prisma.tenants.findUnique({
          where: { id: data.tenantId },
          select: { subdomain: true },
        });
        if (tenant?.subdomain) {
          const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { subdomain: tenant.subdomain },
            select: { id: true },
          });
          customerProfileId = profile?.id;
        }
      } catch {
        /* non-critical — request still goes through without tenant link */
      }
    }

    // Forward to mainframe backend so it appears in the admin dashboard
    try {
      const payload = { ...data, customerProfileId, priority: data.priority || 'MEDIUM' };
      const bodyStr = JSON.stringify(payload);
      const { data: created } = await axios.post(
        `${this.mainframeUrl}/mainframe/feature-requests`,
        bodyStr,
        {
          headers: {
            'Content-Type': 'application/json',
            ...buildHmacHeaders(bodyStr),
          },
          timeout: 8000,
        },
      );
      return created;
    } catch (err: any) {
      this.logger.error(
        '[FeatureRequests] Failed to forward to mainframe, storing locally:',
        err?.message,
      );
      return this.prisma.mf_feature_requests.create({
        data: {
          customerProfileId,
          title: data.title,
          description: data.description,
          priority: (data.priority || 'MEDIUM') as any,
          status: 'SUBMITTED',
          targetFeatureKey: data.targetFeatureKey,
        },
      });
    }
  }

  async findAll(options?: { page?: number; limit?: number; status?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.status) where.status = options.status;

    const [requests, total] = await Promise.all([
      this.prisma.mf_feature_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ votes: 'desc' }, { createdAt: 'desc' }],
        include: {
          customerProfile: { select: { businessName: true } },
        },
      }),
      this.prisma.mf_feature_requests.count({ where }),
    ]);

    return { data: requests, meta: { total, page, limit } };
  }

  async findOne(id: string) {
    const request = await this.prisma.mf_feature_requests.findUnique({
      where: { id },
      include: {
        customerProfile: { select: { businessName: true, subdomain: true } },
      },
    });
    if (!request) throw new NotFoundException('Feature request not found');
    return request;
  }

  async update(
    id: string,
    data: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      estimatedEffort?: string;
      targetVersion?: string;
      rejectionReason?: string;
    },
  ) {
    return this.prisma.mf_feature_requests.update({
      where: { id },
      data: {
        status: data.status as any,
        priority: data.priority as any,
        assignedTo: data.assignedTo,
        estimatedEffort: data.estimatedEffort,
        targetVersion: data.targetVersion,
        rejectionReason: data.rejectionReason,
        implementedAt: data.status === 'RELEASED' ? new Date() : undefined,
      },
    });
  }

  async vote(id: string, profileId: string) {
    const request = await this.prisma.mf_feature_requests.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Feature request not found');

    const votedBy = request.votedBy || [];
    if (votedBy.includes(profileId)) return request;

    return this.prisma.mf_feature_requests.update({
      where: { id },
      data: { votes: { increment: 1 }, votedBy: [...votedBy, profileId] },
    });
  }
}
