import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import {
  CurrentTenant,
  type TenantInfo,
} from '../../shared/decorators/tenant.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(TenantGuard, JwtAuthGuard)
@ApiBearerAuth('access-token')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings for the current tenant' })
  getSettings(@CurrentTenant() tenant: TenantInfo) {
    return this.settingsService.getSettings(tenant.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update settings (partial — send only changed sections)',
  })
  updateSettings(
    @CurrentTenant() tenant: TenantInfo,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(tenant.id, dto);
  }

  // ─── Refund authorisation password ─────────────────────────────────────────

  @Get('refund-password')
  @ApiOperation({
    summary: 'Whether a shared refund password is configured for this tenant',
  })
  async getRefundPasswordStatus(@CurrentTenant() tenant: TenantInfo) {
    return { isSet: await this.settingsService.hasRefundPassword(tenant.id) };
  }

  @Post('refund-password')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Set or replace the shared refund password (OWNER only)',
  })
  async setRefundPassword(
    @CurrentTenant() tenant: TenantInfo,
    @Body('password') password: string,
  ) {
    if (!password || password.trim().length < 4) {
      throw new BadRequestException(
        'Refund password must be at least 4 characters',
      );
    }
    await this.settingsService.setRefundPassword(tenant.id, password);
    return { success: true };
  }

  @Post('refund-password/verify')
  @ApiOperation({
    summary: 'Verify a candidate refund password (any authenticated user)',
  })
  async verifyRefundPassword(
    @CurrentTenant() tenant: TenantInfo,
    @Body('password') password: string,
  ) {
    return {
      valid: await this.settingsService.verifyRefundPassword(
        tenant.id,
        password,
      ),
    };
  }
}
