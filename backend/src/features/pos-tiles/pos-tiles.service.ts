import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  CreatePosTileDto,
  UpdatePosTileDto,
  ReorderPosTilesDto,
  PosTileResponseDto,
} from './dto/pos-tile.dto';

@Injectable()
export class PosTilesService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(tile: {
    id: string;
    label: string;
    saleName: string;
    defaultPrice: Prisma.Decimal | null;
    color: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
  }): PosTileResponseDto {
    return {
      id: tile.id,
      label: tile.label,
      saleName: tile.saleName,
      defaultPrice:
        tile.defaultPrice != null ? Number(tile.defaultPrice) : null,
      color: tile.color,
      icon: tile.icon,
      sortOrder: tile.sortOrder,
      isActive: tile.isActive,
    };
  }

  /** Active tiles for a tenant, in display order. */
  async findAll(tenantId: string): Promise<PosTileResponseDto[]> {
    const tiles = await this.prisma.pos_tiles.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return tiles.map((t) => this.toResponse(t));
  }

  async create(
    tenantId: string,
    dto: CreatePosTileDto,
  ): Promise<PosTileResponseDto> {
    // New tiles append to the end of the current order.
    const last = await this.prisma.pos_tiles.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const tile = await this.prisma.pos_tiles.create({
      data: {
        id: generateId(),
        tenantId,
        label: dto.label,
        saleName: dto.saleName?.trim() || dto.label,
        defaultPrice:
          dto.defaultPrice != null
            ? new Prisma.Decimal(dto.defaultPrice)
            : null,
        color: dto.color || 'blue',
        icon: dto.icon || 'Tag',
        sortOrder: (last?.sortOrder ?? -1) + 1,
        updatedAt: new Date(),
      },
    });
    return this.toResponse(tile);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePosTileDto,
  ): Promise<PosTileResponseDto> {
    await this.ensureExists(tenantId, id);
    const data: Prisma.pos_tilesUpdateInput = { updatedAt: new Date() };
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.saleName !== undefined)
      data.saleName = dto.saleName?.trim() || dto.label || undefined;
    if (dto.defaultPrice !== undefined)
      data.defaultPrice =
        dto.defaultPrice != null ? new Prisma.Decimal(dto.defaultPrice) : null;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const tile = await this.prisma.pos_tiles.update({
      where: { id },
      data,
    });
    return this.toResponse(tile);
  }

  /** Soft-delete so historical sales keep their tile reference meaningful. */
  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    await this.ensureExists(tenantId, id);
    await this.prisma.pos_tiles.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
    return { message: 'Tile removed' };
  }

  async reorder(
    tenantId: string,
    dto: ReorderPosTilesDto,
  ): Promise<PosTileResponseDto[]> {
    await this.prisma.$transaction(
      dto.tiles.map((t) =>
        this.prisma.pos_tiles.updateMany({
          where: { id: t.id, tenantId },
          data: { sortOrder: t.sortOrder, updatedAt: new Date() },
        }),
      ),
    );
    return this.findAll(tenantId);
  }

  private async ensureExists(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.pos_tiles.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('POS tile not found');
    }
  }
}
