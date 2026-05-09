import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prismaService.users.count({ where }),
      ]);

      return { data: users, total, page, limit };
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
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
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

  async deleteUser(tenantId: string, userId: string): Promise<void> {
    try {
      await this.prismaService.users.delete({
        where: { id: userId, tenantId },
      });
      this.logger.log(`User deleted: ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete user ${userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }
}
