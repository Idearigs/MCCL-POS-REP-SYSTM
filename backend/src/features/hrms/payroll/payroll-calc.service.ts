import { Injectable, Logger } from '@nestjs/common';

// ─── Per-tax-year rate sets ────────────────────────────────────────────────────
// Every rate/threshold that changes between UK tax years lives here, keyed by the
// tax-year string ("2024-25"). To onboard a new tax year, add one entry — no code
// changes elsewhere. The resolver picks the correct set from the pay date.

export interface TaxYearRates {
  taxYear: string;
  // Income Tax (England / Wales / Northern Ireland)
  personalAllowance: number;
  basicRateLimit: number; // upper boundary of the basic-rate band
  additionalRateLimit: number; // start of the additional rate
  taperThreshold: number; // PA reduces by £1 per £2 above this
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  // Class 1 National Insurance (annualised thresholds)
  niPrimaryThreshold: number; // employee NI starts
  niUpperEarningsLimit: number; // employee upper limit
  niSecondaryThreshold: number; // employer NI starts
  niEmployeeMain: number;
  niEmployeeUpper: number;
  niEmployer: number;
  // Student loans (annual repayment thresholds)
  studentLoanThresholds: Record<string, number>;
  studentLoanRate: number;
  postgradRate: number;
  // Pension auto-enrolment qualifying earnings
  pensionLowerThreshold: number;
}

const TAX_YEARS: Record<string, TaxYearRates> = {
  // ── 2024/25 (6 Apr 2024 – 5 Apr 2025) ──
  '2024-25': {
    taxYear: '2024-25',
    personalAllowance: 12_570,
    basicRateLimit: 50_270,
    additionalRateLimit: 125_140,
    taperThreshold: 100_000,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    niPrimaryThreshold: 12_570,
    niUpperEarningsLimit: 50_270,
    niSecondaryThreshold: 9_100,
    niEmployeeMain: 0.08, // reduced from 10% in April 2024
    niEmployeeUpper: 0.02,
    niEmployer: 0.138,
    studentLoanThresholds: {
      PLAN1: 24_990,
      PLAN2: 27_295,
      PLAN3: 21_000, // Postgraduate Loan
      PLAN4: 31_395,
      PLAN5: 25_000,
    },
    studentLoanRate: 0.09,
    postgradRate: 0.06,
    pensionLowerThreshold: 6_240,
  },

  // ── 2025/26 (6 Apr 2025 – 5 Apr 2026) ──
  // NOTE: Income-tax bands and employee NI are frozen at 2024/25 levels.
  // CHANGED for 2025/26 (Autumn Budget 2024): employer NI rate → 15% and the
  // secondary (employer) threshold → £5,000. Student-loan thresholds uprated.
  // ⚠ Verify the student-loan figures against HMRC before running live 2025/26
  // payroll — they are set annually.
  '2025-26': {
    taxYear: '2025-26',
    personalAllowance: 12_570,
    basicRateLimit: 50_270,
    additionalRateLimit: 125_140,
    taperThreshold: 100_000,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,
    niPrimaryThreshold: 12_570,
    niUpperEarningsLimit: 50_270,
    niSecondaryThreshold: 5_000, // ↓ from £9,100
    niEmployeeMain: 0.08,
    niEmployeeUpper: 0.02,
    niEmployer: 0.15, // ↑ from 13.8%
    studentLoanThresholds: {
      PLAN1: 26_065,
      PLAN2: 28_470,
      PLAN3: 21_000,
      PLAN4: 32_745,
      PLAN5: 25_000,
    },
    studentLoanRate: 0.09,
    postgradRate: 0.06,
    pensionLowerThreshold: 6_240,
  },
};

// The most recent configured tax year, used as a safe fallback for pay dates
// beyond the latest entry (rather than silently reverting to an old year).
const LATEST_TAX_YEAR = Object.keys(TAX_YEARS).sort().pop() as string;

// ── Pay periods per year ───────────────────────────────────────────────────────
const PERIODS_PER_YEAR: Record<string, number> = {
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  FOUR_WEEKLY: 13,
  MONTHLY: 12,
};

export interface PayrollCalculation {
  taxYear: string;
  grossPay: number;
  paye: number;
  employeeNI: number;
  employerNI: number;
  employeePension: number;
  employerPension: number;
  studentLoanRepayment: number;
  totalDeductions: number;
  netPay: number;
}

@Injectable()
export class PayrollCalcService {
  private readonly logger = new Logger(PayrollCalcService.name);

  // ─── Tax-year resolution ──────────────────────────────────────────────────────

