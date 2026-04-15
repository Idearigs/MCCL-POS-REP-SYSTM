import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  /**
   * User login
   */
  async login(loginDto: LoginDto, tenantId: string): Promise<AuthResponseDto> {
    const { email, password, companySlug } = loginDto;

    try {
      // If companySlug provided, resolve tenant by subdomain/id (multi-tenant login)
      if (companySlug) {
        const tenant = await this.prismaService.tenants.findFirst({
          where: {
            OR: [
              { id: companySlug.toLowerCase() },
              { subdomain: companySlug.toLowerCase() },
            ],
            status: 'ACTIVE',
          },
        });
        if (!tenant) {
          throw new UnauthorizedException('Company not found or inactive');
        }
        tenantId = tenant.id;
      }

      // Find user by email and tenant
      const user = await this.prismaService.users.findFirst({
        where: {
          email: email.toLowerCase(),
          tenantId,
          isActive: true,
        },
        include: {
          tenants: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check tenant status
      const tenantStatus = user.tenants.status;
      if (tenantStatus === 'SUSPENDED') {
        const tenantData = user.tenants as { status: string; suspendedReason?: string };
        throw new ForbiddenException({
          code: 'TENANT_SUSPENDED',
          reason: tenantData.suspendedReason || 'MANUAL',
          message:
            tenantData.suspendedReason === 'PAYMENT_OVERDUE'
              ? 'Account suspended due to overdue payment. Please contact MCCL to restore access.'
              : 'Account has been deactivated. Please contact MCCL for more information.',
        });
      }
      if (tenantStatus === 'INACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }
      // PAYMENT_DUE and PAYMENT_WARNING are allowed to log in — frontend shows banners

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update user with refresh token and last login
      await this.prismaService.users.update({
        where: { id: user.id },
        data: {
          refreshToken: tokens.refreshToken,
          lastLogin: new Date(),
        },
      });

      // Cache user session
      await this.cacheService.setUserData(
        user.id,
        'session',
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
        },
        3600, // 1 hour
      );

      this.logger.log(`User logged in: ${email} (${user.id})`);

      // Ensure all default categories exist for this tenant (idempotent — safe to run on every login)
      this.seedDefaultCategories(user.tenantId).catch((err) =>
        this.logger.warn(
          `Failed to seed categories on login for ${user.tenantId}: ${err.message}`,
        ),
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        expiresIn: this.getExpirationTime(),
      };
    } catch (error) {
      this.logger.error(`Login failed for ${email}:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(
    registerDto: RegisterDto,
    tenantId: string,
  ): Promise<AuthResponseDto> {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'STAFF',
    } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.prismaService.users.findFirst({
        where: {
          email: email.toLowerCase(),
          tenantId,
        },
      });

      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      // Verify tenant exists and is active
      const tenant = await this.prismaService.tenants.findUnique({
        where: { id: tenantId, status: 'ACTIVE' },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid or inactive tenant');
      }

      // Hash password
      const saltRounds = parseInt(
        this.configService.get('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.prismaService.users.create({
        data: {
          id: generateId(),
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: role as any,
          tenantId,
          updatedAt: new Date(),
        } as any,
        include: {
          tenants: true,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update user with refresh token
      await this.prismaService.users.update({
        where: { id: user.id },
        data: {
          refreshToken: tokens.refreshToken,
          lastLogin: new Date(),
        },
      });

      this.logger.log(`User registered: ${email} (${user.id})`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        expiresIn: this.getExpirationTime(),
      };
    } catch (error) {
      this.logger.error(`Registration failed for ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user with matching refresh token
      const user = await this.prismaService.users.findFirst({
        where: {
          id: payload.sub,
          refreshToken,
          isActive: true,
        },
        include: {
          tenants: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (user.tenants.status === 'SUSPENDED') {
        throw new ForbiddenException({
          code: 'TENANT_SUSPENDED',
          reason: (user.tenants as any).suspendedReason || 'MANUAL',
          message: 'Account suspended. Please contact MCCL.',
        });
      }
      if (user.tenants.status === 'INACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update user with new refresh token
      await this.prismaService.users.update({
        where: { id: user.id },
        data: {
          refreshToken: tokens.refreshToken,
        },
      });

      this.logger.log(`Token refreshed for user: ${user.email} (${user.id})`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
        },
        expiresIn: this.getExpirationTime(),
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * User logout
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from database
      await this.prismaService.users.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      // Remove user session from cache
      await this.cacheService.delUserData(userId, 'session');

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error(`Logout failed for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = parseInt(
        this.configService.get('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.prismaService.users.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password changed for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Password change failed for user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Provision a new tenant + owner user (called by Mainframe when creating a customer profile)
   */
  async provisionTenant(data: {
    tenantId: string;
    businessName: string;
    subdomain: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPassword: string;
  }): Promise<{ tenantId: string; userId: string }> {
    const saltRounds = parseInt(
      this.configService.get('HASH_SALT_ROUNDS', '12'),
      10,
    );
    const hashedPassword = await bcrypt.hash(data.ownerPassword, saltRounds);
    const ownerEmail = data.ownerEmail.toLowerCase();

    // Upsert tenant — safe to re-run on reprovision
    await this.prismaService.tenants.upsert({
      where: { id: data.tenantId },
      update: {
        name: data.businessName,
        subdomain: data.subdomain.toLowerCase(),
        domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      create: {
        id: data.tenantId,
        name: data.businessName,
        subdomain: data.subdomain.toLowerCase(),
        domain: `${data.subdomain.toLowerCase()}.truedesk.co.uk`,
        status: 'ACTIVE',
        subscriptionPlan: 'basic',
        updatedAt: new Date(),
      },
    });

    // Upsert owner user — resets password on reprovision
    const existingUser = await this.prismaService.users.findFirst({
      where: { email: ownerEmail, tenantId: data.tenantId },
    });

    let userId: string;
    if (existingUser) {
      await this.prismaService.users.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      userId = existingUser.id;
    } else {
      userId = generateId();
      await this.prismaService.users.create({
        data: {
          id: userId,
          email: ownerEmail,
          password: hashedPassword,
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          role: 'OWNER',
          tenantId: data.tenantId,
          updatedAt: new Date(),
        } as any,
      });
    }

    // Seed default jewellery categories if the tenant has none
    await this.seedDefaultCategories(data.tenantId);

    this.logger.log(
      `Tenant provisioned: ${data.tenantId} (${data.businessName})`,
    );
    return { tenantId: data.tenantId, userId };
  }

  /**
   * Seed default jewellery categories for a tenant (idempotent)
   */
  async seedDefaultCategories(tenantId: string): Promise<void> {
    const DEFAULT_CATEGORIES = [
      'Rings',
      'Necklaces',
      'Bracelets',
      'Earrings',
      'Pendants',
      'Watches',
      'Chains',
      'Other',
    ];

    const existing = await this.prismaService.categories.findMany({
      where: { tenantId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    const toCreate = DEFAULT_CATEGORIES.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (toCreate.length > 0) {
      for (const name of toCreate) {
        await this.prismaService.categories.create({
          data: { id: generateId(), name, tenantId, isActive: true, updatedAt: new Date() },
        });
      }
      this.logger.log(
        `Seeded ${toCreate.length} categories for tenant ${tenantId}`,
      );
    }
  }

  /**
   * Get token expiration time in seconds
   */
  private getExpirationTime(): number {
    const expiration = this.configService.get<string>('JWT_EXPIRATION', '7d');

    // Convert time string to seconds (e.g., '15m' -> 900)
    const timeValue = parseInt(expiration.slice(0, -1));
    const timeUnit = expiration.slice(-1);

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 3600;
      case 'd':
        return timeValue * 86400;
      default:
        return 900; // default 15 minutes
    }
  }

  /**
   * Get all users
   */
  async getUsers(
    tenantId: string,
    role?: string,
    isActive?: boolean,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const where: any = { tenantId };

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [users, total] = await Promise.all([
        this.prismaService.users.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prismaService.users.count({ where }),
      ]);

      return {
        data: users,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch users:', error.message);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId: string, userId: string): Promise<any> {
    try {
      const user = await this.prismaService.users.findFirst({
        where: { id: userId, tenantId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(
    tenantId: string,
    userId: string,
    updateData: any,
  ): Promise<any> {
    try {
      // Don't allow email updates for now
      const { email, ...allowedUpdates } = updateData;

      // Hash password if provided
      if (allowedUpdates.password) {
        const saltRounds = parseInt(
          this.configService.get('HASH_SALT_ROUNDS', '12'),
          10,
        );
        allowedUpdates.password = await bcrypt.hash(
          allowedUpdates.password,
          saltRounds,
        );
      }

      const updatedUser = await this.prismaService.users.update({
        where: { id: userId, tenantId },
        data: allowedUpdates,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`User updated: ${userId}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Reset user password (admin only)
   */
  async resetUserPassword(
    tenantId: string,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    try {
      // Hash new password
      const saltRounds = parseInt(
        this.configService.get<string>('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.prismaService.users.update({
        where: { id: userId, tenantId },
        data: { password: hashedPassword },
      });

      this.logger.log(`Password reset for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset password for user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Permanently delete a user/cashier (admin only)
   */
  async deleteUser(tenantId: string, userId: string): Promise<void> {
    try {
      await this.prismaService.users.delete({
        where: { id: userId, tenantId },
      });
      this.logger.log(`User deleted: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update tenant status — called by Mainframe via internal API
   * to sync suspension / billing state into the POS database.
   */
  async updateTenantStatus(data: {
    subdomain: string;
    status: 'ACTIVE' | 'PAYMENT_DUE' | 'PAYMENT_WARNING' | 'SUSPENDED' | 'INACTIVE';
    suspendedReason?: string;
    billingDueDate?: string;
  }): Promise<{ tenantId: string; status: string }> {
    const tenant = await this.prismaService.tenants.findUnique({
      where: { subdomain: data.subdomain.toLowerCase() },
    });

    if (!tenant) {
      throw new Error(`Tenant with subdomain '${data.subdomain}' not found`);
    }

    const updateData: any = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.status === 'SUSPENDED') {
      updateData.suspendedAt = new Date();
      updateData.suspendedReason = data.suspendedReason || 'MANUAL';
    }

    if (data.status === 'ACTIVE') {
      // Clear suspension fields on re-activation
      updateData.suspendedAt = null;
      updateData.suspendedReason = null;
    }

    if (data.billingDueDate) {
      updateData.billingDueDate = new Date(data.billingDueDate);
    }

    const updated = await this.prismaService.tenants.update({
      where: { id: tenant.id },
      data: updateData,
    });

    this.logger.log(
      `Tenant ${data.subdomain} status updated to ${data.status} (reason: ${data.suspendedReason || 'none'})`,
    );

    return { tenantId: updated.id, status: updated.status };
  }
}
