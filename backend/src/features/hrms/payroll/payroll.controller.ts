import {
  Controller,
  Get,
  Post,
  Put,
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
import { PayrollService } from './payroll.service';
import {
  CreatePayrollRunDto,
  AddPayslipAdjustmentsDto,
} from './dto/payroll.dto';

@ApiTags('HRMS - Payroll')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hrms/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ─── Payroll Runs ──────────────────────────────────────────────────────────

  @Post('runs')
  @ApiOperation({ summary: 'Create a new payroll run' })
  createRun(@Body() dto: CreatePayrollRunDto, @Request() req: any) {
    return this.payrollService.createRun(dto, req.user.tenantId, req.user.sub);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List payroll runs' })
  getRuns(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    return this.payrollService.getRuns(
      req.user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get payroll run details' })
  getRun(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.getRun(id, req.user.tenantId);
  }

  @Delete('runs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete draft payroll run' })
  deleteRun(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.deleteRun(id, req.user.tenantId);
  }

  @Post('runs/:id/generate')
  @ApiOperation({ summary: 'Generate payslips for all active employees' })
  generate(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.generatePayslips(id, req.user.tenantId);
  }

  @Post('runs/:id/finalize')
  @ApiOperation({ summary: 'Finalize and lock payroll run' })
  finalize(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.finalizeRun(id, req.user.tenantId);
  }

  // ─── Payslips ──────────────────────────────────────────────────────────────

  @Get('runs/:id/payslips')
  @ApiOperation({ summary: 'Get all payslips for a payroll run' })
  getPayslips(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.getPayslips(id, req.user.tenantId);
  }

  @Get('payslips/:id')
  @ApiOperation({ summary: 'Get a single payslip' })
  getPayslip(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.getPayslip(id, req.user.tenantId);
  }

  @Put('payslips/:id')
  @ApiOperation({
    summary: 'Update payslip adjustments (overtime, bonuses, etc.)',
  })
  updatePayslip(
    @Param('id') id: string,
    @Body() dto: AddPayslipAdjustmentsDto,
    @Request() req: any,
  ) {
    return this.payrollService.updatePayslip(id, dto, req.user.tenantId);
  }

  // ─── Employee payslip history ─────────────────────────────────────────────

  @Get('employees/:employeeId/payslips')
  @ApiOperation({ summary: 'Get finalized payslip history for an employee' })
  getEmployeePayslips(
    @Param('employeeId') employeeId: string,
    @Request() req: any,
  ) {
    return this.payrollService.getEmployeePayslips(
      employeeId,
      req.user.tenantId,
    );
  }
}
