import { Injectable } from '@nestjs/common';

const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface P60Employer {
  name: string;
  tradingName?: string | null;
  address?: string | null;
  vatNumber?: string | null;
  companyRegistrationNumber?: string | null;
}

export interface P60Data {
  taxYear: string; // "2024-25"
  taxYearStart: string; // "2024-04-06"
  taxYearEnd: string; // "2025-04-05"
  employee: {
    fullName: string;
    employeeNumber: string;
    niNumberMasked?: string | null;
    taxCode: string;
    niCategory: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postcode?: string | null;
  };
  totalPay: number;
  totalTax: number;
  employeeNI: number;
  employerNI: number;
  employeePension: number;
  studentLoan: number;
  payslipCount: number;
}

export interface P11dData {
  taxYear: string;
  employee: {
    fullName: string;
    employeeNumber: string;
    niNumberMasked?: string | null;
  };
  benefits: Array<{
    benefitType: string;
    description?: string | null;
    cashEquivalent: number;
    notes?: string | null;
  }>;
  totalCashEquivalent: number;
}

@Injectable()
export class ReportsPdfService {
  /**
   * Renders a P60 "End of Year Certificate" to a PDF Buffer. Layout mirrors the
   * statutory HMRC P60 (pay & income tax, NI contributions, final tax code)
   * so employees can use it for tax returns, mortgages, and tax-credit claims.
   */
  buildP60(data: P60Data, employer: P60Employer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 50;
      const RIGHT = 545;
      const yearLabel = `${data.taxYearStart.slice(0, 4)} to ${data.taxYearEnd.slice(0, 4)}`;

      // ── Title band ──
      doc.rect(LEFT, 50, RIGHT - LEFT, 46).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#ffffff')
        .text('P60 End of Year Certificate', LEFT + 14, 62);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#cbd5e1')
        .text(`Tax year ${yearLabel}`, LEFT + 14, 82);

      // ── Employer / Employee blocks ──
      let y = 112;
      const boxW = (RIGHT - LEFT - 16) / 2;

      const block = (
        x: number,
        heading: string,
        lines: string[],
      ): void => {
        doc.rect(x, y, boxW, 92).lineWidth(0.7).strokeColor('#cbd5e1').stroke();
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#64748b')
          .text(heading.toUpperCase(), x + 8, y + 8);
        doc.font('Helvetica').fontSize(9.5).fillColor('#111111');
        let ly = y + 22;
        lines.filter(Boolean).forEach((ln, i) => {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').text(ln, x + 8, ly, {
            width: boxW - 16,
          });
          ly += 13;
        });
      };

      block(LEFT, 'Employer', [
        employer.name,
        employer.tradingName ?? '',
        ...(employer.address ? employer.address.split('\n').map((s) => s.trim()) : []),
        employer.vatNumber ? `VAT: ${employer.vatNumber}` : '',
      ]);

      block(LEFT + boxW + 16, 'Employee', [
        data.employee.fullName,
        `#${data.employee.employeeNumber}`,
        data.employee.niNumberMasked ? `NI: ${data.employee.niNumberMasked}` : '',
        [
          data.employee.addressLine1,
          data.employee.city,
          data.employee.postcode,
        ]
          .filter(Boolean)
          .join(', '),
        `Tax code: ${data.employee.taxCode}   NI table: ${data.employee.niCategory}`,
      ]);

      y += 92 + 20;

      // ── Pay and Income Tax ──
      const sectionTitle = (t: string) => {
        doc.rect(LEFT, y, RIGHT - LEFT, 20).fill('#f1f5f9');
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#334155')
          .text(t.toUpperCase(), LEFT + 8, y + 6);
        y += 28;
      };

      const figure = (label: string, amount: number, note?: string) => {
        doc.font('Helvetica').fontSize(9.5).fillColor('#333333').text(label, LEFT + 8, y, {
          width: 320,
        });
        if (note)
          doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text(note, LEFT + 8, y + 12, {
            width: 320,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111111')
          .text(money(amount), RIGHT - 160, y, { width: 152, align: 'right' });
        y += note ? 26 : 18;
      };

      sectionTitle('Pay and Income Tax details');
      figure('Total pay in this employment', data.totalPay);
      figure('Total tax deducted', data.totalTax);
      figure('Final tax code', 0, `Tax code: ${data.employee.taxCode}`);
      // overwrite the "£0.00" printed by figure for the tax-code row
      doc.rect(RIGHT - 160, y - 26, 152, 14).fill('#ffffff');
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#111111')
        .text(data.employee.taxCode, RIGHT - 160, y - 26, {
          width: 152,
          align: 'right',
        });
      y += 6;

      sectionTitle('National Insurance contributions');
      figure('Employee contributions (this employment)', data.employeeNI, `NI category ${data.employee.niCategory}`);
      figure('Employer contributions', data.employerNI);

      sectionTitle('Other deductions');
      figure('Pension contributions (employee)', data.employeePension);
      figure('Student loan deductions', data.studentLoan);

      sectionTitle('Statutory payments included in total pay');
      figure('Statutory Sick Pay (SSP)', 0);
      figure('Statutory Maternity / Paternity Pay', 0);

      y += 8;
      doc
        .moveTo(LEFT, y)
        .lineTo(RIGHT, y)
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .stroke();
      y += 10;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748b')
        .text(
          `Certificate compiled from ${data.payslipCount} finalised payslip(s) in the ${data.taxYear} tax year (${data.taxYearStart} to ${data.taxYearEnd}).`,
          LEFT,
          y,
          { width: RIGHT - LEFT },
        );

      // ── Footer ──
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#999999')
        .text(
          'This is a printed copy of an electronic P60. Keep it in a safe place — you may need it to complete a tax return, claim tax credits, or as proof of income. HMRC cannot provide a replacement.',
          LEFT,
          792,
          { width: RIGHT - LEFT, align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Renders a P11D "Expenses and Benefits" statement to a PDF Buffer, listing
   * each taxable benefit with its cash-equivalent value and a total.
   */
  buildP11d(data: P11dData, employer: P60Employer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 50;
      const RIGHT = 545;
      const yearLabel = `${data.taxYear.slice(0, 4)} to ${Number(data.taxYear.slice(0, 4)) + 1}`;

      // ── Title band ──
      doc.rect(LEFT, 50, RIGHT - LEFT, 46).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#ffffff')
        .text('P11D — Expenses and Benefits', LEFT + 14, 62);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#cbd5e1')
        .text(`Tax year ${yearLabel}`, LEFT + 14, 82);

      // ── Employer / Employee summary ──
      let y = 112;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111').text(employer.name, LEFT, y);
      if (employer.address)
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor('#555555')
          .text(
            employer.address.split('\n').map((s) => s.trim()).join(', '),
            LEFT,
            y + 15,
            { width: 260 },
          );

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#888888')
        .text('EMPLOYEE', RIGHT - 220, y, { width: 220, align: 'right' });
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#111111')
        .text(data.employee.fullName, RIGHT - 220, y + 9, {
          width: 220,
          align: 'right',
        });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#555555')
        .text(
          `#${data.employee.employeeNumber}${data.employee.niNumberMasked ? '   NI: ' + data.employee.niNumberMasked : ''}`,
          RIGHT - 220,
          y + 24,
          { width: 220, align: 'right' },
        );

      y += 52;
      doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor('#111111').stroke();
      y += 14;

      // ── Table header ──
      const cType = LEFT + 4;
      const cDesc = LEFT + 160;
      const cAmt = RIGHT - 150;
      doc.rect(LEFT, y, RIGHT - LEFT, 20).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155');
      doc.text('BENEFIT', cType, y + 6);
      doc.text('DESCRIPTION', cDesc, y + 6);
      doc.text('CASH EQUIVALENT', cAmt, y + 6, { width: RIGHT - cAmt - 4, align: 'right' });
      y += 26;

      // ── Rows ──
      if (data.benefits.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#888888')
          .text('No benefits recorded for this tax year.', cType, y);
        y += 18;
      } else {
        for (const b of data.benefits) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#111111')
            .text(title(b.benefitType), cType, y, { width: cDesc - cType - 8 });
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#555555')
            .text(b.description ?? '—', cDesc, y, { width: cAmt - cDesc - 10 });
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#111111')
            .text(money(b.cashEquivalent), cAmt, y, {
              width: RIGHT - cAmt - 4,
              align: 'right',
            });
          y += 16;
          doc.moveTo(LEFT, y - 3).lineTo(RIGHT, y - 3).lineWidth(0.4).strokeColor('#e2e8f0').stroke();
        }
      }

      // ── Total ──
      y += 8;
      doc.rect(LEFT, y, RIGHT - LEFT, 26).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#ffffff')
        .text('TOTAL CASH EQUIVALENT OF BENEFITS', cType + 6, y + 8);
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#ffffff')
        .text(money(data.totalCashEquivalent), cAmt, y + 7, {
          width: RIGHT - cAmt - 10,
          align: 'right',
        });

      // ── Footer ──
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#999999')
        .text(
          'Summary of taxable expenses and benefits provided to the employee. Cash-equivalent values may be taxable through payroll or reportable to HMRC on form P11D. Retain for your records.',
          LEFT,
          792,
          { width: RIGHT - LEFT, align: 'center' },
        );

      doc.end();
    });
  }
}

function title(s: string): string {
  return String(s)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function money(n: number): string {
  const v = Number(n) || 0;
  return (
    '£' +
    v.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
