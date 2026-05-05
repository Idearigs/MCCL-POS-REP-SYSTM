import { Module } from '@nestjs/common';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { EncryptionService } from './employees/encryption.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';
import { PayrollCalcService } from './payroll/payroll-calc.service';
import { AttendanceController } from './attendance/attendance.controller';
import { AttendanceService } from './attendance/attendance.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { CacheServiceModule } from '../../core/cache/cache.module';

@Module({
  imports: [CacheServiceModule],
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
    AttendanceService,
    ReportsService,
  ],
  exports: [
    EmployeesService,
    PayrollService,
    AttendanceService,
    ReportsService,
  ],
})
export class HrmsModule {}
