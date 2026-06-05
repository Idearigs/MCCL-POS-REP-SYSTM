import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {}

  async getUsers(
    tenantId: string,
    role?: string,
    isActive?: boolean,
    page: number = 1,
    limit: number = 100,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const where: any = { tenantId };
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;

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
            cashUpPin: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prismaService.users.count({ where }),
      ]);

      // Expose only whether a cash-up PIN exists — never the hash itself.
      const sanitized = users.map((u) => {
        const { cashUpPin, ...rest } = u;
        return { ...rest, hasCashUpPin: !!cashUpPin };
      });

      return { data: sanitized, total, page, limit };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to fetch users:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

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
          cashUpPin: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Expose only whether a cash-up PIN exists — never the hash itself.
      const { cashUpPin, ...rest } = user;
      return { ...rest, hasCashUpPin: !!cashUpPin };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async updateUser(
    tenantId: string,
    userId: string,
    updateData: any,
  ): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email, ...allowedUpdates } = updateData;

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
    } catch (error: unknown) {
      this.logger.error(
        `Failed to update user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async resetUserPassword(
    tenantId: string,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    try {
      const saltRounds = parseInt(
        this.configService.get<string>('HASH_SALT_ROUNDS', '12'),
        10,
      );
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      await this.prismaService.users.update({
        where: { id: userId, tenantId },
        data: { password: hashedPassword },
      });

      this.logger.log(`Password reset for user: ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to reset password for user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Set or clear a manager's cash-up override PIN. Only OWNER/MANAGER users
   * may hold a PIN (it authorizes high-variance shift closes). Passing an
   * empty/undefined pin clears it.
   */
  async setCashUpPin(
    tenantId: string,
    userId: string,
    pin?: string,
  ): Promise<{ success: boolean; hasPin: boolean }> {
    const user = await this.prismaService.users.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      throw new BadRequestException(
        'Only OWNER or MANAGER users can hold a cash-up PIN',
      );
    }

    const trimmed = pin?.trim();
    if (!trimmed) {
      await this.prismaService.users.update({
        where: { id: userId, tenantId },
        data: { cashUpPin: null },
      });
      return { success: true, hasPin: false };
    }

    if (!/^\d{4,6}$/.test(trimmed)) {
      throw new BadRequestException('PIN must be 4 to 6 digits');
    }

    const saltRounds = parseInt(
      this.configService.get<string>('HASH_SALT_ROUNDS', '12'),
      10,
    );
    const hashed = await bcrypt.hash(trimmed, saltRounds);
    await this.prismaService.users.update({
      where: { id: userId, tenantId },
      data: { cashUpPin: hashed },
    });
    return { success: true, hasPin: true };
  }

  async deleteUser(tenantId: string, userId: string): Promise<void> {
    const user = await this.prismaService.users.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new ConflictException('User not found');
    }

    // Find the tenant owner to reassign historical records before deletion
    const owner = await this.prismaService.users.findFirst({
      where: { tenantId, role: 'OWNER', id: { not: userId } },
    });

    if (owner) {
      // Reassign sales and shifts so FK constraints don't block deletion
      await this.prismaService.sales.updateMany({
        where: { tenantId, createdBy: userId },
        data: { createdBy: owner.id },
      });
      await this.prismaService.shifts.updateMany({
        where: { tenantId, userId },
        data: { userId: owner.id },
      });
    }

    await this.prismaService.users.delete({
      where: { id: userId },
    });

    this.logger.log(
      `User ${userId} deleted; records reassigned to owner ${owner?.id}`,
    );
  }
}