  /** Map a UK date to its tax-year key, e.g. 2025-05-01 → "2025-26". */
  taxYearKeyFor(date: Date): string {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    const startYr = m > 4 || (m === 4 && d >= 6) ? y : y - 1;
    return `${startYr}-${String(startYr + 1).slice(2)}`;
  }

  /** Resolve the rate set for a pay date, falling back to the latest year. */
  resolveRates(payDate: Date): TaxYearRates {
    const key = this.taxYearKeyFor(payDate);
    const rates = TAX_YEARS[key];
    if (rates) return rates;
    this.logger.warn(
      `No configured payroll rates for tax year ${key}; falling back to ${LATEST_TAX_YEAR}. Add a TAX_YEARS entry for ${key} to remove this warning.`,
    );
    return TAX_YEARS[LATEST_TAX_YEAR];
  }

  // ─── Tax code parsing ────────────────────────────────────────────────────────

  private parseTaxCode(
    code: string,
    rates: TaxYearRates,
  ): {
    annualAllowance: number;
    flatRate: number | null;
    noTax: boolean;
  } {
    const c = code.trim().toUpperCase();

    if (c === 'NT') return { annualAllowance: 0, flatRate: null, noTax: true };
    if (c === 'BR')
      return { annualAllowance: 0, flatRate: rates.basicRate, noTax: false };
    if (c === 'D0')
      return { annualAllowance: 0, flatRate: rates.higherRate, noTax: false };
    if (c === 'D1')
      return {
        annualAllowance: 0,
        flatRate: rates.additionalRate,
        noTax: false,
      };
    if (c === '0T') return { annualAllowance: 0, flatRate: null, noTax: false };

    // K code: addition to taxable pay (negative allowance)
    if (c.startsWith('K')) {
      const n = parseInt(c.slice(1), 10) || 0;
      return { annualAllowance: -(n * 10), flatRate: null, noTax: false };
    }

    // Standard L/M/N/T codes: digits * 10 = annual allowance
    const m = c.match(/^(\d+)[LMNT]?$/);
    if (m)
      return {
        annualAllowance: parseInt(m[1], 10) * 10,
        flatRate: null,
        noTax: false,
      };

    // Fallback: standard personal allowance
    return {
      annualAllowance: rates.personalAllowance,
      flatRate: null,
      noTax: false,
    };
  }

  // ─── Taper reduction ─────────────────────────────────────────────────────────

  private taperedAllowance(
    annualAllowance: number,
    annualisedGross: number,
    rates: TaxYearRates,
  ): number {
    if (annualisedGross <= rates.taperThreshold) return annualAllowance;
    const reduction = Math.floor((annualisedGross - rates.taperThreshold) / 2);
    return Math.max(0, annualAllowance - reduction);
  }

  // ─── PAYE ─────────────────────────────────────────────────────────────────────

  calculatePAYE(
    grossPay: number,
    taxCode: string,
    frequency: string,
    rates: TaxYearRates,
  ): number {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const { annualAllowance, flatRate, noTax } = this.parseTaxCode(
      taxCode,
      rates,
    );

    if (noTax) return 0;
    if (flatRate !== null) return this.r2(Math.max(0, grossPay * flatRate));

    const annualisedGross = grossPay * periods;
    const effectiveAllowance = this.taperedAllowance(
      annualAllowance,
      annualisedGross,
      rates,
    );
    const periodAllowance = effectiveAllowance / periods;

    const taxablePay = grossPay - periodAllowance;
    if (taxablePay <= 0) return 0;

    // Band sizes per period (above the personal allowance)
    const basicBandEnd = (rates.basicRateLimit - effectiveAllowance) / periods;
    const higherBandEnd =
      (rates.additionalRateLimit - effectiveAllowance) / periods;

    let tax: number;
    if (taxablePay <= basicBandEnd) {
      tax = taxablePay * rates.basicRate;
    } else if (taxablePay <= higherBandEnd) {
      tax =
        basicBandEnd * rates.basicRate +
        (taxablePay - basicBandEnd) * rates.higherRate;
    } else {
      const higherBand = higherBandEnd - basicBandEnd;
      tax =
        basicBandEnd * rates.basicRate +
        higherBand * rates.higherRate +
        (taxablePay - higherBandEnd) * rates.additionalRate;
    }

    return this.r2(Math.max(0, tax));
  }

  // ─── National Insurance (Class 1) ─────────────────────────────────────────────

