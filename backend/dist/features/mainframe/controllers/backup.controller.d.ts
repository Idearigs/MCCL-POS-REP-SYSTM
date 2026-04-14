import type { Response } from 'express';
import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class BackupController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private checkKey;
    exportTenant(tenantId: string, key: string, res: Response): Promise<void>;
    listTenants(key: string): Promise<{
        id: string;
        name: string;
        subdomain: string;
    }[]>;
}
