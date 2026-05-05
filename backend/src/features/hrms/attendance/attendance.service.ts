import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  TimesheetEntryDto,
  BulkUpsertEntriesDto,
  RejectTimesheetDto,
} from './dto/attendance.dto';

// ── UK Bank Holidays (England & Wales) ────────────────────────────────────────
const BANK_HOLIDAYS_DATA: Record<
  number,
  Array<{ name: string; date: string }>
> = {
  2024: [
    { name: "New Year's Day", date: '2024-01-01' },
    { name: 'Good Friday', date: '2024-03-29' },
    { name: 'Easter Monday', date: '2024-04-01' },
    { name: 'Early May Bank Holiday', date: '2024-05-06' },
    { name: 'Spring Bank Holiday', date: '2024-05-27' },
    { name: 'Summer Bank Holiday', date: '2024-08-26' },
    { name: 'Christmas Day', date: '2024-12-25' },
    { name: 'Boxing Day', date: '2024-12-26' },
  ],
  2025: [
    { name: "New Year's Day", date: '2025-01-01' },
    { name: 'Good Friday', date: '2025-04-18' },
    { name: 'Easter Monday', date: '2025-04-21' },
    { name: 'Early May Bank Holiday', date: '2025-05-05' },
    { name: 'Spring Bank Holiday', date: '2025-05-26' },
    { name: 'Summer Bank Holiday', date: '2025-08-25' },
    { name: 'Christmas Day', date: '2025-12-25' },
    { name: 'Boxing Day', date: '2025-12-26' },
  ],
  2026: [
    { name: "New Year's Day", date: '2026-01-01' },
    { name: 'Good Friday', date: '2026-04-03' },
    { name: 'Easter Monday', date: '2026-04-06' },
    { name: 'Early May Bank Holiday', date: '2026-05-04' },
    { name: 'Spring Bank Holiday', date: '2026-05-25' },
    { name: 'Summer Bank Holiday', date: '2026-08-31' },
    { name: 'Christmas Day', date: '2026-12-25' },
    { name: 'Boxing Day', date: '2026-12-28' },
  ],
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Week Helpers ────────────────────────────────────────────────────────────

  private getMonday(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  private isoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // ─── Weekly Overview ─────────────────────────────────────────────────────────

  async getWeeklyOverview(weekStartStr: string, tenantId: string) {
    const monday = this.getMonday(new Date(weekStartStr));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    const [employees, timesheets, bankHolidays] = await Promise.all([
      this.prisma.hrms_employees.findMany({
        where: {
          tenantId,
          isActive: true,
          status: { not: 'TERMINATED' as any },
        },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          contractedHours: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.hrms_timesheets.findMany({
        where: {
          tenantId,
          weekStartDate: { gte: monday, lte: monday },
        },
        include: { entries: true },
      }),
      this.prisma.hrms_bank_holidays.findMany({
        where: {
          date: { gte: monday, lte: sunday },
          OR: [{ tenantId }, { tenantId: null }],
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Build lookup maps
    const tsByEmp = new Map<string, (typeof timesheets)[0]>();
    timesheets.forEach((ts) => tsByEmp.set(ts.employeeId, ts));

    // 7-day ISO date strings for the week
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(this.isoDate(d));
    }

    // Calculate WTD for all employees in parallel
    const results = await Promise.all(
      employees.map(async (emp) => {
        const ts = tsByEmp.get(emp.id);
        const dayMap: Record<
          string,
          { hoursWorked: number; entryType: string } | null
        > = {};

        days.forEach((d) => {
          const entry = ts?.entries.find(
            (e) => this.isoDate(new Date(e.entryDate)) === d,
          );
          dayMap[d] = entry
            ? {
                hoursWorked: Number(entry.hoursWorked),
                entryType: String(entry.entryType),
              }
            : null;
        });

        const wtd = await this.calculateWtdAverage(emp.id, tenantId);

        return {
          employeeId: emp.id,
          employeeNumber: emp.employeeNumber,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          timesheetId: ts?.id ?? null,
          timesheetStatus: ts?.status ?? null,
          days: dayMap,
          totalHours: ts ? Number(ts.totalHours) : 0,
          wtdAverage: wtd.average,
          wtdStatus:
            wtd.average > 48
              ? 'VIOLATION'
              : wtd.average > 44
                ? 'WARNING'
                : 'OK',
        };
      }),
    );

    return {
      weekStart: this.isoDate(monday),
      weekEnd: this.isoDate(sunday),
      days,
      employees: results,
      bankHolidays: bankHolidays.map((bh) => ({
        date: this.isoDate(new Date(bh.date)),
        name: bh.name,
      })),
      summary: {
        totalEmployees: employees.length,
        totalHours: results.reduce((s, e) => s + e.totalHours, 0),
        pendingApprovals: results.filter(
          (e) => e.timesheetStatus === 'SUBMITTED',
        ).length,
        wtdWarnings: results.filter((e) => e.wtdStatus !== 'OK').length,
      },
    };
  }

  // ─── Timesheet CRUD ──────────────────────────────────────────────────────────

  async getOrCreateTimesheet(
    employeeId: string,
    weekStartStr: string,
    tenantId: string,
  ) {
    const emp = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);

    const monday = this.getMonday(new Date(weekStartStr));

    const existing = await this.prisma.hrms_timesheets.findFirst({
      where: { tenantId, employeeId, weekStartDate: monday },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
    if (existing) return existing;

    return this.prisma.hrms_timesheets.create({
      data: { tenantId, employeeId, weekStartDate: monday },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
  }

  async bulkUpsertEntries(
    employeeId: string,
    weekStartStr: string,
    dto: BulkUpsertEntriesDto,
    tenantId: string,
  ) {
    const emp = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);

    const monday = this.getMonday(new Date(weekStartStr));

    // Get or create the timesheet
    let ts = await this.prisma.hrms_timesheets.findFirst({
      where: { tenantId, employeeId, weekStartDate: monday },
    });

    if (!ts) {
      ts = await this.prisma.hrms_timesheets.create({
        data: { tenantId, employeeId, weekStartDate: monday, notes: dto.notes },
      });
    } else {
      if (ts.status === 'APPROVED')
        throw new BadRequestException('Cannot edit an approved timesheet');
      // Reset to DRAFT if it was rejected
      if (ts.status === 'REJECTED') {
        ts = await this.prisma.hrms_timesheets.update({
          where: { id: ts.id },
          data: {
            status: 'DRAFT',
            rejectedReason: null,
            notes: dto.notes ?? ts.notes,
          },
        });
      } else if (dto.notes !== undefined) {
        ts = await this.prisma.hrms_timesheets.update({
          where: { id: ts.id },
          data: { notes: dto.notes },
        });
      }
    }

    // Upsert each entry
    for (const entry of dto.entries) {
      const hoursWorked = this.calcHours(entry);
      const entryDate = new Date(entry.entryDate);

      const existing = await this.prisma.hrms_timesheet_entries.findFirst({
        where: { timesheetId: ts.id, entryDate },
      });

      if (existing) {
        if (hoursWorked === 0 && !entry.entryType) {
          // Delete if zeroing out
          await this.prisma.hrms_timesheet_entries.delete({
            where: { id: existing.id },
          });
        } else {
          await this.prisma.hrms_timesheet_entries.update({
            where: { id: existing.id },
            data: {
              startTime: entry.startTime ?? null,
              endTime: entry.endTime ?? null,
              breakMinutes: entry.breakMinutes ?? 0,
              hoursWorked,
              entryType: (entry.entryType as any) ?? 'REGULAR',
              notes: entry.notes ?? null,
              updatedAt: new Date(),
            },
          });
        }
      } else if (hoursWorked > 0 || entry.entryType) {
        await this.prisma.hrms_timesheet_entries.create({
          data: {
            tenantId,
            timesheetId: ts.id,
            employeeId,
            entryDate,
            startTime: entry.startTime ?? null,
            endTime: entry.endTime ?? null,
            breakMinutes: entry.breakMinutes ?? 0,
            hoursWorked,
            entryType: (entry.entryType as any) ?? 'REGULAR',
            notes: entry.notes ?? null,
          },
        });
      }
    }

    await this.recalcTotals(ts.id);

    return this.prisma.hrms_timesheets.findFirst({
      where: { id: ts.id },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
  }

  async deleteEntry(timesheetId: string, entryDate: string, tenantId: string) {
    const ts = await this.prisma.hrms_timesheets.findFirst({
      where: { id: timesheetId, tenantId },
    });
    if (!ts) throw new NotFoundException(`Timesheet ${timesheetId} not found`);
    if (ts.status === 'APPROVED')
      throw new BadRequestException('Cannot edit an approved timesheet');

    await this.prisma.hrms_timesheet_entries.deleteMany({
      where: { timesheetId, entryDate: new Date(entryDate) },
    });

    await this.recalcTotals(timesheetId);
  }

  // ─── Workflow Actions ────────────────────────────────────────────────────────

  async submitTimesheet(timesheetId: string, tenantId: string) {
    const ts = await this.prisma.hrms_timesheets.findFirst({
      where: { id: timesheetId, tenantId },
    });
    if (!ts) throw new NotFoundException(`Timesheet ${timesheetId} not found`);
    if (ts.status === 'APPROVED')
      throw new BadRequestException('Already approved');
    if (ts.status === 'SUBMITTED')
      throw new BadRequestException('Already submitted');

    return this.prisma.hrms_timesheets.update({
      where: { id: timesheetId },
      data: { status: 'SUBMITTED' as any, submittedAt: new Date() },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
  }

  async approveTimesheet(
    timesheetId: string,
    approverId: string,
    tenantId: string,
  ) {
    const ts = await this.prisma.hrms_timesheets.findFirst({
      where: { id: timesheetId, tenantId },
    });
    if (!ts) throw new NotFoundException(`Timesheet ${timesheetId} not found`);
    if (ts.status === 'APPROVED')
      throw new BadRequestException('Already approved');

    return this.prisma.hrms_timesheets.update({
      where: { id: timesheetId },
      data: {
        status: 'APPROVED' as any,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectedReason: null,
      },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
  }

  async rejectTimesheet(
    timesheetId: string,
    dto: RejectTimesheetDto,
    tenantId: string,
  ) {
    const ts = await this.prisma.hrms_timesheets.findFirst({
      where: { id: timesheetId, tenantId },
    });
    if (!ts) throw new NotFoundException(`Timesheet ${timesheetId} not found`);

    return this.prisma.hrms_timesheets.update({
      where: { id: timesheetId },
      data: {
        status: 'REJECTED' as any,
        rejectedReason: dto.reason,
        approvedById: null,
        approvedAt: null,
      },
      include: { entries: { orderBy: { entryDate: 'asc' } } },
    });
  }

  // ─── WTD (Working Time Directive) ────────────────────────────────────────────

  async calculateWtdAverage(employeeId: string, tenantId: string) {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 17 * 7); // 17-week rolling window

    const timesheets = await this.prisma.hrms_timesheets.findMany({
      where: {
        employeeId,
        tenantId,
        status: 'APPROVED' as any,
        weekStartDate: { gte: cutoff },
      },
      select: { totalHours: true },
    });

    const totalHours = timesheets.reduce(
      (s, ts) => s + Number(ts.totalHours),
      0,
    );
    const weeksTracked = timesheets.length;
    const average =
      weeksTracked > 0
        ? Math.round((totalHours / weeksTracked) * 100) / 100
        : 0;

    return {
      average,
      weeksTracked,
      totalHours: Math.round(totalHours * 100) / 100,
      status: average > 48 ? 'VIOLATION' : average > 44 ? 'WARNING' : 'OK',
    };
  }

  // ─── Zero-hours holiday accrual ──────────────────────────────────────────────

  async calculateZeroHoursHoliday(employeeId: string, tenantId: string) {
    const emp = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);

    // UK tax year starts April 6
    const now = new Date();
    const taxYearStart =
      now.getUTCMonth() >= 3 && now.getUTCDate() >= 6
        ? new Date(Date.UTC(now.getUTCFullYear(), 3, 6))
        : new Date(Date.UTC(now.getUTCFullYear() - 1, 3, 6));

    // Get approved timesheet IDs in this tax year
    const approvedTimesheets = await this.prisma.hrms_timesheets.findMany({
      where: {
        employeeId,
        tenantId,
        status: 'APPROVED' as any,
        weekStartDate: { gte: taxYearStart },
      },
      select: { id: true },
    });
    const tsIds = approvedTimesheets.map((ts) => ts.id);

    if (tsIds.length === 0) {
      return {
        totalHoursWorked: 0,
        holidayHoursAccrued: 0,
        holidayDaysAccrued: 0,
        taxYearStart: this.isoDate(taxYearStart),
      };
    }

    const agg = await this.prisma.hrms_timesheet_entries.aggregate({
      where: {
        employeeId,
        tenantId,
        timesheetId: { in: tsIds },
        entryType: { in: ['REGULAR', 'OVERTIME'] as any[] },
      },
      _sum: { hoursWorked: true },
    });

    const totalHoursWorked =
      Math.round(Number(agg._sum.hoursWorked ?? 0) * 100) / 100;
    // UK: 5.6 weeks / year = 12.07% of hours worked
    const holidayHoursAccrued =
      Math.round(totalHoursWorked * 0.1207 * 100) / 100;
    const holidayDaysAccrued =
      Math.round((holidayHoursAccrued / 7.5) * 100) / 100;

    return {
      totalHoursWorked,
      holidayHoursAccrued,
      holidayDaysAccrued,
      taxYearStart: this.isoDate(taxYearStart),
    };
  }

  // ─── Bank Holidays ───────────────────────────────────────────────────────────

  async getBankHolidays(year: number, tenantId: string) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));

    return this.prisma.hrms_bank_holidays.findMany({
      where: {
        date: { gte: start, lte: end },
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { date: 'asc' },
    });
  }

  async seedBankHolidays(year: number, tenantId: string) {
    const data = BANK_HOLIDAYS_DATA[year];
    if (!data) {
      throw new BadRequestException(
        `No bank holiday data for year ${year}. Supported: ${Object.keys(BANK_HOLIDAYS_DATA).join(', ')}`,
      );
    }

    let seeded = 0;
    for (const bh of data) {
      const date = new Date(bh.date);
      const existing = await this.prisma.hrms_bank_holidays.findFirst({
        where: {
          date,
          OR: [{ tenantId }, { tenantId: null }],
        },
      });
      if (!existing) {
        await this.prisma.hrms_bank_holidays.create({
          data: { tenantId, name: bh.name, date, region: 'ENGLAND_WALES' },
        });
        seeded++;
      }
    }

    this.logger.log(
      `Seeded ${seeded} bank holidays for year ${year}, tenant ${tenantId}`,
    );
    return { seeded, total: data.length };
  }

  async deleteBankHoliday(id: string, tenantId: string) {
    const bh = await this.prisma.hrms_bank_holidays.findFirst({
      where: { id, OR: [{ tenantId }, { tenantId: null }] },
    });
    if (!bh) throw new NotFoundException(`Bank holiday ${id} not found`);
    await this.prisma.hrms_bank_holidays.delete({ where: { id } });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private calcHours(entry: TimesheetEntryDto): number {
    if (entry.startTime && entry.endTime) {
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      const totalMins =
        eh * 60 + em - (sh * 60 + sm) - (entry.breakMinutes ?? 0);
      return Math.round(Math.max(0, totalMins / 60) * 100) / 100;
    }
    return Math.round((entry.hoursWorked ?? 0) * 100) / 100;
  }

  private async recalcTotals(timesheetId: string) {
    const agg = await this.prisma.hrms_timesheet_entries.aggregate({
      where: { timesheetId },
      _sum: { hoursWorked: true },
    });

    const regularAgg = await this.prisma.hrms_timesheet_entries.aggregate({
      where: { timesheetId, entryType: { in: ['REGULAR'] as any[] } },
      _sum: { hoursWorked: true },
    });

    const overtimeAgg = await this.prisma.hrms_timesheet_entries.aggregate({
      where: { timesheetId, entryType: { in: ['OVERTIME'] as any[] } },
      _sum: { hoursWorked: true },
    });

    await this.prisma.hrms_timesheets.update({
      where: { id: timesheetId },
      data: {
        totalHours: Number(agg._sum.hoursWorked ?? 0),
        regularHours: Number(regularAgg._sum.hoursWorked ?? 0),
        overtimeHours: Number(overtimeAgg._sum.hoursWorked ?? 0),
        updatedAt: new Date(),
      },
    });
  }
}
