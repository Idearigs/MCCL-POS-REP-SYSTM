import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StockTakingService } from './stock-taking.service';
import {
  CreateSessionDto,
  ScanItemDto,
  UpdateSessionDto,
  ApproveSessionDto,
} from './dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { StockTakeStatus } from '@prisma/client';

@Controller('stock-taking')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockTakingController {
  constructor(private readonly stockTakingService: StockTakingService) {}

  // Create a new stock take session
  @Post('sessions')
  async createSession(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    return this.stockTakingService.createSession(
      tenantId,
      userId,
      createSessionDto,
    );
  }

  // Get all sessions (with optional status filter)
  @Get('sessions')
  async getSessions(
    @TenantId() tenantId: string,
    @Query('status') status?: StockTakeStatus,
  ) {
    return this.stockTakingService.getSessions(tenantId, status);
  }

  // Get a single session with all details
  @Get('sessions/:id')
  async getSession(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stockTakingService.getSession(tenantId, id);
  }

  // Update session details
  @Patch('sessions/:id')
  async updateSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return this.stockTakingService.updateSession(
      tenantId,
      id,
      updateSessionDto,
    );
  }

  // Delete a session
  @Delete('sessions/:id')
  async deleteSession(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.stockTakingService.deleteSession(tenantId, id);
  }

  // Scan an item in a session
  @Post('sessions/:id/scan')
  async scanItem(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() scanItemDto: ScanItemDto,
  ) {
    return this.stockTakingService.scanItem(tenantId, id, userId, scanItemDto);
  }

  // Mark session as complete (ready for approval)
  @Patch('sessions/:id/complete')
  async completeSession(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.stockTakingService.completeSession(tenantId, id, userId);
  }

  // Approve or reject a session (admin only)
  @Patch('sessions/:id/approve')
  async approveSession(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() approveSessionDto: ApproveSessionDto,
  ) {
    return this.stockTakingService.approveSession(
      tenantId,
      id,
      userId,
      approveSessionDto,
    );
  }

  // Delete a scanned item from a session
  @Delete('sessions/:sessionId/items/:itemId')
  async deleteItem(
    @TenantId() tenantId: string,
    @Param('sessionId') sessionId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.stockTakingService.deleteItem(tenantId, sessionId, itemId);
  }

  // Get session report
  @Get('sessions/:id/report')
  async getSessionReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.stockTakingService.getSessionReport(tenantId, id);
  }

  // Get detailed variance report (for approval review)
  @Get('sessions/:id/variance-report')
  async getVarianceReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.stockTakingService.getVarianceReport(tenantId, id);
  }
}
