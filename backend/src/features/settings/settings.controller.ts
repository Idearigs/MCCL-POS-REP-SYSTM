import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import {
  CurrentTenant,
  type TenantInfo,
} from '../../shared/decorators/tenant.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(ThrottlerGuard, TenantGuard, JwtAuthGuard)
@ApiBearerAuth('access-token')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings for the current tenant' })
  getSettings(@CurrentTenant() tenant: TenantInfo) {
    return this.settingsService.getSettings(tenant.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings (partial — send only changed sections)' })
  updateSettings(
    @CurrentTenant() tenant: TenantInfo,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(tenant.id, dto);
  }
}
