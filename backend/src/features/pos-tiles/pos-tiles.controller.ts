import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PosTilesService } from './pos-tiles.service';
import {
  CreatePosTileDto,
  UpdatePosTileDto,
  ReorderPosTilesDto,
  PosTileResponseDto,
} from './dto/pos-tile.dto';

interface TenantRequest extends Request {
  tenant: { id: string; tenantId?: string };
}

@ApiTags('POS Tiles')
@ApiBearerAuth()
@Controller('pos-tiles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PosTilesController {
  constructor(private readonly posTilesService: PosTilesService) {}

  private tenantId(req: TenantRequest): string {
    return req.tenant?.id || req.tenant?.tenantId;
  }

  @Get()
  @ApiOperation({ summary: 'List active POS tiles (display order)' })
  async findAll(@Req() req: TenantRequest): Promise<PosTileResponseDto[]> {
    return this.posTilesService.findAll(this.tenantId(req));
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a POS tile' })
  async create(
    @Req() req: TenantRequest,
    @Body() dto: CreatePosTileDto,
  ): Promise<PosTileResponseDto> {
    return this.posTilesService.create(this.tenantId(req), dto);
  }

  @Patch('reorder')
  @Roles('OWNER', 'MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Persist a new tile display order' })
  async reorder(
    @Req() req: TenantRequest,
    @Body() dto: ReorderPosTilesDto,
  ): Promise<PosTileResponseDto[]> {
    return this.posTilesService.reorder(this.tenantId(req), dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'MANAGER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a POS tile' })
  async update(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdatePosTileDto,
  ): Promise<PosTileResponseDto> {
    return this.posTilesService.update(this.tenantId(req), id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a POS tile (soft delete)' })
  async remove(
    @Req() req: TenantRequest,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.posTilesService.remove(this.tenantId(req), id);
  }
}
