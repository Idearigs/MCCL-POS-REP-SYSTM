import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class FeaturesService {
    private prisma;
    private config;
    private readonly mainframeUrl;
    private readonly internalKey;
    constructor(prisma: PrismaService, config: ConfigService);
    getTenantFeatures(tenantIdOrSubdomain: string): Promise<{
        features: string[];
        _source?: string;
    }>;
    create(data: {
        featureKey: string;
        featureName: string;
        description?: string;
        category?: string;
        isIncludedInBase?: boolean;
        additionalCost?: number;
        dependsOn?: string[];
    }): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.FeatureStatus;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        featureKey: string;
        featureName: string;
        currentVersion: string;
        betaVersion: string | null;
        isIncludedInBase: boolean;
        additionalCost: import("@prisma/client/runtime/library").Decimal | null;
        dependsOn: string[];
        isEnabled: boolean;
        isBeta: boolean;
        requiresSetup: boolean;
    }>;
    findAll(options?: {
        category?: string;
        status?: string;
    }): Promise<({
        _count: {
            customerFeatures: number;
            versions: number;
        };
    } & {
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.FeatureStatus;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        featureKey: string;
        featureName: string;
        currentVersion: string;
        betaVersion: string | null;
        isIncludedInBase: boolean;
        additionalCost: import("@prisma/client/runtime/library").Decimal | null;
        dependsOn: string[];
        isEnabled: boolean;
        isBeta: boolean;
        requiresSetup: boolean;
    })[]>;
    findOne(id: string): Promise<{
        customerFeatures: ({
            customerProfile: {
                subdomain: string;
                businessName: string;
            };
        } & {
            id: string;
            version: string | null;
            customerProfileId: string;
            isEnabled: boolean;
            config: import("@prisma/client/runtime/library").JsonValue | null;
            lastUsedAt: Date | null;
            usageCount: number;
            enabledAt: Date;
            disabledAt: Date | null;
            featureId: string;
        })[];
        versions: {
            id: string;
            createdAt: Date;
            version: string;
            featureId: string;
            versionType: import("@prisma/client").$Enums.FeatureStatus;
            releaseNotes: string | null;
            changelog: import("@prisma/client/runtime/library").JsonValue | null;
            deployedAt: Date | null;
            deployedBy: string | null;
            canRollback: boolean;
            previousVersionId: string | null;
        }[];
    } & {
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.FeatureStatus;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        featureKey: string;
        featureName: string;
        currentVersion: string;
        betaVersion: string | null;
        isIncludedInBase: boolean;
        additionalCost: import("@prisma/client/runtime/library").Decimal | null;
        dependsOn: string[];
        isEnabled: boolean;
        isBeta: boolean;
        requiresSetup: boolean;
    }>;
    update(id: string, data: {
        featureName?: string;
        description?: string;
        category?: string;
        isIncludedInBase?: boolean;
        additionalCost?: number;
        status?: string;
        isBeta?: boolean;
    }): Promise<{
        description: string | null;
        id: string;
        status: import("@prisma/client").$Enums.FeatureStatus;
        createdAt: Date;
        updatedAt: Date;
        category: string | null;
        featureKey: string;
        featureName: string;
        currentVersion: string;
        betaVersion: string | null;
        isIncludedInBase: boolean;
        additionalCost: import("@prisma/client/runtime/library").Decimal | null;
        dependsOn: string[];
        isEnabled: boolean;
        isBeta: boolean;
        requiresSetup: boolean;
    }>;
    createVersion(featureId: string, data: {
        version: string;
        versionType: string;
        releaseNotes?: string;
        changelog?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        version: string;
        featureId: string;
        versionType: import("@prisma/client").$Enums.FeatureStatus;
        releaseNotes: string | null;
        changelog: import("@prisma/client/runtime/library").JsonValue | null;
        deployedAt: Date | null;
        deployedBy: string | null;
        canRollback: boolean;
        previousVersionId: string | null;
    }>;
    deployVersion(featureId: string, versionId: string): Promise<{
        success: boolean;
        version: string;
    }>;
    getStats(): Promise<{
        total: number;
        stable: number;
        beta: number;
        deprecated: number;
        byCategory: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.Mf_featuresGroupByOutputType, "category"[]> & {
            _count: number;
        })[];
    }>;
    seedDefaultFeatures(): Promise<{
        success: boolean;
        count: number;
    }>;
}
