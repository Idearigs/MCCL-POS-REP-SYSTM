import { Module } from '@nestjs/common';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { EncryptionService } from './employees/encryption.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';
import { PayrollCalcService } from './payroll/payroll-calc.service';
import { PayslipPdfService } from './payroll/payslip-pdf.service';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceService } from './attendance/attendance.service';
import { TimesheetTokensService } from './attendance/timesheet-tokens.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsPdfService } from './reports/reports-pdf.service';
import { CacheServiceModule } from '../../core/cache/cache.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CacheServiceModule, SettingsModule],
  controllers: [
    EmployeesController,
    PayrollController,
    AttendanceController,
    ReportsController,
  ],
  providers: [
    EmployeesService,
    EncryptionService,
    PayrollService,
    PayrollCalcService,
    PayslipPdfService,
    AttendanceService,
    TimesheetTokensService,
    ReportsService,
    ReportsPdfService,
  ],
  exports: [
    EmployeesService,
    PayrollService,
    AttendanceService,
    ReportsService,
  ],
})
export class HrmsModule {}
