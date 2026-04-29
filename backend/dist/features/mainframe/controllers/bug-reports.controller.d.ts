import { BugReportsService } from '../services/bug-reports.service';
export declare class BugReportsController {
    private readonly bugReportsService;
    constructor(bugReportsService: BugReportsService);
    create(data: {
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
    }): Promise<any>;
    findAll(page?: string, limit?: string, status?: string, priority?: string, featureKey?: string, customerProfileId?: string): Promise<{
        data: ({
            customerProfile: {
                subdomain: string;
                businessName: string;
            };
        } & {
            description: string;
            title: string;
            id: string;
            status: import("@prisma/client").$Enums.BugStatus;
            updatedAt: Date;
            priority: import("@prisma/client").$Enums.BugPriority;
            customerProfileId: string | null;
            userAgent: string | null;
            featureKey: string | null;
            affectedVersion: string | null;
            browser: string | null;
            os: string | null;
            deviceType: string | null;
            stepsToReproduce: string | null;
            expectedBehavior: string | null;
            actualBehavior: string | null;
            screenshots: string[];
            errorLogs: string | null;
            assignedTo: string | null;
            resolvedAt: Date | null;
            resolution: string | null;
            fixedInVersion: string | null;
            errorStackTrace: string | null;
            pageUrl: string | null;
            reportedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStats(): Promise<{
        total: number;
        open: number;
        inProgress: number;
        resolved: number;
        critical: number;
        high: number;
        byFeature: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.Mf_bug_reportsGroupByOutputType, "featureKey"[]> & {
            _count: number;
        })[];
    }>;
    findOne(id: string): Promise<{
        customerProfile: {
            subdomain: string;
            businessName: string;
            contactEmail: string;
        };
    } & {
        description: string;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.BugStatus;
        updatedAt: Date;
        priority: import("@prisma/client").$Enums.BugPriority;
        customerProfileId: string | null;
        userAgent: string | null;
        featureKey: string | null;
        affectedVersion: string | null;
        browser: string | null;
        os: string | null;
        deviceType: string | null;
        stepsToReproduce: string | null;
        expectedBehavior: string | null;
        actualBehavior: string | null;
        screenshots: string[];
        errorLogs: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
        resolution: string | null;
        fixedInVersion: string | null;
        errorStackTrace: string | null;
        pageUrl: string | null;
        reportedAt: Date;
    }>;
    update(id: string, data: {
        status?: string;
        priority?: string;
        assignedTo?: string;
        resolution?: string;
        fixedInVersion?: string;
    }): Promise<{
        description: string;
        title: string;
        id: string;
        status: import("@prisma/client").$Enums.BugStatus;
        updatedAt: Date;
        priority: import("@prisma/client").$Enums.BugPriority;
        customerProfileId: string | null;
        userAgent: string | null;
        featureKey: string | null;
        affectedVersion: string | null;
        browser: string | null;
        os: string | null;
        deviceType: string | null;
        stepsToReproduce: string | null;
        expectedBehavior: string | null;
        actualBehavior: string | null;
        screenshots: string[];
        errorLogs: string | null;
        assignedTo: string | null;
        resolvedAt: Date | null;
        resolution: string | null;
        fixedInVersion: string | null;
        errorStackTrace: string | null;
        pageUrl: string | null;
        reportedAt: Date;
    }>;
}
