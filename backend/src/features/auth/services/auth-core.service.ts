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
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import { generateId } from '../../../shared/utils/id-generator';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from '../dto/auth.dto';

@Injectable()
export class AuthCoreService {
  private readonly logger = new Logger(AuthCoreService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  async login(loginDto: LoginDto, tenantId: string): Promise<AuthResponseDto> {
    const { email, password, companySlug } = loginDto;

    try {
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

      const user = await this.prismaService.users.findFirst({
        where: { email: email.toLowerCase(), tenantId, isActive: true },
        include: { tenants: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const tenantStatus = user.tenants.status;
      if (tenantStatus === 'SUSPENDED') {
        throw new ForbiddenException({
          code: 'TENANT_SUSPENDED',
          reason: user.tenants.suspendedReason || 'MANUAL',
          message:
            user.tenants.suspendedReason === 'PAYMENT_OVERDUE'
              ? 'Account suspended due to overdue payment. Please contact MCCL to restore access.'
              : 'Account has been deactivated. Please contact MCCL for more information.',
        });
      }
      if (tenantStatus === 'INACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      const tokens = await this.generateTokens(user);
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.prismaService.users.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken, lastLogin: new Date() },
      });

      await this.cacheService.setUserData(
        user.id,
        'session',
        {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
        },
        3600,
      );

      this.logger.log(`User logged in: ${email} (${user.id})`);

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
        tenant: user.tenants
          ? {
              id: user.tenants.id,
              name: user.tenants.name,
              subdomain: user.tenants.subdomain,
              status: user.tenants.status,
            }
          : undefined,
        expiresIn: this.getExpirationTime(),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Login failed for ${email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

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
      const existingUser = await this.prismaService.users.findFirst({
        where: { email: email.toLowerCase(), tenantId },
      });
      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      const tenant = await this.prismaService.tenants.findUnique({
        where: { id: tenantId, status: 'ACTIVE' },
      });
      if (!tenant) {
        throw new BadRequestException('Invalid or inactive tenant');
      }

      const saltRounds = parseInt(
        this.configService.get('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await this.prismaService.users.create({
        data: {
          id: generateId(),
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          role: role as any,
          tenantId,
          updatedAt: new Date(),
        } as any,
        include: { tenants: true },
      });

      const tokens = await this.generateTokens(user);
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.prismaService.users.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken, lastLogin: new Date() },
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
    } catch (error: unknown) {
      this.logger.error(
        `Registration failed for ${email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      const rawPayload: unknown = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const payload = rawPayload as {
        sub: string;
        email: string;
        tenantId: string;
        role: string;
      };

      const user = await this.prismaService.users.findFirst({
        where: { id: payload.sub, isActive: true },
        include: { tenants: true },
      });

      if (
        !user ||
        !user.refreshToken ||
        !(await bcrypt.compare(refreshToken, user.refreshToken))
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (user.tenants.status === 'SUSPENDED') {
        throw new ForbiddenException({
          code: 'TENANT_SUSPENDED',
          reason: user.tenants.suspendedReason || 'MANUAL',
          message: 'Account suspended. Please contact MCCL.',
        });
      }
      if (user.tenants.status === 'INACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.prismaService.users.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
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
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.prismaService.users.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      await this.cacheService.delUserData(userId, 'session');
      this.logger.log(`User logged out: ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Logout failed for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

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

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const saltRounds = parseInt(
        this.configService.get('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      await this.prismaService.users.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password changed for user: ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Password change failed for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

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

  private getExpirationTime(): number {
    const expiration = this.configService.get<string>('JWT_EXPIRATION', '7d');
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
        return 900;
    }
  }
}
