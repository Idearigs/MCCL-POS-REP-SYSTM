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
import { ReportsService } from './reports.service';
import { CreateP11dBenefitDto } from './dto/reports.dto';

@ApiTags('HRMS - Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hrms/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── P60 ─────────────────────────────────────────────────────────────────────

  @Get('p60')
  @ApiOperation({
    summary: 'Get P60 summaries for all employees for a tax year',
  })
  getAllP60s(@Query('taxYear') taxYear: string, @Request() req: any) {
    return this.reportsService.getAllP60s(
      taxYear ?? currentTaxYear(),
      req.user.tenantId,
    );
  }

  @Get('p60/:employeeId')
  @ApiOperation({ summary: 'Get P60 summary for a single employee' })
  getP60(
    @Param('employeeId') employeeId: string,
    @Query('taxYear') taxYear: string,
    @Request() req: any,
  ) {
    return this.reportsService.getP60(
      employeeId,
      taxYear ?? currentTaxYear(),
      req.user.tenantId,
    );
  }

  // ─── P11D ─────────────────────────────────────────────────────────────────────

  @Get('p11d')
  @ApiOperation({
    summary: 'Get all P11D benefits grouped by employee for a tax year',
  })
  getAllP11ds(@Query('taxYear') taxYear: string, @Request() req: any) {
    return this.reportsService.getAllP11ds(
      taxYear ?? currentTaxYear(),
      req.user.tenantId,
    );
  }

  @Get('p11d/:employeeId')
  @ApiOperation({ summary: 'Get P11D benefits for a single employee' })
  getP11d(
    @Param('employeeId') employeeId: string,
    @Query('taxYear') taxYear: string,
    @Request() req: any,
  ) {
    return this.reportsService.getP11dBenefits(
      employeeId,
      taxYear ?? currentTaxYear(),
      req.user.tenantId,
    );
  }

  @Post('p11d/:employeeId')
  @ApiOperation({ summary: 'Add a P11D benefit for an employee' })
  createP11d(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateP11dBenefitDto,
    @Request() req: any,
  ) {
    return this.reportsService.createP11dBenefit(
      employeeId,
      dto,
      req.user.tenantId,
    );
  }

  @Delete('p11d/benefit/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a P11D benefit entry' })
  deleteP11d(@Param('id') id: string, @Request() req: any) {
    return this.reportsService.deleteP11dBenefit(id, req.user.tenantId);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  @Get('analytics/payroll')
  @ApiOperation({
    summary:
      'Payroll cost analytics with monthly trend and department breakdown',
  })
  payrollAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.reportsService.getPayrollAnalytics(req.user.tenantId, from, to);
  }

  @Get('analytics/attendance')
  @ApiOperation({
    summary: 'Attendance analytics with WTD compliance and absence rates',
  })
  attendanceAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.reportsService.getAttendanceAnalytics(
      req.user.tenantId,
      from,
      to,
    );
  }
}

function currentTaxYear(): string {
  const now = new Date();
  const yr = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  const startYr = m > 4 || (m === 4 && d >= 6) ? yr : yr - 1;
  return `${startYr}-${String(startYr + 1).slice(2)}`;
}
