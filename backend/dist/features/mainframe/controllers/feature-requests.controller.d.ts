import { FeatureRequestsService } from '../services/feature-requests.service';
export declare class FeatureRequestsController {
    private readonly featureRequestsService;
    constructor(featureRequestsService: FeatureRequestsService);
    create(req: {
        user?: {
            tenantId?: string;
        };
    }, data: {
        customerProfileId?: string;
        title: string;
        description: string;
        priority?: string;
        targetFeatureKey?: string;
    }): Promise<any>;
    findAll(page?: string, limit?: string, status?: string): Promise<{
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
    update(id: string, data: any): Promise<{
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
