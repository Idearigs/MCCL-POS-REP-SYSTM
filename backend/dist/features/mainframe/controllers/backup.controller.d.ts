import type { Response } from 'express';
import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class BackupController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    exportTenant(tenantId: string, timestamp: string, signature: string, res: Response): Promise<void>;
    listTenants(timestamp: string, signature: string): Promise<{
        name: string;
        id: string;
        subdomain: string;
    }[]>;
}
