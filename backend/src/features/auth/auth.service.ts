/**
 * AuthService — thin façade that delegates to the three focused sub-services.
 *
 * Splitting rationale:
 *   AuthCoreService         — JWT auth lifecycle (login/register/refresh/logout)
 *   UserManagementService   — cashier/staff CRUD
 *   TenantProvisioningService — tenant lifecycle & status sync from Mainframe
 *
 * The façade is kept so that existing consumers (AuthController, AuthModule
 * exports) need no changes while each sub-service remains independently
 * injectable and unit-testable.
 */
import { Injectable } from '@nestjs/common';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { AuthCoreService } from './services/auth-core.service';
import { UserManagementService } from './services/user-management.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';

@Injectable()
export class AuthService {
  constructor(
    private authCore: AuthCoreService,
    private userManagement: UserManagementService,
    private tenantProvisioning: TenantProvisioningService,
  ) {}

  // ── Auth core ──────────────────────────────────────────────────────────────

  async login(loginDto: LoginDto, tenantId: string): Promise<AuthResponseDto> {
    const result = await this.authCore.login(loginDto, tenantId);
    // Seed default categories on first login (idempotent)
    this.tenantProvisioning
      .seedDefaultCategories(result.user.tenantId)
      .catch(() => void 0);
    return result;
  }

  register(
    registerDto: RegisterDto,
    tenantId: string,
  ): Promise<AuthResponseDto> {
    return this.authCore.register(registerDto, tenantId);
  }

  refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authCore.refreshToken(refreshTokenDto);
  }

  logout(userId: string): Promise<void> {
    return this.authCore.logout(userId);
  }

  changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.authCore.changePassword(userId, changePasswordDto);
  }

  // ── User management ────────────────────────────────────────────────────────

  getUsers(
    tenantId: string,
    role?: string,
    isActive?: boolean,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.userManagement.getUsers(tenantId, role, isActive, page, limit);
  }

  getUserById(tenantId: string, userId: string): Promise<any> {
    return this.userManagement.getUserById(tenantId, userId);
  }

  updateUser(tenantId: string, userId: string, updateData: any): Promise<any> {
    return this.userManagement.updateUser(tenantId, userId, updateData);
  }

  resetUserPassword(
    tenantId: string,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    return this.userManagement.resetUserPassword(tenantId, userId, newPassword);
  }

  deleteUser(tenantId: string, userId: string): Promise<void> {
    return this.userManagement.deleteUser(tenantId, userId);
  }

  setCashUpPin(
    tenantId: string,
    userId: string,
    pin?: string,
  ): Promise<{ success: boolean; hasPin: boolean }> {
    return this.userManagement.setCashUpPin(tenantId, userId, pin);
  }

  // ── Tenant provisioning ────────────────────────────────────────────────────

  provisionTenant(data: {
    tenantId: string;
    businessName: string;
    subdomain: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPassword: string;
  }): Promise<{ tenantId: string; userId: string }> {
    return this.tenantProvisioning.provisionTenant(data);
  }

  seedDefaultCategories(tenantId: string): Promise<void> {
    return this.tenantProvisioning.seedDefaultCategories(tenantId);
  }

  updateTenantStatus(data: {
    subdomain: string;
    status:
      | 'ACTIVE'
      | 'PAYMENT_DUE'
      | 'PAYMENT_WARNING'
      | 'SUSPENDED'
      | 'INACTIVE';
    suspendedReason?: string;
    billingDueDate?: string;
  }): Promise<{ tenantId: string; status: string }> {
    return this.tenantProvisioning.updateTenantStatus(data);
  }

  getQzConfig(tenantId: string) {
    return this.tenantProvisioning.getQzConfig(tenantId);
  }

  saveQzConfig(tenantId: string, certificate: string, privateKey: string) {
    return this.tenantProvisioning.saveQzConfig(
      tenantId,
      certificate,
      privateKey,
    );
  }
}
