import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  GoldPricingService,
  GoldCandidate,
  GoldRunResult,
} from './gold-pricing.service';
import { BulkGoldPricingDto } from './dto/gold-pricing.dto';

@ApiTags('Gold Pricing')
@ApiBearerAuth()
@Controller('inventory/gold-pricing')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class GoldPricingController {
  constructor(private readonly goldPricing: GoldPricingService) {}

  @Get('candidates')
  @ApiOperation({
    summary: 'List gold-weight products with live value (NRV) and opt-in state',
  })
  async candidates(@TenantId() tenantId: string): Promise<GoldCandidate[]> {
    return this.goldPricing.getCandidates(tenantId);
  }

  @Post('run')
  @ApiOperation({ summary: 'Recompute prices from the live gold rate now' })
  async run(@TenantId() tenantId: string): Promise<GoldRunResult> {
    return this.goldPricing.runForTenant(tenantId);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Enable/disable live gold pricing for products' })
  async bulk(
    @TenantId() tenantId: string,
    @Body() dto: BulkGoldPricingDto,
  ): Promise<{ updated: number }> {
    return this.goldPricing.setBulk(tenantId, dto.ids, dto.enabled);
  }
}
