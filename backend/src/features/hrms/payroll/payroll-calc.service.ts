import { Injectable } from '@nestjs/common';

// ── UK 2024/25 PAYE rates (England / Wales / Northern Ireland) ─────────────────
const PERSONAL_ALLOWANCE = 12_570;
const BASIC_RATE_LIMIT = 50_270; // upper boundary of basic-rate band
const ADDITIONAL_RATE_LIMIT = 125_140; // start of additional rate
const TAPER_THRESHOLD = 100_000; // PA reduces by £1 per £2 above this
const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const ADDITIONAL_RATE = 0.45;

// ── UK 2024/25 Class 1 NI ──────────────────────────────────────────────────────
const NI_PRIMARY_THRESHOLD = 12_570; // employee NI starts (annual)
const NI_UPPER_EARNINGS_LIMIT = 50_270; // employee upper limit (annual)
const NI_SECONDARY_THRESHOLD = 9_100; // employer NI starts (annual)
const NI_EMPLOYEE_MAIN = 0.08; // 8% (reduced from 10% in April 2024)
const NI_EMPLOYEE_UPPER = 0.02; // 2% above UEL
const NI_EMPLOYER = 0.138; // 13.8%

// ── Student loan 2024/25 annual repayment thresholds ──────────────────────────
const STUDENT_LOAN_THRESHOLDS: Record<string, number> = {
  PLAN1: 24_990,
  PLAN2: 27_295,
  PLAN3: 21_000, // Postgraduate Loan
  PLAN4: 31_395,
  PLAN5: 25_000,
};
const STUDENT_LOAN_RATE = 0.09;
const POSTGRAD_RATE = 0.06;

// ── Pension qualifying earnings 2024/25 ────────────────────────────────────────
const PENSION_LOWER_THRESHOLD = 6_240; // annual lower qualifying earnings limit

// ── Pay periods per year ───────────────────────────────────────────────────────
const PERIODS_PER_YEAR: Record<string, number> = {
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  FOUR_WEEKLY: 13,
  MONTHLY: 12,
};

export interface PayrollCalculation {
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
  // ─── Tax code parsing ────────────────────────────────────────────────────────

  private parseTaxCode(code: string): {
    annualAllowance: number;
    flatRate: number | null;
    noTax: boolean;
  } {
    const c = code.trim().toUpperCase();

    if (c === 'NT') return { annualAllowance: 0, flatRate: null, noTax: true };
    if (c === 'BR')
      return { annualAllowance: 0, flatRate: BASIC_RATE, noTax: false };
    if (c === 'D0')
      return { annualAllowance: 0, flatRate: HIGHER_RATE, noTax: false };
    if (c === 'D1')
      return { annualAllowance: 0, flatRate: ADDITIONAL_RATE, noTax: false };
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
      annualAllowance: PERSONAL_ALLOWANCE,
      flatRate: null,
      noTax: false,
    };
  }

  // ─── Taper reduction ─────────────────────────────────────────────────────────

  private taperedAllowance(
    annualAllowance: number,
    annualisedGross: number,
  ): number {
    if (annualisedGross <= TAPER_THRESHOLD) return annualAllowance;
    const reduction = Math.floor((annualisedGross - TAPER_THRESHOLD) / 2);
    return Math.max(0, annualAllowance - reduction);
  }

  // ─── PAYE ─────────────────────────────────────────────────────────────────────

  calculatePAYE(grossPay: number, taxCode: string, frequency: string): number {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const { annualAllowance, flatRate, noTax } = this.parseTaxCode(taxCode);

    if (noTax) return 0;
    if (flatRate !== null) return this.r2(Math.max(0, grossPay * flatRate));

    const annualisedGross = grossPay * periods;
    const effectiveAllowance = this.taperedAllowance(
      annualAllowance,
      annualisedGross,
    );
    const periodAllowance = effectiveAllowance / periods;

    const taxablePay = grossPay - periodAllowance;
    if (taxablePay <= 0) return 0;

    // Band sizes per period (above the personal allowance)
    const basicBandEnd = (BASIC_RATE_LIMIT - effectiveAllowance) / periods;
    const higherBandEnd =
      (ADDITIONAL_RATE_LIMIT - effectiveAllowance) / periods;

    let tax: number;
    if (taxablePay <= basicBandEnd) {
      tax = taxablePay * BASIC_RATE;
    } else if (taxablePay <= higherBandEnd) {
      tax =
        basicBandEnd * BASIC_RATE + (taxablePay - basicBandEnd) * HIGHER_RATE;
    } else {
      const higherBand = higherBandEnd - basicBandEnd;
      tax =
        basicBandEnd * BASIC_RATE +
        higherBand * HIGHER_RATE +
        (taxablePay - higherBandEnd) * ADDITIONAL_RATE;
    }

    return this.r2(Math.max(0, tax));
  }

  // ─── National Insurance (Class 1) ─────────────────────────────────────────────

  calculateNI(
    grossPay: number,
    frequency: string,
    niCategory: string,
  ): {
    employeeNI: number;
    employerNI: number;
  } {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const pt = NI_PRIMARY_THRESHOLD / periods;
    const uel = NI_UPPER_EARNINGS_LIMIT / periods;
    const st = NI_SECONDARY_THRESHOLD / periods;

    // Employee NI: Category C = no employee contribution (State Pension age)
    let employeeNI = 0;
    if (niCategory !== 'C' && grossPay > pt) {
      const mainBand = Math.min(grossPay, uel) - pt;
      const upperBand = Math.max(0, grossPay - uel);
      employeeNI = mainBand * NI_EMPLOYEE_MAIN + upperBand * NI_EMPLOYEE_UPPER;
    }

    // Employer NI (all categories)
    const employerNI = grossPay > st ? (grossPay - st) * NI_EMPLOYER : 0;

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
  ): { employeePension: number; employerPension: number } {
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const lower = PENSION_LOWER_THRESHOLD / periods;
    const upper = NI_UPPER_EARNINGS_LIMIT / periods;

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
  ): number {
    if (!plan) return 0;
    const periods = PERIODS_PER_YEAR[frequency] ?? 12;
    const key = plan.toUpperCase().replace(/\s/g, '');
    const annual = STUDENT_LOAN_THRESHOLDS[key];
    if (!annual) return 0;
    const threshold = annual / periods;
    if (grossPay <= threshold) return 0;
    const rate = key === 'PLAN3' ? POSTGRAD_RATE : STUDENT_LOAN_RATE;
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
    } = params;

    const paye = this.calculatePAYE(grossPay, taxCode, frequency);
    const { employeeNI, employerNI } = this.calculateNI(
      grossPay,
      frequency,
      niCategory,
    );

    let employeePension = 0;
    let employerPension = 0;
    if (pensionEligible && pensionEnrolled) {
      const p = this.calculatePension(
        grossPay,
        frequency,
        employerPensionPct,
        employeePensionPct,
      );
      employeePension = p.employeePension;
      employerPension = p.employerPension;
    }

    const studentLoanRepayment = this.calculateStudentLoan(
      grossPay,
      frequency,
      studentLoanPlan,
    );
    const totalDeductions = this.r2(
      paye + employeeNI + employeePension + studentLoanRepayment,
    );
    const netPay = this.r2(Math.max(0, grossPay - totalDeductions));

    return {
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
