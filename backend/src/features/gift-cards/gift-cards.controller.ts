import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { GiftCardsService } from './gift-cards.service';
import {
  CreateGiftCardDto,
  RedeemGiftCardDto,
  ValidateGiftCardDto,
} from './dto/gift-card.dto';

@ApiTags('Gift Cards')
@Controller('gift-cards')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a new gift card' })
  @ApiResponse({ status: 201, description: 'Gift card created' })
  async create(
    @Body() dto: CreateGiftCardDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.giftCardsService.create(dto, tenantId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all gift cards' })
  async findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.giftCardsService.findAll(tenantId, status);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a gift card by code' })
  async validate(
    @Body() dto: ValidateGiftCardDto,
    @TenantId() tenantId: string,
  ) {
    return this.giftCardsService.validate(dto.code, tenantId);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem a gift card (deduct balance)' })
  async redeem(
    @Body() dto: RedeemGiftCardDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.giftCardsService.redeem(dto, tenantId, userId);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get gift card by code' })
  async findByCode(@Param('code') code: string, @TenantId() tenantId: string) {
    return this.giftCardsService.findByCode(code, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get gift card by ID' })
  async findById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.giftCardsService.findById(id, tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a gift card' })
  async cancel(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.giftCardsService.cancel(id, tenantId, userId);
  }

  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a gift card' })
  async hardDelete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.giftCardsService.hardDelete(id, tenantId);
  }
}
