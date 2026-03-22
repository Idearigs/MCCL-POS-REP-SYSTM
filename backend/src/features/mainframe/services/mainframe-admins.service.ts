import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class MainframeAdminsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }) {
    const existing = await this.prisma.mf_admins.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing)
      throw new ConflictException('Admin with this email already exists');

    return this.prisma.mf_admins.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: await this.hashPassword(data.password),
        role: data.role || 'admin',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.mf_admins.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const admin = await this.prisma.mf_admins.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async login(email: string, password: string) {
    const admin = await this.prisma.mf_admins.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!admin || !admin.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const passwordHash = await this.hashPassword(password);
    if (passwordHash !== admin.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    await this.prisma.mf_admins.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
    };
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.mf_admins.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  async changePassword(id: string, newPassword: string) {
    await this.prisma.mf_admins.update({
      where: { id },
      data: { passwordHash: await this.hashPassword(newPassword) },
    });
    return { success: true };
  }

  private async hashPassword(password: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(
      password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'),
    );
    return hash.digest('hex');
  }
}
