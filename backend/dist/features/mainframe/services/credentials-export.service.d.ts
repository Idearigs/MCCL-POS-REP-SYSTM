import { PrismaService } from '../../../core/prisma/prisma.service';
export interface CredentialsDocument {
    businessName: string;
    subdomain: string;
    fullDomain: string;
    adminEmail: string;
    adminPassword: string;
    users: {
        email: string;
        password: string;
        role: string;
    }[];
    features: string[];
    subscription: {
        plan: string;
        billingCycle: string;
        nextBillingDate: string;
    };
    createdAt: string;
}
export declare class CredentialsExportService {
    private prisma;
    constructor(prisma: PrismaService);
    generateCredentialsDocument(profileId: string): Promise<CredentialsDocument>;
    generateHtmlDocument(profileId: string): Promise<string>;
    generateSecurePassword(length?: number): string;
    createUserWithCredentials(profileId: string, email: string, firstName: string, lastName: string, role?: string): Promise<{
        user: {
            email: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            permissions: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            phone: string | null;
            customerProfileId: string;
            passwordHash: string;
            passwordSalt: string | null;
            tempPassword: string | null;
            mustChangePassword: boolean;
            lastLoginAt: Date | null;
            loginAttempts: number;
            lockedUntil: Date | null;
        };
        tempPassword: string;
    }>;
    private hashPassword;
}
