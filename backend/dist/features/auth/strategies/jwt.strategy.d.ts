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
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private prismaService;
    constructor(configService: ConfigService, prismaService: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        role: any;
        tenantId: any;
        permissions: any;
        tenant: any;
    }>;
}
export {};
