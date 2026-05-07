import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateOutletDto, UpdateOutletDto } from './dto/outlet.dto';

const SALT_ROUNDS = 10;

function safeOutlet(o: {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isPrimary: boolean;
  address: string | null;
  phone: string | null;
  createdAt: Date;
}) {
  return {
    id: o.id,
    name: o.name,
    code: o.code,
    isActive: o.isActive,
    isPrimary: o.isPrimary,
    address: o.address,
    phone: o.phone,
    createdAt: o.createdAt,
  };
}

@Injectable()
export class OutletsService {
  constructor(private prisma: PrismaService) {}

  async getOutlets(tenantId: string) {
    try {
      const outlets = await this.prisma.outlets.findMany({
        where: { tenantId },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      });
      return outlets.map(safeOutlet);
    } catch {
      // Table may not exist yet (pending migration) — return empty list
      return [];
    }
  }

  async createOutlet(tenantId: string, dto: CreateOutletDto) {
    const existing = await this.prisma.outlets.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException(
        `An outlet with code "${dto.code}" already exists`,
      );
    }

    const count = await this.prisma.outlets.count({ where: { tenantId } });
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const outlet = await this.prisma.outlets.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        passwordHash,
        isPrimary: count === 0,
        address: dto.address,
        phone: dto.phone,
      },
    });
    return safeOutlet(outlet);
  }

  async updateOutlet(tenantId: string, id: string, dto: UpdateOutletDto) {
    await this.findOwned(tenantId, id);

    if (dto.code) {
      const clash = await this.prisma.outlets.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException(
          `An outlet with code "${dto.code}" already exists`,
        );
      }
    }

    const data: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.code !== undefined) data['code'] = dto.code;
    if (dto.address !== undefined) data['address'] = dto.address;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.password) {
      data['passwordHash'] = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    const updated = await this.prisma.outlets.update({
      where: { id },
      data,
    });
    return safeOutlet(updated);
  }

  async deleteOutlet(tenantId: string, id: string) {
    const outlet = await this.findOwned(tenantId, id);

    const count = await this.prisma.outlets.count({ where: { tenantId } });
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the only outlet');
    }
    if (outlet.isPrimary) {
      throw new BadRequestException(
        'Cannot delete the primary outlet — set another outlet as primary first',
      );
    }

    await this.prisma.outlets.delete({ where: { id } });
  }

  async verifyPassword(
    tenantId: string,
    id: string,
    password: string,
  ): Promise<{ id: string; name: string; code: string; isPrimary: boolean }> {
    const outlet = await this.prisma.outlets.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const ok = await bcrypt.compare(password, outlet.passwordHash);
    if (!ok) throw new UnauthorizedException('Incorrect outlet password');

    return {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      isPrimary: outlet.isPrimary,
    };
  }

  async seedPrimaryOutlet(
    tenantId: string,
    businessName: string,
  ): Promise<void> {
    const existing = await this.prisma.outlets.count({ where: { tenantId } });
    if (existing > 0) return;

    const code =
      businessName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6) ||
      'MAIN';

    await this.prisma.outlets.create({
      data: {
        tenantId,
        name: `${businessName} — Main`,
        code,
        passwordHash: await bcrypt.hash('1234', SALT_ROUNDS),
        isPrimary: true,
      },
    });
  }

  private async findOwned(tenantId: string, id: string) {
    const outlet = await this.prisma.outlets.findFirst({
      where: { id, tenantId },
    });
    if (!outlet) throw new NotFoundException('Outlet not found');
    return outlet;
  }

  /** How many outlets does this tenant have (for billing display) */
  async outletCount(tenantId: string): Promise<number> {
    try {
      return await this.prisma.outlets.count({ where: { tenantId } });
    } catch {
      return 0;
    }
  }
}
