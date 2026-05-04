import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateP11dBenefitDto } from './dto/reports.dto';

function generateId(): string {
  return require('crypto').randomUUID();
}

// ── Tax Year helpers ──────────────────────────────────────────────────────────

function parseTaxYear(taxYear: string): { start: Date; end: Date } {
  // "2024-25" → Apr 6 2024 – Apr 5 2025
  const parts = taxYear.split('-');
  if (parts.length !== 2) throw new BadRequestException('taxYear must be "YYYY-YY", e.g. "2024-25"');
  const startYr = parseInt(parts[0], 10);
  if (isNaN(startYr)) throw new BadRequestException('Invalid taxYear');
  const endYr = startYr + 1;
  return {
    start: new Date(`${startYr}-04-06T00:00:00.000Z`),
    end:   new Date(`${endYr}-04-05T23:59:59.999Z`),
  };
}

function currentTaxYear(): string {
  const now = new Date();
  const yr = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const startYr = (month > 4 || (month === 4 && day >= 6)) ? yr : yr - 1;
  const endShort = String(startYr + 1).slice(2);
  return `${startYr}-${endShort}`;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── P60 ─────────────────────────────────────────────────────────────────────

  async getP60(employeeId: string, taxYear: string, tenantId: string) {
    const { start, end } = parseTaxYear(taxYear);

    const [employee, payslips] = await Promise.all([
      this.prisma.hrms_employees.findFirst({
        where: { id: employeeId, tenantId },
        select: {
          id: true, employeeNumber: true,
          firstName: true, lastName: true,
          taxCode: true, niCategory: true,
          niNumber: true,
          addressLine1: true, addressLine2: true,
          city: true, postcode: true,
        },
      }),
      this.prisma.hrms_payslips.findMany({
        where: {
          employeeId,
          tenantId,
          status: 'FINAL' as any,
          payDate: { gte: start, lte: end },
        },
        orderBy: { payDate: 'asc' },
      }),
    ]);

    if (!employee) throw new NotFoundException('Employee not found');

    const totals = payslips.reduce(
      (acc, p) => ({
        grossPay:        acc.grossPay        + Number(p.grossPay),
        paye:            acc.paye            + Number(p.paye),
        employeeNI:      acc.employeeNI      + Number(p.employeeNI),
        employerNI:      acc.employerNI      + Number(p.employerNI),
        employeePension: acc.employeePension + Number(p.employeePension),
        employerPension: acc.employerPension + Number(p.employerPension),
        studentLoan:     acc.studentLoan     + Number(p.studentLoanRepayment),
        netPay:          acc.netPay          + Number(p.netPay),
      }),
      { grossPay: 0, paye: 0, employeeNI: 0, employerNI: 0,
        employeePension: 0, employerPension: 0, studentLoan: 0, netPay: 0 },
    );

    const lastPayslip = payslips[payslips.length - 1];

    return {
      taxYear,
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        fullName: `${employee.firstName} ${employee.lastName}`,
        taxCode: lastPayslip?.taxCode ?? employee.taxCode ?? '1257L',
        niCategory: lastPayslip?.niCategory ?? employee.niCategory,
        niNumberMasked: employee.niNumber
          ? `${employee.niNumber.slice(0, 2)}****${employee.niNumber.slice(-2)}`
          : undefined,
        addressLine1: employee.addressLine1,
        addressLine2: employee.addressLine2,
        city: employee.city,
        postcode: employee.postcode,
      },
      summary: {
        ...totals,
        payslipCount: payslips.length,
        taxYearStart: start.toISOString().split('T')[0],
        taxYearEnd:   end.toISOString().split('T')[0],
      },
    };
  }

  async getAllP60s(taxYear: string, tenantId: string) {
    const { start, end } = parseTaxYear(taxYear);

    const employees = await this.prisma.hrms_employees.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, employeeNumber: true,
        firstName: true, lastName: true,
        taxCode: true, niCategory: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const payslips = await this.prisma.hrms_payslips.findMany({
      where: {
        tenantId,
        status: 'FINAL' as any,
        payDate: { gte: start, lte: end },
      },
    });

    const byEmployee = new Map<string, typeof payslips>();
    for (const p of payslips) {
      if (!byEmployee.has(p.employeeId)) byEmployee.set(p.employeeId, []);
      byEmployee.get(p.employeeId)!.push(p);
    }

    return employees
      .filter(e => (byEmployee.get(e.id)?.length ?? 0) > 0)
      .map(e => {
        const slips = byEmployee.get(e.id) ?? [];
        const last = slips[slips.length - 1];
        const totals = slips.reduce(
          (acc, p) => ({
            grossPay:   acc.grossPay   + Number(p.grossPay),
            paye:       acc.paye       + Number(p.paye),
            employeeNI: acc.employeeNI + Number(p.employeeNI),
            netPay:     acc.netPay     + Number(p.netPay),
          }),
          { grossPay: 0, paye: 0, employeeNI: 0, netPay: 0 },
        );
        return {
          employeeId: e.id,
          employeeNumber: e.employeeNumber,
          fullName: `${e.firstName} ${e.lastName}`,
          department: (e.department as any)?.name,
          taxCode: last?.taxCode ?? e.taxCode ?? '1257L',
          niCategory: last?.niCategory ?? e.niCategory,
          payslipCount: slips.length,
          ...totals,
        };
      });
  }

  // ─── P11D Benefits ────────────────────────────────────────────────────────────

  async getP11dBenefits(employeeId: string, taxYear: string, tenantId: string) {
    const employee = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const benefits = await this.prisma.hrms_p11d_benefits.findMany({
      where: { employeeId, tenantId, taxYear },
      orderBy: { createdAt: 'asc' },
    });

    const total = benefits.reduce((s, b) => s + Number(b.cashEquivalent), 0);

    return {
      employee: {
        ...employee,
        fullName: `${employee.firstName} ${employee.lastName}`,
      },
      taxYear,
      benefits: benefits.map(b => ({
        id: b.id,
        benefitType: b.benefitType,
        description: b.description,
        cashEquivalent: Number(b.cashEquivalent),
        notes: b.notes,
        createdAt: b.createdAt,
      })),
      totalCashEquivalent: total,
    };
  }

  async createP11dBenefit(
    employeeId: string,
    dto: CreateP11dBenefitDto,
    tenantId: string,
  ) {
    const employee = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const now = new Date();
    const benefit = await this.prisma.hrms_p11d_benefits.create({
      data: {
        id: generateId(),
        tenantId,
        employeeId,
        taxYear: dto.taxYear,
        benefitType: dto.benefitType as any,
        description: dto.description,
        cashEquivalent: dto.cashEquivalent,
        notes: dto.notes,
        updatedAt: now,
      },
    });

    return {
      id: benefit.id,
      benefitType: benefit.benefitType,
      description: benefit.description,
      cashEquivalent: Number(benefit.cashEquivalent),
      taxYear: benefit.taxYear,
      notes: benefit.notes,
      createdAt: benefit.createdAt,
    };
  }

  async deleteP11dBenefit(id: string, tenantId: string) {
    const benefit = await this.prisma.hrms_p11d_benefits.findFirst({
      where: { id, tenantId },
    });
    if (!benefit) throw new NotFoundException('Benefit not found');
    await this.prisma.hrms_p11d_benefits.delete({ where: { id } });
  }

  async getAllP11ds(taxYear: string, tenantId: string) {
    const benefits = await this.prisma.hrms_p11d_benefits.findMany({
      where: { tenantId, taxYear },
      include: {
        employee: {
          select: {
            employeeNumber: true, firstName: true, lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { employee: { lastName: 'asc' } },
        { benefitType: 'asc' },
      ],
    });

    // Group by employee
    const byEmp = new Map<string, {
      employeeId: string;
      employeeNumber: string;
      fullName: string;
      department?: string;
      total: number;
      benefits: typeof benefits;
    }>();

    for (const b of benefits) {
      if (!byEmp.has(b.employeeId)) {
        byEmp.set(b.employeeId, {
          employeeId: b.employeeId,
          employeeNumber: (b.employee as any).employeeNumber,
          fullName: `${(b.employee as any).firstName} ${(b.employee as any).lastName}`,
          department: (b.employee as any).department?.name,
          total: 0,
          benefits: [],
        });
      }
      const entry = byEmp.get(b.employeeId)!;
      entry.total += Number(b.cashEquivalent);
      entry.benefits.push(b);
    }

    return {
      taxYear,
      employees: Array.from(byEmp.values()).map(e => ({
        ...e,
        benefits: e.benefits.map(b => ({
          id: b.id,
          benefitType: b.benefitType,
          description: b.description,
          cashEquivalent: Number(b.cashEquivalent),
          notes: b.notes,
        })),
      })),
      grandTotal: Array.from(byEmp.values()).reduce((s, e) => s + e.total, 0),
    };
  }

  // ─── Payroll Analytics ────────────────────────────────────────────────────────

  async getPayrollAnalytics(tenantId: string, from?: string, to?: string) {
    const end   = to   ? new Date(to)   : new Date();
    // Default: last 12 full months
    const start = from ? new Date(from) : new Date(new Date(end).setMonth(end.getMonth() - 11));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const payslips = await this.prisma.hrms_payslips.findMany({
      where: {
        tenantId,
        status: 'FINAL' as any,
        payDate: { gte: start, lte: end },
      },
      include: {
        employee: {
          select: { departmentId: true, department: { select: { name: true } } },
        },
      },
    });

    // Monthly trend
    const monthMap = new Map<string, {
      month: string;
      gross: number; net: number; paye: number;
      employeeNI: number; employerNI: number;
      pension: number; headcount: number;
    }>();

    for (const p of payslips) {
      const d = new Date(p.payDate);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, { month: key, gross: 0, net: 0, paye: 0, employeeNI: 0, employerNI: 0, pension: 0, headcount: 0 });
      }
      const m = monthMap.get(key)!;
      m.gross        += Number(p.grossPay);
      m.net          += Number(p.netPay);
      m.paye         += Number(p.paye);
      m.employeeNI   += Number(p.employeeNI);
      m.employerNI   += Number(p.employerNI);
      m.pension      += Number(p.employeePension) + Number(p.employerPension);
      m.headcount    += 1;
    }

    const monthlyTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // Department breakdown
    const deptMap = new Map<string, { name: string; gross: number; count: number }>();
    for (const p of payslips) {
      const deptId   = (p.employee as any)?.departmentId ?? 'unassigned';
      const deptName = (p.employee as any)?.department?.name ?? 'Unassigned';
      if (!deptMap.has(deptId)) deptMap.set(deptId, { name: deptName, gross: 0, count: 0 });
      const d = deptMap.get(deptId)!;
      d.gross += Number(p.grossPay);
      d.count += 1;
    }

    const departmentBreakdown = Array.from(deptMap.values())
      .sort((a, b) => b.gross - a.gross);

    // Pay type breakdown (totals across whole period)
    const payTypeTotals = payslips.reduce(
      (acc, p) => ({
        basicPay:       acc.basicPay       + Number(p.basicPay),
        overtimePay:    acc.overtimePay    + Number(p.overtimePay),
        bonusPay:       acc.bonusPay       + Number(p.bonusPay),
        commissionPay:  acc.commissionPay  + Number(p.commissionPay),
        sickPay:        acc.sickPay        + Number(p.sickPay),
        holidayPay:     acc.holidayPay     + Number(p.holidayPay),
        otherAdditions: acc.otherAdditions + Number(p.otherAdditions),
      }),
      { basicPay: 0, overtimePay: 0, bonusPay: 0, commissionPay: 0,
        sickPay: 0, holidayPay: 0, otherAdditions: 0 },
    );

    const totals = payslips.reduce(
      (acc, p) => ({
        gross: acc.gross + Number(p.grossPay),
        net:   acc.net   + Number(p.netPay),
        paye:  acc.paye  + Number(p.paye),
        ni:    acc.ni    + Number(p.employeeNI) + Number(p.employerNI),
        headcount: acc.headcount + 1,
      }),
      { gross: 0, net: 0, paye: 0, ni: 0, headcount: 0 },
    );

    return {
      period: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      totals,
      monthlyTrend,
      departmentBreakdown,
      payTypeTotals,
    };
  }

  // ─── Attendance Analytics ─────────────────────────────────────────────────────

  async getAttendanceAnalytics(tenantId: string, from?: string, to?: string) {
    const end   = to   ? new Date(to)   : new Date();
    const start = from ? new Date(from) : new Date(new Date(end).setDate(end.getDate() - 91)); // ~13 weeks

    const timesheets = await this.prisma.hrms_timesheets.findMany({
      where: {
        tenantId,
        weekStartDate: { gte: start, lte: end },
      },
      include: {
        entries:  { select: { entryType: true, hoursWorked: true } },
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeNumber: true,
            departmentId: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Weekly hours trend
    const weekMap = new Map<string, { week: string; totalHours: number; approved: number; submitted: number; draft: number }>();
    for (const ts of timesheets) {
      const key = ts.weekStartDate.toISOString().split('T')[0];
      if (!weekMap.has(key)) weekMap.set(key, { week: key, totalHours: 0, approved: 0, submitted: 0, draft: 0 });
      const w = weekMap.get(key)!;
      w.totalHours += Number(ts.totalHours);
      if      (ts.status === 'APPROVED')  w.approved++;
      else if (ts.status === 'SUBMITTED') w.submitted++;
      else                                 w.draft++;
    }

    const weeklyTrend = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    // WTD compliance
    const approved = timesheets.filter(ts => ts.status === 'APPROVED');
    const wtdCounts = { ok: 0, warning: 0, violation: 0 };
    for (const ts of approved) {
      const avg = Number(ts.totalHours);
      if      (avg > 48) wtdCounts.violation++;
      else if (avg > 44) wtdCounts.warning++;
      else               wtdCounts.ok++;
    }

    // Absence by type
    const absenceMap = new Map<string, number>();
    for (const ts of timesheets) {
      for (const e of ts.entries) {
        if (['SICK', 'ANNUAL_LEAVE', 'BANK_HOLIDAY', 'UNPAID', 'OTHER'].includes(e.entryType as string)) {
          const key = e.entryType as string;
          absenceMap.set(key, (absenceMap.get(key) ?? 0) + Number(e.hoursWorked));
        }
      }
    }

    const absenceByType = Array.from(absenceMap.entries())
      .map(([type, hours]) => ({ type, hours }))
      .sort((a, b) => b.hours - a.hours);

    // Department attendance
    const deptMap = new Map<string, { name: string; totalHours: number; regularHours: number; overtimeHours: number; headcount: Set<string> }>();
    for (const ts of approved) {
      const deptId   = (ts.employee as any)?.departmentId ?? 'unassigned';
      const deptName = (ts.employee as any)?.department?.name ?? 'Unassigned';
      if (!deptMap.has(deptId)) deptMap.set(deptId, { name: deptName, totalHours: 0, regularHours: 0, overtimeHours: 0, headcount: new Set() });
      const d = deptMap.get(deptId)!;
      d.totalHours   += Number(ts.totalHours);
      d.regularHours += Number(ts.regularHours);
      d.overtimeHours += Number(ts.overtimeHours);
      d.headcount.add(ts.employeeId);
    }

    const departmentAttendance = Array.from(deptMap.values())
      .map(d => ({ ...d, headcount: d.headcount.size }))
      .sort((a, b) => b.totalHours - a.totalHours);

    // Top performers (most approved regular hours)
    const empMap = new Map<string, { employeeId: string; fullName: string; employeeNumber: string; totalHours: number; timesheetCount: number }>();
    for (const ts of approved) {
      const emp = ts.employee as any;
      if (!empMap.has(ts.employeeId)) {
        empMap.set(ts.employeeId, {
          employeeId: ts.employeeId,
          fullName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          totalHours: 0,
          timesheetCount: 0,
        });
      }
      const e = empMap.get(ts.employeeId)!;
      e.totalHours    += Number(ts.totalHours);
      e.timesheetCount += 1;
    }

    const topEmployees = Array.from(empMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 10);

    const totalApproved  = timesheets.filter(t => t.status === 'APPROVED').length;
    const totalAll       = timesheets.length;
    const approvalRate   = totalAll > 0 ? Math.round((totalApproved / totalAll) * 100) : 0;

    return {
      period: { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] },
      summary: {
        totalTimesheets: totalAll,
        approvedTimesheets: totalApproved,
        approvalRate,
        wtdCompliance: wtdCounts,
      },
      weeklyTrend,
      absenceByType,
      departmentAttendance,
      topEmployees,
    };
  }
}
