import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { Request } from 'express';
declare const JwtRefreshStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    private configService;
    private prismaService;
    constructor(configService: ConfigService, prismaService: PrismaService);
    validate(req: Request, payload: any): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        tenantId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        tenant: {
            name: string;
            id: string;
            domain: string;
            subdomain: string;
            subscriptionPlan: string;
            status: import("@prisma/client").$Enums.TenantStatus;
            suspendedReason: string;
        };
    }>;
}
export {};
