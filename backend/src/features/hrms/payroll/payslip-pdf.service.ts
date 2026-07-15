import { Injectable } from '@nestjs/common';

const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface PayslipPdfEmployer {
  name: string;
  tradingName?: string | null;
  address?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  companyRegistrationNumber?: string | null;
}

export interface PayslipPdfEmployee {
  fullName: string;
  employeeNumber: string;
  niNumberMasked?: string | null;
  jobTitle?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
}

export interface PayslipPdfData {
  taxCode: string;
  niCategory: string;
  payFrequency: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;

  basicPay: number;
  overtimePay: number;
  bonusPay: number;
  commissionPay: number;
  sickPay: number;
  holidayPay: number;
  otherAdditions: number;
  grossPay: number;

  paye: number;
  employeeNI: number;
  employeePension: number;
  studentLoanRepayment: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;

  employerNI: number;
  employerPension: number;

  ytdGross: number;
  ytdTax: number;
  ytdEmployeeNI: number;

  notes?: string | null;
}

@Injectable()
export class PayslipPdfService {
  /**
   * Renders a professional UK payslip to a PDF Buffer. The layout follows the
   * standard "earnings / deductions / net pay / employer contributions / YTD"
   * structure that employees and accountants expect.
   */
  build(
    payslip: PayslipPdfData,
    employer: PayslipPdfEmployer,
    employee: PayslipPdfEmployee,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 50;
      const RIGHT = 545;
      const MID = 300;

      // ── Employer header ──
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111');
      doc.text(employer.name, LEFT, 50, { width: RIGHT - LEFT });
      doc.font('Helvetica').fontSize(9).fillColor('#555555');
      if (employer.tradingName) doc.text(employer.tradingName);
      if (employer.address) {
        employer.address
          .split('\n')
          .forEach((line) => doc.text(line.trim()));
      }
      const idBits: string[] = [];
      if (employer.phone) idBits.push(`Tel: ${employer.phone}`);
      if (employer.vatNumber) idBits.push(`VAT: ${employer.vatNumber}`);
      if (employer.companyRegistrationNumber)
        idBits.push(`Co. Reg: ${employer.companyRegistrationNumber}`);
      if (idBits.length) doc.text(idBits.join('   '));

      // ── PAYSLIP title (right aligned) ──
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#111111')
        .text('PAYSLIP', LEFT, 50, { width: RIGHT - LEFT, align: 'right' });

      doc.moveDown(1);
      const dividerY = Math.max(doc.y, 120);
      doc
        .moveTo(LEFT, dividerY)
        .lineTo(RIGHT, dividerY)
        .lineWidth(1)
        .strokeColor('#111111')
        .stroke();

      // ── Employee + pay-run meta (two columns) ──
      let y = dividerY + 14;
      const label = (t: string, x: number, yy: number) =>
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#888888')
          .text(t.toUpperCase(), x, yy);
      const value = (t: string, x: number, yy: number) =>
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111111')
          .text(t, x, yy + 9, { width: MID - x - 10 });

      // Left column: employee
      label('Employee', LEFT, y);
      value(employee.fullName, LEFT, y);
      const empAddr = [
        employee.addressLine1,
        employee.addressLine2,
        employee.city,
        employee.postcode,
      ]
        .filter(Boolean)
        .join(', ');
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#555555')
        .text(
          `#${employee.employeeNumber}${employee.jobTitle ? ' · ' + employee.jobTitle : ''}`,
          LEFT,
          y + 24,
        );
      if (empAddr)
        doc.fontSize(8).fillColor('#777777').text(empAddr, LEFT, y + 36, {
          width: MID - LEFT - 10,
        });

      // Right column: pay meta grid
      const rx = MID + 10;
      const metaRow = (
        lbl: string,
        val: string,
        col: 0 | 1,
        row: number,
      ) => {
        const x = col === 0 ? rx : rx + 120;
        const yy = y + row * 26;
        doc.font('Helvetica').fontSize(7.5).fillColor('#888888').text(lbl.toUpperCase(), x, yy);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111111').text(val, x, yy + 9);
      };
      metaRow('Pay Date', fmtDate(payslip.payDate), 0, 0);
      metaRow('Frequency', title(payslip.payFrequency), 1, 0);
      metaRow('Tax Code', payslip.taxCode, 0, 1);
      metaRow('NI Category', payslip.niCategory, 1, 1);
      metaRow(
        'Pay Period',
        `${fmtShort(payslip.payPeriodStart)} – ${fmtShort(payslip.payPeriodEnd)}`,
        0,
        2,
      );
      if (employee.niNumberMasked)
        metaRow('NI Number', employee.niNumberMasked, 1, 2);

      y = y + 3 * 26 + 24;

      // ── Earnings / Deductions two-column tables ──
      const colGap = 20;
      const colW = (RIGHT - LEFT - colGap) / 2;
      const earnX = LEFT;
      const dedX = LEFT + colW + colGap;

      const sectionHeader = (t: string, x: number, yy: number) => {
        doc.rect(x, yy, colW, 18).fill('#f1f5f9');
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor('#334155')
          .text(t.toUpperCase(), x + 6, yy + 5, { width: colW - 12 });
      };

      sectionHeader('Earnings', earnX, y);
      sectionHeader('Deductions', dedX, y);
      let earnY = y + 24;
      let dedY = y + 24;

      const line = (
        x: number,
        yy: number,
        lbl: string,
        amt: number,
      ): number => {
        doc.font('Helvetica').fontSize(9).fillColor('#333333').text(lbl, x + 4, yy, { width: colW * 0.6 });
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#111111')
          .text(money(amt), x + colW * 0.55, yy, {
            width: colW * 0.45 - 6,
            align: 'right',
          });
        return yy + 15;
      };

      // Earnings
      earnY = line(earnX, earnY, 'Basic Pay', payslip.basicPay);
      if (payslip.overtimePay > 0) earnY = line(earnX, earnY, 'Overtime', payslip.overtimePay);
      if (payslip.bonusPay > 0) earnY = line(earnX, earnY, 'Bonus', payslip.bonusPay);
      if (payslip.commissionPay > 0) earnY = line(earnX, earnY, 'Commission', payslip.commissionPay);
      if (payslip.sickPay > 0) earnY = line(earnX, earnY, 'Sick Pay', payslip.sickPay);
      if (payslip.holidayPay > 0) earnY = line(earnX, earnY, 'Holiday Pay', payslip.holidayPay);
      if (payslip.otherAdditions > 0) earnY = line(earnX, earnY, 'Other Additions', payslip.otherAdditions);

      // Deductions
      dedY = line(dedX, dedY, 'Income Tax (PAYE)', payslip.paye);
      dedY = line(dedX, dedY, 'National Insurance', payslip.employeeNI);
      if (payslip.employeePension > 0) dedY = line(dedX, dedY, 'Pension', payslip.employeePension);
      if (payslip.studentLoanRepayment > 0) dedY = line(dedX, dedY, 'Student Loan', payslip.studentLoanRepayment);
      if (payslip.otherDeductions > 0) dedY = line(dedX, dedY, 'Other Deductions', payslip.otherDeductions);

      // Totals row for each column
      const totalsY = Math.max(earnY, dedY) + 4;
      const totalLine = (x: number, lbl: string, amt: number) => {
        doc.moveTo(x, totalsY).lineTo(x + colW, totalsY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111111').text(lbl, x + 4, totalsY + 5, { width: colW * 0.6 });
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor('#111111')
          .text(money(amt), x + colW * 0.55, totalsY + 5, {
            width: colW * 0.45 - 6,
            align: 'right',
          });
      };
      totalLine(earnX, 'Gross Pay', payslip.grossPay);
      totalLine(dedX, 'Total Deductions', payslip.totalDeductions);

      y = totalsY + 30;

      // ── Net pay banner ──
      doc.rect(LEFT, y, RIGHT - LEFT, 34).fill('#0f172a');
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#ffffff')
        .text('NET PAY', LEFT + 14, y + 11);
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#ffffff')
        .text(money(payslip.netPay), LEFT, y + 9, {
          width: RIGHT - LEFT - 14,
          align: 'right',
        });
      y += 50;

      // ── Employer contributions + YTD (two columns) ──
      sectionHeader('Employer Contributions', earnX, y);
      sectionHeader('Year to Date (this tax year)', dedX, y);
      let ecY = y + 24;
      let ytdY = y + 24;
      ecY = line(earnX, ecY, 'Employer NI', payslip.employerNI);
      if (payslip.employerPension > 0) ecY = line(earnX, ecY, 'Employer Pension', payslip.employerPension);

      ytdY = line(dedX, ytdY, 'Gross Pay YTD', payslip.ytdGross);
      ytdY = line(dedX, ytdY, 'Tax Paid YTD', payslip.ytdTax);
      ytdY = line(dedX, ytdY, 'Employee NI YTD', payslip.ytdEmployeeNI);

      y = Math.max(ecY, ytdY) + 14;

      if (payslip.notes) {
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#555555').text(`Notes: ${payslip.notes}`, LEFT, y, {
          width: RIGHT - LEFT,
        });
        y = doc.y + 8;
      }

      // ── Footer ──
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#999999')
        .text(
          `This payslip is a summary of your pay and deductions. Generated ${new Date().toLocaleDateString('en-GB')}. Please retain for your records.`,
          LEFT,
          800,
          { width: RIGHT - LEFT, align: 'center' },
        );

      doc.end();
    });
  }
}

// ── formatting helpers ──
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

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fmtShort(d: Date): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function title(s: string): string {
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
