import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { BulkUpsertEntriesDto, RejectTimesheetDto } from './dto/attendance.dto';

@ApiTags('HRMS - Attendance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hrms/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ─── Weekly Overview ──────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Get weekly attendance overview for all employees' })
  getOverview(@Query('weekStart') weekStart: string, @Request() req: any) {
    const ws = weekStart || new Date().toISOString().split('T')[0];
    return this.attendanceService.getWeeklyOverview(ws, req.user.tenantId);
  }

  // ─── Timesheets ───────────────────────────────────────────────────────────

  @Get('timesheets/:employeeId')
  @ApiOperation({ summary: 'Get or create timesheet for employee + week' })
  getTimesheet(
    @Param('employeeId') employeeId: string,
    @Query('weekStart') weekStart: string,
    @Request() req: any,
  ) {
    const ws = weekStart || new Date().toISOString().split('T')[0];
    return this.attendanceService.getOrCreateTimesheet(
      employeeId,
      ws,
      req.user.tenantId,
    );
  }

  @Post('timesheets/:employeeId/entries')
  @ApiOperation({
    summary: 'Save all entries for an employee week (bulk upsert)',
  })
  bulkUpsert(
    @Param('employeeId') employeeId: string,
    @Query('weekStart') weekStart: string,
    @Body() dto: BulkUpsertEntriesDto,
    @Request() req: any,
  ) {
    const ws = weekStart || new Date().toISOString().split('T')[0];
    return this.attendanceService.bulkUpsertEntries(
      employeeId,
      ws,
      dto,
      req.user.tenantId,
    );
  }

  @Delete('timesheets/:timesheetId/entries/:entryDate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a single day entry' })
  deleteEntry(
    @Param('timesheetId') timesheetId: string,
    @Param('entryDate') entryDate: string,
    @Request() req: any,
  ) {
    return this.attendanceService.deleteEntry(
      timesheetId,
      entryDate,
      req.user.tenantId,
    );
  }

  @Post('timesheets/:id/submit')
  @ApiOperation({ summary: 'Submit timesheet for approval' })
  submit(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.submitTimesheet(id, req.user.tenantId);
  }

  @Post('timesheets/:id/approve')
  @ApiOperation({ summary: 'Approve a submitted timesheet' })
  approve(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.approveTimesheet(
      id,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Post('timesheets/:id/reject')
  @ApiOperation({ summary: 'Reject a submitted timesheet' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectTimesheetDto,
    @Request() req: any,
  ) {
    return this.attendanceService.rejectTimesheet(id, dto, req.user.tenantId);
  }

  // ─── WTD ─────────────────────────────────────────────────────────────────

  @Get('wtd/:employeeId')
  @ApiOperation({ summary: 'Get WTD 17-week rolling average for employee' })
  getWtd(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.attendanceService.calculateWtdAverage(
      employeeId,
      req.user.tenantId,
    );
  }

  @Get('zero-hours/:employeeId')
  @ApiOperation({ summary: 'Get zero-hours holiday accrual (12.07% of hours)' })
  getZeroHours(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.attendanceService.calculateZeroHoursHoliday(
      employeeId,
      req.user.tenantId,
    );
  }

  // ─── Bank Holidays ────────────────────────────────────────────────────────

  @Get('bank-holidays')
  @ApiOperation({ summary: 'List bank holidays for a year' })
  getBankHolidays(@Query('year') year: string, @Request() req: any) {
    return this.attendanceService.getBankHolidays(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      req.user.tenantId,
    );
  }

  @Post('bank-holidays/seed')
  @ApiOperation({ summary: 'Seed England & Wales bank holidays for a year' })
  seedBankHolidays(@Query('year') year: string, @Request() req: any) {
    return this.attendanceService.seedBankHolidays(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      req.user.tenantId,
    );
  }

  @Delete('bank-holidays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bank holiday entry' })
  deleteBankHoliday(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.deleteBankHoliday(id, req.user.tenantId);
  }
}
