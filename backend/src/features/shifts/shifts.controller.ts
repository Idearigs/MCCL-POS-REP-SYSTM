import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { ShiftsService } from './shifts.service';
import { StartShiftDto, CloseShiftDto, GetShiftsDto } from './dto/shift.dto';
import { ShiftStatus } from '@prisma/client';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // Start new shift
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startShift(@Req() req, @Body() body: StartShiftDto) {
    return this.shiftsService.startShift({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      openingFloat: body.openingFloat,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      openingNotes: body.openingNotes
    });
  }

  // Get active shift for current user
  @Get('active')
  async getActiveShift(@Req() req) {
    return this.shiftsService.getActiveShift(
      req.user.id,
      req.user.tenantId
    );
  }

  // Close shift
  @Patch(':id/close')
  async closeShift(
    @Req() req,
    @Param('id') shiftId: string,
    @Body() body: CloseShiftDto
  ) {
    return this.shiftsService.closeShift(shiftId, req.user.id, body);
  }

  // Get shifts by date range
  @Get()
  async getShifts(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ShiftStatus
  ) {
    // Validate date parameters
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getShiftsByDateRange(
      req.user.tenantId,
      start,
      end,
      userId,
      status
    );
  }

  // Get shift report
  @Get(':id/report')
  async getShiftReport(@Param('id') shiftId: string) {
    return this.shiftsService.getShiftReport(shiftId);
  }

  // Get shift statistics
  @Get('statistics')
  async getShiftStatistics(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    // Validate date parameters
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getShiftStatistics(
      req.user.tenantId,
      start,
      end
    );
  }

  // Get users who worked in date range
  @Get('users-by-date')
  async getUsersByDateRange(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getUsersByDateRange(
      req.user.tenantId,
      start,
      end
    );
  }

  // Get tills used in date range
  @Get('tills-by-date')
  async getTillsByDateRange(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getTillsByDateRange(
      req.user.tenantId,
      start,
      end
    );
  }
}
