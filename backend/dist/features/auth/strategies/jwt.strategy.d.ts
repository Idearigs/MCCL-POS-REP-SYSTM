import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    tenantId: string;
    role: string;
    iat: number;
    exp: number;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prismaService;
    constructor(configService: ConfigService, prismaService: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        tenantId: string;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        tenant: {
            id: string;
            name: string;
            domain: string;
            subdomain: string;
            subscriptionPlan: string;
            status: import("@prisma/client").$Enums.TenantStatus;
        };
    }>;
}
export {};
