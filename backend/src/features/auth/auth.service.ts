import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
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
    const { email, password } = loginDto;

    try {
      // Find user by email and tenant
      const user = await this.prismaService.user.findFirst({
        where: {
          email,
          tenantId,
          isActive: true,
        },
        include: {
          tenant: true,
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
      if (user.tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update user with refresh token and last login
      await this.prismaService.user.update({
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
      this.logger.error(`Login failed for ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(registerDto: RegisterDto, tenantId: string): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role = 'STAFF' } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.prismaService.user.findFirst({
        where: {
          email,
          tenantId,
        },
      });

      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      // Verify tenant exists and is active
      const tenant = await this.prismaService.tenant.findUnique({
        where: { id: tenantId, status: 'ACTIVE' },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid or inactive tenant');
      }

      // Hash password
      const saltRounds = this.configService.get<number>('HASH_SALT_ROUNDS', 12);
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.prismaService.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role as any,
          tenantId,
        },
        include: {
          tenant: true,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update user with refresh token
      await this.prismaService.user.update({
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
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user with matching refresh token
      const user = await this.prismaService.user.findFirst({
        where: {
          id: payload.sub,
          refreshToken,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!user || user.tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update user with new refresh token
      await this.prismaService.user.update({
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
      await this.prismaService.user.update({
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
      const user = await this.prismaService.user.findUnique({
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
      const saltRounds = this.configService.get<number>('HASH_SALT_ROUNDS', 12);
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.prismaService.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password changed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Password change failed for user ${userId}:`, error.message);
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
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Get token expiration time in seconds
   */
  private getExpirationTime(): number {
    const expiration = this.configService.get<string>('JWT_EXPIRATION', '15m');
    
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
}