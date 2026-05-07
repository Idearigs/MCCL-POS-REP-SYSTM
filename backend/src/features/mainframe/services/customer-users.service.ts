import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CredentialsExportService } from './credentials-export.service';
import {
  CreateCustomerUserDto,
  UpdateCustomerUserDto,
} from '../dto/customer-profile.dto';

@Injectable()
export class CustomerUsersService {
  constructor(
    private prisma: PrismaService,
    private credentialsExportService: CredentialsExportService,
  ) {}

  async create(dto: CreateCustomerUserDto) {
    // Check if profile exists
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { id: dto.customerProfileId },
      include: {
        subscription: true,
        _count: { select: { customerUsers: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    // Check user limit
    if (profile.subscription?.maxUsers) {
      if (profile._count.customerUsers >= profile.subscription.maxUsers) {
        throw new BadRequestException(
          `User limit reached (${profile.subscription.maxUsers} users)`,
        );
      }
    }

    // Check if email already exists for this profile
    const existingUser = await this.prisma.mf_customer_users.findFirst({
      where: {
        customerProfileId: dto.customerProfileId,
        email: dto.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user with generated credentials
    const { user, tempPassword } =
      await this.credentialsExportService.createUserWithCredentials(
        dto.customerProfileId,
        dto.email,
        dto.firstName,
        dto.lastName,
        dto.role || 'STAFF',
      );

    // Update subscription user count
    if (profile.subscription) {
      await this.prisma.mf_subscriptions.update({
        where: { id: profile.subscription.id },
        data: { currentUsers: profile._count.customerUsers + 1 },
      });
    }

    // Log activity
    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: dto.customerProfileId,
        action: 'user.created',
        description: `User ${dto.email} created`,
        actorType: 'admin',
      },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
      tempPassword,
    };
  }

  async findAllByProfile(profileId: string) {
    return this.prisma.mf_customer_users.findMany({
      where: { customerProfileId: profileId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.mf_customer_users.findUnique({
      where: { id },
      select: {
        id: true,
        customerProfileId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        loginAttempts: true,
        lockedUntil: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        customerProfile: {
          select: {
            businessName: true,
            subdomain: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateCustomerUserDto) {
    const existing = await this.prisma.mf_customer_users.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check for email conflict
    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const emailConflict = await this.prisma.mf_customer_users.findFirst({
        where: {
          customerProfileId: existing.customerProfileId,
          email: dto.email.toLowerCase(),
          id: { not: id },
        },
      });

      if (emailConflict) {
        throw new ConflictException('Email already in use');
      }
    }

    const updated = await this.prisma.mf_customer_users.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        role: dto.role as any,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: existing.customerProfileId,
        action: 'user.updated',
        description: `User ${updated.email} updated`,
        actorType: 'admin',
      },
    });

    return updated;
  }

  async resetPassword(id: string) {
    const user = await this.prisma.mf_customer_users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newPassword = this.credentialsExportService.generateSecurePassword();
    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.mf_customer_users.update({
      where: { id },
      data: {
        passwordHash,
        tempPassword: newPassword,
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: user.customerProfileId,
        action: 'user.password_reset',
        description: `Password reset for ${user.email}`,
        actorType: 'admin',
      },
    });

    return { newPassword };
  }

  async deactivate(id: string) {
    const user = await this.prisma.mf_customer_users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.mf_customer_users.update({
      where: { id },
      data: { isActive: false },
    });

    // Update subscription user count
    const profile = await this.prisma.mf_customer_profiles.findUnique({
      where: { id: user.customerProfileId },
      include: { subscription: true },
    });

    if (profile?.subscription) {
      const activeUsers = await this.prisma.mf_customer_users.count({
        where: {
          customerProfileId: user.customerProfileId,
          isActive: true,
        },
      });

      await this.prisma.mf_subscriptions.update({
        where: { id: profile.subscription.id },
        data: { currentUsers: activeUsers },
      });
    }

    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: user.customerProfileId,
        action: 'user.deactivated',
        description: `User ${user.email} deactivated`,
        actorType: 'admin',
      },
    });

    return { success: true };
  }

  async delete(id: string) {
    const user = await this.prisma.mf_customer_users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.mf_customer_users.delete({
      where: { id },
    });

    await this.prisma.mf_activity_logs.create({
      data: {
        customerProfileId: user.customerProfileId,
        action: 'user.deleted',
        description: `User ${user.email} deleted`,
        actorType: 'admin',
      },
    });

    return { success: true };
  }

  private async hashPassword(password: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-salt'));
    return hash.digest('hex');
  }
}
