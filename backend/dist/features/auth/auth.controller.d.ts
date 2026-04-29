import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { type TenantInfo } from '../../shared/decorators/tenant.decorator';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, AuthResponseDto } from './dto/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, tenant: TenantInfo): Promise<AuthResponseDto>;
    register(registerDto: RegisterDto, tenant: TenantInfo): Promise<AuthResponseDto>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    logout(userId: string): Promise<void>;
    getMe(user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        tenantId: string;
        tenants: unknown;
        lastLogin?: Date;
    }): {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        tenantId: string;
        tenant: unknown;
        lastLogin: Date;
    };
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void>;
    getUsers(tenant: TenantInfo, role?: string, isActive?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserById(tenant: TenantInfo, id: string): Promise<unknown>;
    updateUser(tenant: TenantInfo, id: string, updateData: Record<string, unknown>): Promise<unknown>;
    resetUserPassword(tenant: TenantInfo, id: string, body: {
        password: string;
    }): Promise<void>;
    deleteUser(tenant: TenantInfo, id: string): Promise<void>;
    provisionTenant(timestamp: string, signature: string, req: RawBodyRequest<ExpressRequest>, body: {
        tenantId: string;
        businessName: string;
        subdomain: string;
        ownerEmail: string;
        ownerFirstName: string;
        ownerLastName: string;
        ownerPassword: string;
    }): Promise<{
        tenantId: string;
        userId: string;
    }>;
    updateTenantStatus(timestamp: string, signature: string, req: RawBodyRequest<ExpressRequest>, body: {
        subdomain: string;
        status: 'ACTIVE' | 'PAYMENT_DUE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE';
        suspendedReason?: string;
        billingDueDate?: string;
    }): Promise<{
        tenantId: string;
        status: string;
    }>;
    health(): {
        status: string;
        service: string;
        timestamp: string;
    };
}
