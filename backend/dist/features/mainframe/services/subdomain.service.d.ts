import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class SubdomainService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    provisionSubdomain(profileId: string, subdomain: string): Promise<void>;
    private createCustomerDatabase;
    private runMigrations;
    private seedInitialData;
    private generateConnectionString;
    isSubdomainAvailable(subdomain: string): Promise<boolean>;
    validateSubdomainFormat(subdomain: string): {
        valid: boolean;
        error?: string;
    };
    suggestSubdomains(businessName: string): Promise<string[]>;
    deprovisionSubdomain(profileId: string): Promise<void>;
}
