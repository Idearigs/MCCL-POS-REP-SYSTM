import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCoreService } from './services/auth-core.service';
import { UserManagementService } from './services/user-management.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import type { RegisterDto } from './dto/auth.dto';

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
});
