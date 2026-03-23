import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
export declare class TenantGuard implements CanActivate {
    private prismaService;
    private readonly logger;
    constructor(prismaService: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
