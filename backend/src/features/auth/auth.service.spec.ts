import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCoreService } from './services/auth-core.service';
import { UserManagementService } from './services/user-management.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import type { RegisterDto, RefreshTokenDto } from './dto/auth.dto';

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────
const mockAuthResponse = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
  user: {
    id: 'user-001',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    tenantId: 'tenant-001',
  },
  expiresIn: 900,
};

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let authCore: jest.Mocked<AuthCoreService>;
  let userManagement: jest.Mocked<UserManagementService>;
  let tenantProvisioning: jest.Mocked<TenantProvisioningService>;

  beforeEach(() => {
    jest.clearAllMocks();

    authCore = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
    } as unknown as jest.Mocked<AuthCoreService>;

    userManagement = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      resetUserPassword: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<UserManagementService>;

    tenantProvisioning = {
      provisionTenant: jest.fn(),
      seedDefaultCategories: jest.fn().mockResolvedValue(undefined),
      updateTenantStatus: jest.fn(),
    } as unknown as jest.Mocked<TenantProvisioningService>;

    service = new AuthService(authCore, userManagement, tenantProvisioning);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // login()
  // ────────────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const loginDto = { email: 'admin@test.com', password: 'password123' };

    it('should return tokens and user info on successful login', async () => {
      authCore.login.mockResolvedValue(mockAuthResponse);

      const result = await service.login(loginDto, 'tenant-001');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'admin@test.com');
      expect(result.user).toHaveProperty('role', 'ADMIN');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      authCore.login.mockRejectedValue(
        new UnauthorizedException('Invalid email or password'),
      );

      await expect(service.login(loginDto, 'tenant-001')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      authCore.login.mockRejectedValue(
        new UnauthorizedException('Invalid email or password'),
      );

      await expect(service.login(loginDto, 'tenant-001')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not expose password in the returned user object', async () => {
      authCore.login.mockResolvedValue(mockAuthResponse);

      const result = await service.login(loginDto, 'tenant-001');

      expect(result.user).not.toHaveProperty('password');
    });

    it('should only find active users within the correct tenant', async () => {
      authCore.login.mockResolvedValue(mockAuthResponse);

      await service.login(loginDto, 'tenant-001');

      expect(authCore.login).toHaveBeenCalledWith(loginDto, 'tenant-001');
    });

    it('should throw ForbiddenException when tenant is SUSPENDED', async () => {
      authCore.login.mockRejectedValue(
        new ForbiddenException('Tenant is suspended'),
      );

      await expect(service.login(loginDto, 'tenant-001')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should seed default categories after successful login (fire-and-forget)', async () => {
      authCore.login.mockResolvedValue(mockAuthResponse);
      tenantProvisioning.seedDefaultCategories.mockResolvedValue(undefined);

      await service.login(loginDto, 'tenant-001');

      // Give the fire-and-forget promise a tick to register the call
      await Promise.resolve();
      expect(tenantProvisioning.seedDefaultCategories).toHaveBeenCalledWith(
        mockAuthResponse.user.tenantId,
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // register()
  // ────────────────────────────────────────────────────────────────────────────

  describe('register()', () => {
    const registerDto = {
      email: 'newuser@test.com',
      password: 'SecurePass123!',
      firstName: 'New',
      lastName: 'User',
      role: 'CASHIER',
    };

    it('should create a new user and return tokens', async () => {
      const newUserResponse = {
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, email: 'newuser@test.com' },
      };
      authCore.register.mockResolvedValue(newUserResponse);

      const result = await service.register(
        registerDto as RegisterDto,
        'tenant-001',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('newuser@test.com');
    });

    it('should throw ConflictException when email already exists in tenant', async () => {
      authCore.register.mockRejectedValue(
        new ConflictException('User already exists with this email'),
      );

      await expect(
        service.register(registerDto as RegisterDto, 'tenant-001'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // refreshToken()
  // ────────────────────────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    const dto: RefreshTokenDto = { refreshToken: 'valid.refresh.token' };

    it('should return new tokens when refresh token is valid', async () => {
      const refreshed = {
        ...mockAuthResponse,
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      };
      authCore.refreshToken.mockResolvedValue(refreshed);

      const result = await service.refreshToken(dto);

      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
      expect(authCore.refreshToken).toHaveBeenCalledWith(dto);
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      authCore.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token expired'),
      );

      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token has been revoked', async () => {
      authCore.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token revoked'),
      );

      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // logout()
  // ────────────────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('should delegate to authCore.logout with the user id', async () => {
      authCore.logout.mockResolvedValue(undefined);

      await service.logout('user-001');

      expect(authCore.logout).toHaveBeenCalledWith('user-001');
    });
  });
});
