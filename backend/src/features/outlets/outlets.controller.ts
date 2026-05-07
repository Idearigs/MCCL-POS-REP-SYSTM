import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OutletsService } from './outlets.service';
import {
  CreateOutletDto,
  UpdateOutletDto,
  VerifyOutletPasswordDto,
} from './dto/outlet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import {
  CurrentTenant,
  type TenantInfo,
} from '../../shared/decorators/tenant.decorator';

@ApiTags('Outlets')
@Controller('outlets')
@UseGuards(ThrottlerGuard, TenantGuard, JwtAuthGuard)
@ApiBearerAuth('access-token')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @ApiOperation({ summary: 'List outlets for the current tenant' })
  @ApiResponse({ status: 200, description: 'Outlets returned' })
  getOutlets(@CurrentUser() user: { tenantId: string }) {
    return this.outletsService.getOutlets(user.tenantId);
  }

  @Post()
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new outlet (OWNER only)' })
  @ApiResponse({ status: 201, description: 'Outlet created' })
  createOutlet(
    @CurrentUser() user: { tenantId: string },
    @Body() dto: CreateOutletDto,
  ) {
    return this.outletsService.createOutlet(user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update an outlet (OWNER only)' })
  @ApiResponse({ status: 200, description: 'Outlet updated' })
  updateOutlet(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOutletDto,
  ) {
    return this.outletsService.updateOutlet(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an outlet (OWNER only)' })
  @ApiResponse({ status: 204, description: 'Outlet deleted' })
  async deleteOutlet(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
  ) {
    await this.outletsService.deleteOutlet(user.tenantId, id);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify outlet password — returns outlet info on success',
  })
  @ApiResponse({ status: 200, description: 'Password correct' })
  @ApiResponse({ status: 401, description: 'Incorrect password' })
  verifyOutletPassword(
    @CurrentUser() user: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: VerifyOutletPasswordDto,
  ) {
    return this.outletsService.verifyPassword(
      user.tenantId,
      id,
      dto.password,
    );
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get outlet count (used for billing display)',
  })
  async getOutletCount(
    @CurrentUser() user: { tenantId: string },
    @CurrentTenant() _tenant: TenantInfo,
  ) {
    const count = await this.outletsService.outletCount(user.tenantId);
    const included = Math.min(count, 2);
    const extra = Math.max(0, count - 2);
    return {
      count,
      included,
      extra,
      monthlyExtra: extra * 85,
      summary:
        count <= 2
          ? `${count} outlet${count === 1 ? '' : 's'} — included in plan`
          : `${count} outlets — £${extra * 85}/month extra (${extra} × £85)`,
    };
  }
}
