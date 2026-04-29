import { LoginDto, RegisterDto, AuthResponseDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { AuthCoreService } from './services/auth-core.service';
import { UserManagementService } from './services/user-management.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
export declare class AuthService {
    private authCore;
    private userManagement;
    private tenantProvisioning;
    constructor(authCore: AuthCoreService, userManagement: UserManagementService, tenantProvisioning: TenantProvisioningService);
    login(loginDto: LoginDto, tenantId: string): Promise<AuthResponseDto>;
    register(registerDto: RegisterDto, tenantId: string): Promise<AuthResponseDto>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    logout(userId: string): Promise<void>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void>;
    getUsers(tenantId: string, role?: string, isActive?: boolean, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserById(tenantId: string, userId: string): Promise<any>;
    updateUser(tenantId: string, userId: string, updateData: any): Promise<any>;
    resetUserPassword(tenantId: string, userId: string, newPassword: string): Promise<void>;
    deleteUser(tenantId: string, userId: string): Promise<void>;
    provisionTenant(data: {
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
    seedDefaultCategories(tenantId: string): Promise<void>;
    updateTenantStatus(data: {
        subdomain: string;
        status: 'ACTIVE' | 'PAYMENT_DUE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE';
        suspendedReason?: string;
        billingDueDate?: string;
    }): Promise<{
        tenantId: string;
        status: string;
    }>;
}