  calculateNI(
    grossPay: number,
    frequency: string,
    niCategory: string,
    rates: TaxYearRates,
  ): {
    employeeNI: number;
    employerNI: number;
  } {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const pt = rates.niPrimaryThreshold / periods;
    const uel = rates.niUpperEarningsLimit / periods;
    const st = rates.niSecondaryThreshold / periods;

    // Employee NI: Category C = no employee contribution (State Pension age)
    let employeeNI = 0;
    if (niCategory !== 'C' && grossPay > pt) {
      const mainBand = Math.min(grossPay, uel) - pt;
      const upperBand = Math.max(0, grossPay - uel);
      employeeNI =
        mainBand * rates.niEmployeeMain + upperBand * rates.niEmployeeUpper;
    }

    // Employer NI (all categories)
    const employerNI = grossPay > st ? (grossPay - st) * rates.niEmployer : 0;

    return {
      employeeNI: this.r2(Math.max(0, employeeNI)),
      employerNI: this.r2(Math.max(0, employerNI)),
    };
  }

  // ─── Pension (auto-enrolment, qualifying earnings basis) ─────────────────────

  calculatePension(
    grossPay: number,
    frequency: string,
    employerPct: number,
    employeePct: number,
    rates: TaxYearRates,
  ): { employeePension: number; employerPension: number } {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const lower = rates.pensionLowerThreshold / periods;
    const upper = rates.niUpperEarningsLimit / periods;

    const pensionable = Math.max(0, Math.min(grossPay, upper) - lower);
    return {
      employeePension: this.r2(pensionable * (employeePct / 100)),
      employerPension: this.r2(pensionable * (employerPct / 100)),
    };
  }

  // ─── Student Loan ─────────────────────────────────────────────────────────────

  calculateStudentLoan(
    grossPay: number,
    frequency: string,
    plan: string | null,
    rates: TaxYearRates,
  ): number {
    if (!plan) return 0;
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const key = plan.toUpperCase().replace(/\s/g, '');
    const annual = rates.studentLoanThresholds[key];
    if (!annual) return 0;
    const threshold = annual / periods;
    if (grossPay <= threshold) return 0;
    const rate = key === 'PLAN3' ? rates.postgradRate : rates.studentLoanRate;
    return this.r2((grossPay - threshold) * rate);
  }

  // ─── Basic pay estimator ──────────────────────────────────────────────────────

  estimateBasicPay(params: {
    frequency: string;
    salary: number | null;
    hourlyRate: number | null;
    contractedHours: number | null;
  }): number {
    const periods = PERIODS_PER_YEAR[params.frequency] ?? 12;
    if (params.salary) return this.r2(params.salary / periods);
    if (params.hourlyRate && params.contractedHours) {
      return this.r2(
        (params.hourlyRate * params.contractedHours * 52) / periods,
      );
    }
    return 0;
  }

  // ─── Full calculation for one employee one period ─────────────────────────────

  calculate(params: {
    grossPay: number;
    taxCode: string;
    niCategory: string;
    frequency: string;
    pensionEligible: boolean;
    pensionEnrolled: boolean;
    employerPensionPct: number;
    employeePensionPct: number;
    studentLoanPlan: string | null;
    /** Pay date drives which tax-year rate set is applied. */
    payDate: Date;
  }): PayrollCalculation {
    const {
      grossPay,
      taxCode,
      niCategory,
      frequency,
      pensionEligible,
      pensionEnrolled,
      employerPensionPct,
      employeePensionPct,
      studentLoanPlan,
      payDate,
    } = params;

    const rates = this.resolveRates(payDate);

    const paye = this.calculatePAYE(grossPay, taxCode, frequency, rates);
    const { employeeNI, employerNI } = this.calculateNI(
      grossPay,
      frequency,
      niCategory,
      rates,
    );

    let employeePension = 0;
    let employerPension = 0;
    if (pensionEligible && pensionEnrolled) {
      const p = this.calculatePension(
        grossPay,
        frequency,
        employerPensionPct,
        employeePensionPct,
        rates,
      );
      employeePension = p.employeePension;
      employerPension = p.employerPension;
    }

    const studentLoanRepayment = this.calculateStudentLoan(
      grossPay,
      frequency,
      studentLoanPlan,
      rates,
    );
    const totalDeductions = this.r2(
      paye + employeeNI + employeePension + studentLoanRepayment,
    );
    const netPay = this.r2(Math.max(0, grossPay - totalDeductions));

    return {
      taxYear: rates.taxYear,
      grossPay: this.r2(grossPay),
      paye,
      employeeNI,
      employerNI,
      employeePension,
      employerPension,
      studentLoanRepayment,
      totalDeductions,
      netPay,
    };
  }

  private r2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
