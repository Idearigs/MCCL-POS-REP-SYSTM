import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class BugReportsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    customerProfileId?: string;
    title: string;
    description: string;
    priority?: string;
    featureKey?: string;
    affectedVersion?: string;
    browser?: string;
    os?: string;
    deviceType?: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    screenshots?: string[];
    errorLogs?: string;
    errorStackTrace?: string;
    userAgent?: string;
    pageUrl?: string;
  }) {
    return this.prisma.mf_bug_reports.create({
      data: {
        customerProfileId: data.customerProfileId,
        title: data.title,
        description: data.description,
        priority: (data.priority || 'MEDIUM') as any,
        status: 'OPEN',
        featureKey: data.featureKey,
        affectedVersion: data.affectedVersion,
        browser: data.browser,
        os: data.os,
        deviceType: data.deviceType,
        stepsToReproduce: data.stepsToReproduce,
        expectedBehavior: data.expectedBehavior,
        actualBehavior: data.actualBehavior,
        screenshots: data.screenshots || [],
        errorLogs: data.errorLogs,
        errorStackTrace: data.errorStackTrace,
        userAgent: data.userAgent,
        pageUrl: data.pageUrl,
      },
      include: {
        customerProfile: {
          select: { businessName: true, subdomain: true },
        },
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    featureKey?: string;
    customerProfileId?: string;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.status) where.status = options.status;
    if (options?.priority) where.priority = options.priority;
    if (options?.featureKey) where.featureKey = options.featureKey;
    if (options?.customerProfileId)
      where.customerProfileId = options.customerProfileId;

    const [bugs, total] = await Promise.all([
      this.prisma.mf_bug_reports.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'asc' }, { reportedAt: 'desc' }],
        include: {
          customerProfile: {
            select: { businessName: true, subdomain: true },
          },
        },
      }),
      this.prisma.mf_bug_reports.count({ where }),
    ]);

    return {
      data: bugs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const bug = await this.prisma.mf_bug_reports.findUnique({
      where: { id },
      include: {
        customerProfile: {
          select: { businessName: true, subdomain: true, contactEmail: true },
        },
      },
    });

    if (!bug) {
      throw new NotFoundException('Bug report not found');
    }

    return bug;
  }

  async update(
    id: string,
    data: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      resolution?: string;
      fixedInVersion?: string;
    },
  ) {
    const existing = await this.prisma.mf_bug_reports.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Bug report not found');
    }

    return this.prisma.mf_bug_reports.update({
      where: { id },
      data: {
        status: data.status as any,
        priority: data.priority as any,
        assignedTo: data.assignedTo,
        resolution: data.resolution,
        fixedInVersion: data.fixedInVersion,
        resolvedAt:
          data.status === 'RESOLVED' || data.status === 'CLOSED'
            ? new Date()
            : undefined,
      },
    });
  }

  async getStats() {
    const [total, open, inProgress, resolved, critical, high] =
      await Promise.all([
        this.prisma.mf_bug_reports.count(),
        this.prisma.mf_bug_reports.count({ where: { status: 'OPEN' } }),
        this.prisma.mf_bug_reports.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.mf_bug_reports.count({
          where: { status: { in: ['RESOLVED', 'CLOSED'] } },
        }),
        this.prisma.mf_bug_reports.count({ where: { priority: 'CRITICAL' } }),
        this.prisma.mf_bug_reports.count({ where: { priority: 'HIGH' } }),
      ]);

    const byFeature = await this.prisma.mf_bug_reports.groupBy({
      by: ['featureKey'],
      _count: true,
      where: { featureKey: { not: null } },
    });

    return {
      total,
      open,
      inProgress,
      resolved,
      critical,
      high,
      byFeature,
    };
  }
}
