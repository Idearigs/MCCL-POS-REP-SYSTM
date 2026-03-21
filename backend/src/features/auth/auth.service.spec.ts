import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import type { RegisterDto } from './dto/auth.dto';

// ──────────────────────────────────────────────────────────────────────────────
// Mock bcrypt
// ──────────────────────────────────────────────────────────────────────────────
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'user-001',
  email: 'admin@test.com',
  password: '$2b$12$hashedpassword',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  tenantId: 'tenant-001',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenants: {
    id: 'tenant-001',
    name: 'Test Tenant',
    status: 'ACTIVE',
  },
};

const mockPrismaService = {
  users: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, fallback?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test_secret',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
      JWT_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
    };
    return config[key] ?? fallback;
  }),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// ──────────────────────────────────────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto, 'tenant-001');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('email', 'admin@test.com');
      expect(result.user).toHaveProperty('role', 'ADMIN');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto, 'tenant-001')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto, 'tenant-001')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not expose password in the returned user object', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto, 'tenant-001');

      expect(result.user).not.toHaveProperty('password');
    });

    it('should only find active users within the correct tenant', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.login(loginDto, 'tenant-001');

      expect(mockPrismaService.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'admin@test.com',
            tenantId: 'tenant-001',
            isActive: true,
          }),
        }),
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
      mockPrismaService.users.findFirst.mockResolvedValue(null); // no existing user
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');
      mockPrismaService.users.create.mockResolvedValue({
        ...mockUser,
        id: 'user-new',
        email: 'newuser@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'CASHIER',
      });
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.register(registerDto as RegisterDto, 'tenant-001');

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('newuser@test.com');
    });

    it('should throw ConflictException when email already exists in tenant', async () => {
      mockPrismaService.users.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.register(registerDto as RegisterDto, 'tenant-001'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
