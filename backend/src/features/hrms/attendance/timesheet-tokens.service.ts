import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

interface DayEntry {
  entryDate: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  hoursWorked?: number;
  entryType?: string;
  notes?: string;
}

@Injectable()
export class TimesheetTokensService {
  private readonly logger = new Logger(TimesheetTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Manager: generate self-service link ────────────────────────────────────

  async generateLink(
    employeeId: string,
    weekStart: string,
    tenantId: string,
  ): Promise<{ token: string; link: string; expiresAt: Date }> {
    const employee = await this.prisma.hrms_employees.findFirst({
      where: { id: employeeId, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const monday = this.getMonday(new Date(weekStart));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = crypto.randomBytes(32).toString('hex');

    // Upsert: one token per employee per week
    const existing = await this.prisma.hrms_timesheet_tokens.findFirst({
      where: { tenantId, employeeId, weekStart: monday },
    });

    let record;
    if (existing) {
      record = await this.prisma.hrms_timesheet_tokens.update({
        where: { id: existing.id },
        data: { token, pinHash: null, status: 'PENDING', expiresAt },
      });
    } else {
      record = await this.prisma.hrms_timesheet_tokens.create({
        data: {
          tenantId,
          employeeId,
          token,
          weekStart: monday,
          weekEnd: sunday,
          status: 'PENDING',
          expiresAt,
        },
      });
    }

    const link = `/timesheets/fill/${record.token}`;
    return { token: record.token, link, expiresAt };
  }

  // ─── Public: get token info (no auth) ───────────────────────────────────────

  async getTokenInfo(token: string) {
    const record = await this.prisma.hrms_timesheet_tokens.findUnique({
      where: { token },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });

    if (!record) throw new NotFoundException('Invalid or expired link');
    if (new Date() > record.expiresAt)
      throw new ForbiddenException('This link has expired');
    if (record.status === 'SUBMITTED')
      throw new ForbiddenException('Timesheet already submitted');

    return {
      employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
      employeeNumber: record.employee.employeeNumber,
      weekStart: record.weekStart,
      weekEnd: record.weekEnd,
      status: record.status,
    };
  }

  // ─── Public: submit timesheet + generate PDF ─────────────────────────────────

  async submitAndGeneratePdf(
    token: string,
    pin: string,
    entries: DayEntry[],
  ): Promise<Buffer> {
    if (!pin || pin.length < 4)
      throw new BadRequestException('PIN must be at least 4 characters');

    const record = await this.prisma.hrms_timesheet_tokens.findUnique({
      where: { token },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            tenantId: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!record) throw new NotFoundException('Invalid or expired link');
    if (new Date() > record.expiresAt)
      throw new ForbiddenException('This link has expired');
    if (record.status === 'SUBMITTED')
      throw new ForbiddenException('Timesheet already submitted');

    const pinHash = await bcrypt.hash(pin, 10);
    const weekStartStr = record.weekStart.toISOString().split('T')[0];
    const tenantId = record.employee.tenantId;
    const employeeId = record.employee.id;

    // Upsert the timesheet in the main system
    const timesheet = await this.prisma.hrms_timesheets.upsert({
      where: {
        tenantId_employeeId_weekStartDate: {
          tenantId,
          employeeId,
          weekStartDate: record.weekStart,
        },
      },
      create: {
        tenantId,
        employeeId,
        weekStartDate: record.weekStart,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Bulk upsert entries
    let totalHours = 0;
    for (const entry of entries) {
      const hours = entry.hoursWorked ?? this.calcHours(entry);
      totalHours += hours;

      await this.prisma.hrms_timesheet_entries.upsert({
        where: {
          timesheetId_entryDate: {
            timesheetId: timesheet.id,
            entryDate: new Date(entry.entryDate),
          },
        },
        create: {
          tenantId,
          timesheetId: timesheet.id,
          employeeId,
          entryDate: new Date(entry.entryDate),
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakMinutes: entry.breakMinutes ?? 0,
          hoursWorked: hours,
          entryType: (entry.entryType as any) ?? 'REGULAR',
          notes: entry.notes,
        },
        update: {
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakMinutes: entry.breakMinutes ?? 0,
          hoursWorked: hours,
          entryType: (entry.entryType as any) ?? 'REGULAR',
          notes: entry.notes,
        },
      });
    }

    // Update total hours on timesheet
    await this.prisma.hrms_timesheets.update({
      where: { id: timesheet.id },
      data: { totalHours },
    });

    // Mark token as submitted
    await this.prisma.hrms_timesheet_tokens.update({
      where: { token },
      data: { pinHash, status: 'SUBMITTED', submittedAt: new Date() },
    });

    // Generate PIN-protected PDF
    return this.buildPdf(
      record.employee,
      weekStartStr,
      record.weekEnd.toISOString().split('T')[0],
      entries,
      totalHours,
      pin,
    );
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private calcHours(entry: DayEntry): number {
    if (!entry.startTime || !entry.endTime) return 0;
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    const totalMins = eh * 60 + em - (sh * 60 + sm) - (entry.breakMinutes ?? 0);
    return Math.max(0, Math.round((totalMins / 60) * 100) / 100);
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  private buildPdf(
    employee: {
      firstName: string;
      lastName: string;
      employeeNumber: string;
      jobTitle?: string | null;
    },
    weekStart: string,
    weekEnd: string,
    entries: DayEntry[],
    totalHours: number,
    pin: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        userPassword: pin,
        ownerPassword: pin + '_owner',
        permissions: {
          printing: 'highResolution',
          copying: false,
          modifying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // ── Header ──
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Weekly Timesheet', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Employee: ${employee.firstName} ${employee.lastName}  |  #${employee.employeeNumber}`,
          { align: 'center' },
        );
      if (employee.jobTitle) {
        doc.fontSize(10).text(employee.jobTitle, { align: 'center' });
      }
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .text(`Week: ${weekStart} to ${weekEnd}`, { align: 'center' });
      doc.moveDown(1);

      // ── Table header ──
      const colX = [50, 120, 200, 280, 350, 420, 490];
      const colHeaders = [
        'Day',
        'Date',
        'Start',
        'End',
        'Break',
        'Hours',
        'Type',
      ];
      doc.font('Helvetica-Bold').fontSize(9);
      colHeaders.forEach((h, i) =>
        doc.text(h, colX[i], doc.y, { width: 70, continued: i < 6 }),
      );
      doc.moveDown(0.3);

      // ── Horizontal rule ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.2);

      // ── Rows ──
      doc.font('Helvetica').fontSize(9);
      const startY = doc.y;

      // Build a map by date for easy lookup
      const byDate: Record<string, DayEntry> = {};
      entries.forEach((e) => {
        byDate[e.entryDate] = e;
      });

      // Generate Mon–Sun rows
      const monday = new Date(weekStart + 'T00:00:00Z');
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(d.getUTCDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = byDate[dateStr];
        const rowY = startY + i * 18;

        doc.text(DAY_NAMES[i], colX[0], rowY, { width: 40 });
        doc.text(dateStr.slice(5), colX[1], rowY, { width: 75 });
        doc.text(entry?.startTime ?? '—', colX[2], rowY, { width: 75 });
        doc.text(entry?.endTime ?? '—', colX[3], rowY, { width: 65 });
        doc.text(
          entry ? `${entry.breakMinutes ?? 0}m` : '—',
          colX[4],
          rowY,
          { width: 65 },
        );
        doc.text(
          entry ? String(entry.hoursWorked ?? this.calcHours(entry)) : '0',
          colX[5],
          rowY,
          { width: 65 },
        );
        doc.text(entry?.entryType ?? 'REGULAR', colX[6], rowY, { width: 70 });
      }

      // ── Total ──
      const afterTable = startY + 7 * 18 + 8;
      doc
        .moveTo(50, afterTable)
        .lineTo(545, afterTable)
        .strokeColor('#cccccc')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Total Hours: ${totalHours.toFixed(2)}`, 50, afterTable + 10);

      // ── Footer ──
      doc.moveDown(3);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `Generated: ${new Date().toISOString()}  |  This PDF is PIN-protected.`,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
