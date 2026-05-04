import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PayrollCalcService } from './payroll-calc.service';
import { CreatePayrollRunDto, AddPayslipAdjustmentsDto } from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calc: PayrollCalcService,
  ) {}

  // ─── Payroll Runs ────────────────────────────────────────────────────────────

  async createRun(
    dto: CreatePayrollRunDto,
    tenantId: string,
    createdBy: string,
  ) {
    // Prevent overlapping runs in non-locked state
    const overlap = await this.prisma.hrms_payroll_runs.findFirst({
      where: {
        tenantId,
        status: { not: 'LOCKED' as any },
        periodStart: { lte: new Date(dto.periodEnd) },
        periodEnd: { gte: new Date(dto.periodStart) },
      },
    });
    if (overlap) {
      throw new ConflictException(
        `A payroll run already exists overlapping ${dto.periodStart}–${dto.periodEnd}`,
      );
    }

    const run = await this.prisma.hrms_payroll_runs.create({
      data: {
        tenantId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        payDate: new Date(dto.payDate),
        payFrequency: (dto.payFrequency as any) ?? 'MONTHLY',
        status: 'DRAFT' as any,
        createdBy,
        notes: dto.notes,
        employeeCount: 0,
        totalGross: 0,
        totalTax: 0,
        totalEmployeeNI: 0,
        totalEmployerNI: 0,
        totalEmployeePension: 0,
        totalEmployerPension: 0,
        totalNetPay: 0,
      },
    });

    this.logger.log(`Payroll run ${run.id} created for tenant ${tenantId}`);
    return this.mapRun(run);
  }

  async getRuns(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [runs, total] = await Promise.all([
      this.prisma.hrms_payroll_runs.findMany({
        where: { tenantId },
        orderBy: { periodStart: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { payslips: true } } },
      }),
      this.prisma.hrms_payroll_runs.count({ where: { tenantId } }),
    ]);

    return {
      data: runs.map((r) => this.mapRun(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRun(id: string, tenantId: string) {
    const run = await this.prisma.hrms_payroll_runs.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { payslips: true } } },
    });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);
    return this.mapRun(run);
  }

  async deleteRun(id: string, tenantId: string) {
    const run = await this.prisma.hrms_payroll_runs.findFirst({ where: { id, tenantId } });
    if (!run) throw new NotFoundException(`Payroll run ${id} not found`);
    if (run.status === 'LOCKED') throw new BadRequestException('Cannot delete a locked payroll run');
    await this.prisma.hrms_payroll_runs.delete({ where: { id } });
  }

  // ─── Payslip Generation ──────────────────────────────────────────────────────

  async generatePayslips(runId: string, tenantId: string) {
    const run = await this.prisma.hrms_payroll_runs.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);
    if (run.status === 'LOCKED') throw new BadRequestException('Payroll run is locked and cannot be modified');

    // Remove existing draft payslips (allow regeneration)
    await this.prisma.hrms_payslips.deleteMany({
      where: { payrollRunId: runId, status: 'DRAFT' as any },
    });

    const employees = await this.prisma.hrms_employees.findMany({
      where: {
        tenantId,
        isActive: true,
        status: { not: 'TERMINATED' as any },
      },
    });

    const frequency = String(run.payFrequency);
    const taxYearStart = this.getTaxYearStart(run.payDate);

    const rows: any[] = [];
    for (const emp of employees) {
      const basicPay = this.calc.estimateBasicPay({
        frequency,
        salary: emp.salary ? Number(emp.salary) : null,
        hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : null,
        contractedHours: emp.contractedHours ? Number(emp.contractedHours) : null,
      });

      const result = this.calc.calculate({
        grossPay: basicPay,
        taxCode: emp.taxCode ?? '1257L',
        niCategory: String(emp.niCategory ?? 'A'),
        frequency,
        pensionEligible: emp.pensionEligible,
        pensionEnrolled: emp.pensionEnrolled,
        employerPensionPct: emp.employerPensionPct ? Number(emp.employerPensionPct) : 3,
        employeePensionPct: emp.employeePensionPct ? Number(emp.employeePensionPct) : 5,
        studentLoanPlan: emp.studentLoanPlan,
      });

      // Year-to-date from finalized payslips in this tax year
      const ytd = await this.prisma.hrms_payslips.aggregate({
        where: {
          employeeId: emp.id,
          tenantId,
          status: 'FINAL' as any,
          payDate: { gte: taxYearStart, lt: run.payDate },
        },
        _sum: { grossPay: true, paye: true, employeeNI: true },
      });

      rows.push({
        tenantId,
        payrollRunId: runId,
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        payPeriodStart: run.periodStart,
        payPeriodEnd: run.periodEnd,
        payDate: run.payDate,
        payFrequency: run.payFrequency,
        taxCode: emp.taxCode ?? '1257L',
        niCategory: emp.niCategory ?? 'A',
        basicPay: result.grossPay,
        overtimePay: 0,
        bonusPay: 0,
        commissionPay: 0,
        sickPay: 0,
        holidayPay: 0,
        otherAdditions: 0,
        grossPay: result.grossPay,
        paye: result.paye,
        employeeNI: result.employeeNI,
        employerNI: result.employerNI,
        employeePension: result.employeePension,
        employerPension: result.employerPension,
        studentLoanRepayment: result.studentLoanRepayment,
        otherDeductions: 0,
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        pensionEligible: emp.pensionEligible,
        pensionEnrolled: emp.pensionEnrolled,
        ytdGross: Number(ytd._sum.grossPay ?? 0) + result.grossPay,
        ytdTax: Number(ytd._sum.paye ?? 0) + result.paye,
        ytdEmployeeNI: Number(ytd._sum.employeeNI ?? 0) + result.employeeNI,
        status: 'DRAFT',
      });
    }

    if (rows.length > 0) {
      await this.prisma.hrms_payslips.createMany({ data: rows });
    }

    await this.updateRunTotals(runId);
    this.logger.log(`Generated ${rows.length} payslips for run ${runId}`);
    return { generated: rows.length };
  }

  // ─── Payslips ────────────────────────────────────────────────────────────────

  async getPayslips(runId: string, tenantId: string) {
    const run = await this.prisma.hrms_payroll_runs.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);

    return this.prisma.hrms_payslips.findMany({
      where: { payrollRunId: runId, tenantId },
      orderBy: { employeeName: 'asc' },
    });
  }

  async getPayslip(id: string, tenantId: string) {
    const slip = await this.prisma.hrms_payslips.findFirst({
      where: { id, tenantId },
      include: { payrollRun: true },
    });
    if (!slip) throw new NotFoundException(`Payslip ${id} not found`);
    return slip;
  }

  async updatePayslip(id: string, dto: AddPayslipAdjustmentsDto, tenantId: string) {
    const slip = await this.prisma.hrms_payslips.findFirst({
      where: { id, tenantId },
      include: { payrollRun: true, employee: true },
    });
    if (!slip) throw new NotFoundException(`Payslip ${id} not found`);
    if (slip.payrollRun.status === 'LOCKED') throw new BadRequestException('Payroll run is locked');

    const grossPay =
      Number(slip.basicPay) +
      (dto.overtimePay ?? Number(slip.overtimePay)) +
      (dto.bonusPay ?? Number(slip.bonusPay)) +
      (dto.commissionPay ?? Number(slip.commissionPay)) +
      (dto.sickPay ?? Number(slip.sickPay)) +
      (dto.holidayPay ?? Number(slip.holidayPay)) +
      (dto.otherAdditions ?? Number(slip.otherAdditions));

    const emp = slip.employee;
    const result = this.calc.calculate({
      grossPay,
      taxCode: String(slip.taxCode),
      niCategory: String(slip.niCategory),
      frequency: String(slip.payFrequency),
      pensionEligible: slip.pensionEligible,
      pensionEnrolled: slip.pensionEnrolled,
      employerPensionPct: emp?.employerPensionPct ? Number(emp.employerPensionPct) : 3,
      employeePensionPct: emp?.employeePensionPct ? Number(emp.employeePensionPct) : 5,
      studentLoanPlan: emp?.studentLoanPlan ?? null,
    });

    const extraDeductions = dto.otherDeductions ?? Number(slip.otherDeductions);

    const updated = await this.prisma.hrms_payslips.update({
      where: { id },
      data: {
        overtimePay: dto.overtimePay ?? Number(slip.overtimePay),
        bonusPay: dto.bonusPay ?? Number(slip.bonusPay),
        commissionPay: dto.commissionPay ?? Number(slip.commissionPay),
        sickPay: dto.sickPay ?? Number(slip.sickPay),
        holidayPay: dto.holidayPay ?? Number(slip.holidayPay),
        otherAdditions: dto.otherAdditions ?? Number(slip.otherAdditions),
        otherDeductions: extraDeductions,
        notes: dto.notes !== undefined ? dto.notes : slip.notes,
        grossPay: result.grossPay,
        paye: result.paye,
        employeeNI: result.employeeNI,
        employerNI: result.employerNI,
        employeePension: result.employeePension,
        employerPension: result.employerPension,
        studentLoanRepayment: result.studentLoanRepayment,
        totalDeductions: Math.round((result.totalDeductions + extraDeductions) * 100) / 100,
        netPay: Math.max(0, Math.round((result.netPay - extraDeductions) * 100) / 100),
        updatedAt: new Date(),
      },
    });

    await this.updateRunTotals(slip.payrollRunId);
    return updated;
  }

  // ─── Finalize (Lock) ─────────────────────────────────────────────────────────

  async finalizeRun(runId: string, tenantId: string) {
    const run = await this.prisma.hrms_payroll_runs.findFirst({ where: { id: runId, tenantId } });
    if (!run) throw new NotFoundException(`Payroll run ${runId} not found`);
    if (run.status === 'LOCKED') throw new BadRequestException('Payroll run is already locked');

    const count = await this.prisma.hrms_payslips.count({ where: { payrollRunId: runId } });
    if (count === 0) {
      throw new BadRequestException('Generate payslips before finalizing the payroll run');
    }

    await this.prisma.hrms_payslips.updateMany({
      where: { payrollRunId: runId, status: 'DRAFT' as any },
      data: { status: 'FINAL' as any },
    });

    await this.updateRunTotals(runId);

    const locked = await this.prisma.hrms_payroll_runs.update({
      where: { id: runId },
      data: {
        status: 'LOCKED' as any,
        processedAt: new Date(),
        lockedAt: new Date(),
      },
      include: { _count: { select: { payslips: true } } },
    });

    this.logger.log(`Payroll run ${runId} finalized with ${count} payslips`);
    return this.mapRun(locked);
  }

  // ─── Employee payslip history ────────────────────────────────────────────────

  async getEmployeePayslips(employeeId: string, tenantId: string) {
    const emp = await this.prisma.hrms_employees.findFirst({ where: { id: employeeId, tenantId } });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.prisma.hrms_payslips.findMany({
      where: { employeeId, tenantId, status: 'FINAL' as any },
      include: {
        payrollRun: {
          select: { id: true, periodStart: true, periodEnd: true, payDate: true, payFrequency: true },
        },
      },
      orderBy: { payDate: 'desc' },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async updateRunTotals(runId: string) {
    const agg = await this.prisma.hrms_payslips.aggregate({
      where: { payrollRunId: runId },
      _count: { id: true },
      _sum: {
        grossPay: true,
        paye: true,
        employeeNI: true,
        employerNI: true,
        employeePension: true,
        employerPension: true,
        netPay: true,
      },
    });

    await this.prisma.hrms_payroll_runs.update({
      where: { id: runId },
      data: {
        employeeCount: agg._count.id,
        totalGross: Number(agg._sum.grossPay ?? 0),
        totalTax: Number(agg._sum.paye ?? 0),
        totalEmployeeNI: Number(agg._sum.employeeNI ?? 0),
        totalEmployerNI: Number(agg._sum.employerNI ?? 0),
        totalEmployeePension: Number(agg._sum.employeePension ?? 0),
        totalEmployerPension: Number(agg._sum.employerPension ?? 0),
        totalNetPay: Number(agg._sum.netPay ?? 0),
        updatedAt: new Date(),
      },
    });
  }

  private getTaxYearStart(date: Date): Date {
    const year = date.getFullYear();
    const aprilSixth = new Date(year, 3, 6); // April 6
    return date >= aprilSixth ? aprilSixth : new Date(year - 1, 3, 6);
  }

  private mapRun(run: any) {
    return {
      id: run.id,
      tenantId: run.tenantId,
      periodStart: run.periodStart?.toISOString(),
      periodEnd: run.periodEnd?.toISOString(),
      payDate: run.payDate?.toISOString(),
      payFrequency: run.payFrequency,
      status: run.status,
      employeeCount: run.employeeCount,
      totalGross: Number(run.totalGross),
      totalTax: Number(run.totalTax),
      totalEmployeeNI: Number(run.totalEmployeeNI),
      totalEmployerNI: Number(run.totalEmployerNI),
      totalEmployeePension: Number(run.totalEmployeePension),
      totalEmployerPension: Number(run.totalEmployerPension),
      totalNetPay: Number(run.totalNetPay),
      createdBy: run.createdBy,
      processedAt: run.processedAt?.toISOString(),
      lockedAt: run.lockedAt?.toISOString(),
      notes: run.notes,
      payslipCount: run._count?.payslips ?? 0,
      createdAt: run.createdAt?.toISOString(),
      updatedAt: run.updatedAt?.toISOString(),
    };
  }
}
