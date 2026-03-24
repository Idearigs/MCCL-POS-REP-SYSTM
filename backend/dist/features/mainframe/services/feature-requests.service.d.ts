import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class FeatureRequestsService {
    private prisma;
    private config;
    private readonly mainframeUrl;
    private readonly internalKey;
    constructor(prisma: PrismaService, config: ConfigService);
    create(data: {
        customerProfileId?: string;
        tenantId?: string;
        title: string;
        description: string;
        priority?: string;
        targetFeatureKey?: string;
    }): Promise<any>;
    findAll(options?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        data: ({
            customerProfile: {
                businessName: string;
            };
        } & {
            description: string;
            title: string;
            id: string;
            status: import("@prisma/client").$Enums.FeatureRequestStatus;
            createdAt: Date;
            updatedAt: Date;
            priority: import("@prisma/client").$Enums.BugPriority;
            rejectionReason: string | null;
            customerProfileId: string | null;
            assignedTo: string | null;
            votes: number;
            votedBy: string[];
            targetVersion: string | null;
            targetFeatureKey: string | null;
            estimatedEffort: string | null;
            implementedAt: Date | null;
            implementedInVersion: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    findOne(id: string): Promise<{
        customerProfile: {
            subdomain: string;
            businessName: string;
        };
    } & {
        description: string;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.FeatureRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        priority: import("@prisma/client").$Enums.BugPriority;
        rejectionReason: string | null;
        customerProfileId: string | null;
        assignedTo: string | null;
        votes: number;
        votedBy: string[];
        targetVersion: string | null;
        targetFeatureKey: string | null;
        estimatedEffort: string | null;
        implementedAt: Date | null;
        implementedInVersion: string | null;
    }>;
    update(id: string, data: {
        status?: string;
        priority?: string;
        assignedTo?: string;
        estimatedEffort?: string;
        targetVersion?: string;
        rejectionReason?: string;
    }): Promise<{
        description: string;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.FeatureRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        priority: import("@prisma/client").$Enums.BugPriority;
        rejectionReason: string | null;
        customerProfileId: string | null;
        assignedTo: string | null;
        votes: number;
        votedBy: string[];
        targetVersion: string | null;
        targetFeatureKey: string | null;
        estimatedEffort: string | null;
        implementedAt: Date | null;
        implementedInVersion: string | null;
    }>;
    vote(id: string, profileId: string): Promise<{
        description: string;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.FeatureRequestStatus;
        createdAt: Date;
        updatedAt: Date;
        priority: import("@prisma/client").$Enums.BugPriority;
        rejectionReason: string | null;
        customerProfileId: string | null;
        assignedTo: string | null;
        votes: number;
        votedBy: string[];
        targetVersion: string | null;
        targetFeatureKey: string | null;
        estimatedEffort: string | null;
        implementedAt: Date | null;
        implementedInVersion: string | null;
    }>;
}
