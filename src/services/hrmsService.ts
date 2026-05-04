import { apiClient } from './apiClient';

const BASE = '/hrms';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'PROBATION' | 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | 'INACTIVE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'ZERO_HOURS' | 'CASUAL' | 'FIXED_TERM' | 'CONTRACTOR' | 'APPRENTICE' | 'INTERN';
export type ContractType = 'PERMANENT' | 'FIXED_TERM' | 'CASUAL' | 'AGENCY' | 'SELF_EMPLOYED' | 'ZERO_HOURS';
export type PayFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'FOUR_WEEKLY' | 'MONTHLY';
export type NiCategory = 'A' | 'B' | 'C' | 'H' | 'J' | 'M' | 'Z';
export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'CIVIL_PARTNERSHIP' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED' | 'OTHER';
export type TitleType = 'MR' | 'MRS' | 'MS' | 'MISS' | 'DR' | 'PROF' | 'OTHER';
export type StarterDeclaration = 'A' | 'B' | 'C';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'SHARED_PARENTAL' | 'COMPASSIONATE' | 'JURY_DUTY' | 'STUDY' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  title?: TitleType;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  preferredName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  ethnicity?: string;
  personalEmail?: string;
  workEmail?: string;
  personalPhone?: string;
  workPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country: string;
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionTitle?: string;
  managerId?: string;
  jobTitle?: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  noticePeriodDays?: number;
  niNumberMasked?: string;
  taxCode?: string;
  niCategory?: NiCategory;
  payFrequency?: PayFrequency;
  salary?: number;
  hourlyRate?: number;
  contractedHours?: number;
  bankName?: string;
  bankSortCodeMasked?: string;
  bankAccountNoMasked?: string;
  starterDeclaration?: StarterDeclaration;
  p45Received: boolean;
  pensionEligible: boolean;
  pensionEnrolled: boolean;
  employerPensionPct?: number;
  employeePensionPct?: number;
  annualLeaveEntitlement: number;
  studentLoanPlan?: string;
  rightToWorkChecked: boolean;
  rightToWorkExpiry?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateEmployeeData = Partial<Omit<Employee, 'id' | 'tenantId' | 'employeeNumber' | 'fullName' | 'departmentName' | 'positionTitle' | 'niNumberMasked' | 'bankSortCodeMasked' | 'bankAccountNoMasked' | 'pensionEligible' | 'isActive' | 'createdAt' | 'updatedAt'>> & {
  firstName: string;
  lastName: string;
  startDate: string;
  niNumber?: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNo?: string;
};

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: EmployeeStatus;
  departmentId?: string;
  employmentType?: EmploymentType;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  description?: string;
  managerId?: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  tenantId: string;
  title: string;
  code?: string;
  description?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: number;
  notes?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrmsStats {
  total: number;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
  pendingLeaveRequests: number;
  probationEndingSoon: number;
}

// ─── Attendance Types ─────────────────────────────────────────────────────────

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type EntryType =
  | 'REGULAR' | 'OVERTIME' | 'SICK' | 'ANNUAL_LEAVE'
  | 'BANK_HOLIDAY' | 'TRAINING' | 'UNPAID' | 'OTHER';

export interface TimesheetEntry {
  id: string;
  tenantId: string;
  timesheetId: string;
  employeeId: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  breakMinutes: number;
  hoursWorked: number;
  entryType: EntryType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  tenantId: string;
  employeeId: string;
  weekStartDate: string;
  status: TimesheetStatus;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
  notes?: string;
  entries: TimesheetEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyOverviewEmployee {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  timesheetId: string | null;
  timesheetStatus: TimesheetStatus | null;
  days: Record<string, { hoursWorked: number; entryType: EntryType } | null>;
  totalHours: number;
  wtdAverage: number;
  wtdStatus: 'OK' | 'WARNING' | 'VIOLATION';
}

export interface WeeklyOverview {
  weekStart: string;
  weekEnd: string;
  days: string[];
  employees: WeeklyOverviewEmployee[];
  bankHolidays: Array<{ date: string; name: string }>;
  summary: {
    totalEmployees: number;
    totalHours: number;
    pendingApprovals: number;
    wtdWarnings: number;
  };
}

export interface WtdResult {
  average: number;
  weeksTracked: number;
  totalHours: number;
  status: 'OK' | 'WARNING' | 'VIOLATION';
}

export interface ZeroHoursResult {
  totalHoursWorked: number;
  holidayHoursAccrued: number;
  holidayDaysAccrued: number;
  taxYearStart: string;
}

export interface BankHoliday {
  id: string;
  tenantId?: string;
  name: string;
  date: string;
  region: string;
  createdAt: string;
}

export interface TimesheetEntryInput {
  entryDate: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  hoursWorked?: number;
  entryType?: EntryType;
  notes?: string;
}

// ─── Payroll Types ────────────────────────────────────────────────────────────

export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'LOCKED';
export type PayslipStatus = 'DRAFT' | 'FINAL';

export interface PayrollRun {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  payFrequency: PayFrequency;
  status: PayrollStatus;
  employeeCount: number;
  totalGross: number;
  totalTax: number;
  totalEmployeeNI: number;
  totalEmployerNI: number;
  totalEmployeePension: number;
  totalEmployerPension: number;
  totalNetPay: number;
  createdBy: string;
  processedAt?: string;
  lockedAt?: string;
  notes?: string;
  payslipCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  payFrequency: PayFrequency;
  taxCode: string;
  niCategory: NiCategory;
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
  employerNI: number;
  employeePension: number;
  employerPension: number;
  studentLoanRepayment: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  pensionEligible: boolean;
  pensionEnrolled: boolean;
  ytdGross: number;
  ytdTax: number;
  ytdEmployeeNI: number;
  status: PayslipStatus;
  notes?: string;
  payrollRun?: Pick<PayrollRun, 'id' | 'periodStart' | 'periodEnd' | 'payDate' | 'payFrequency'>;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipAdjustments {
  overtimePay?: number;
  bonusPay?: number;
  commissionPay?: number;
  sickPay?: number;
  holidayPay?: number;
  otherAdditions?: number;
  otherDeductions?: number;
  notes?: string;
}

// ─── Reports Types ────────────────────────────────────────────────────────────

export type P11dBenefitType =
  | 'COMPANY_CAR' | 'MEDICAL_INSURANCE' | 'LIFE_INSURANCE' | 'GYM_MEMBERSHIP'
  | 'INTEREST_FREE_LOAN' | 'VOUCHERS' | 'ACCOMMODATION' | 'TRAVEL_SUBSISTENCE'
  | 'ENTERTAINMENT' | 'OTHER';

export interface P60Summary {
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  department?: string;
  taxCode: string;
  niCategory: NiCategory;
  payslipCount: number;
  grossPay: number;
  paye: number;
  employeeNI: number;
  netPay: number;
}

export interface P60Detail {
  taxYear: string;
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    taxCode: string;
    niCategory: NiCategory;
    niNumberMasked?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
  };
  summary: {
    grossPay: number;
    paye: number;
    employeeNI: number;
    employerNI: number;
    employeePension: number;
    employerPension: number;
    studentLoan: number;
    netPay: number;
    payslipCount: number;
    taxYearStart: string;
    taxYearEnd: string;
  };
}

export interface P11dBenefit {
  id: string;
  benefitType: P11dBenefitType;
  description: string;
  cashEquivalent: number;
  taxYear: string;
  notes?: string;
  createdAt: string;
}

export interface P11dDetail {
  employee: { id: string; employeeNumber: string; fullName: string };
  taxYear: string;
  benefits: P11dBenefit[];
  totalCashEquivalent: number;
}

export interface P11dSummary {
  taxYear: string;
  employees: Array<{
    employeeId: string;
    employeeNumber: string;
    fullName: string;
    department?: string;
    total: number;
    benefits: Array<{
      id: string;
      benefitType: P11dBenefitType;
      description: string;
      cashEquivalent: number;
      notes?: string;
    }>;
  }>;
  grandTotal: number;
}

export interface CreateP11dBenefitData {
  taxYear: string;
  benefitType: P11dBenefitType;
  description: string;
  cashEquivalent: number;
  notes?: string;
}

export interface MonthlyPayrollTrend {
  month: string;
  gross: number;
  net: number;
  paye: number;
  employeeNI: number;
  employerNI: number;
  pension: number;
  headcount: number;
}

export interface PayrollAnalytics {
  period: { from: string; to: string };
  totals: { gross: number; net: number; paye: number; ni: number; headcount: number };
  monthlyTrend: MonthlyPayrollTrend[];
  departmentBreakdown: Array<{ name: string; gross: number; count: number }>;
  payTypeTotals: {
    basicPay: number; overtimePay: number; bonusPay: number;
    commissionPay: number; sickPay: number; holidayPay: number; otherAdditions: number;
  };
}

export interface WeeklyAttendanceTrend {
  week: string;
  totalHours: number;
  approved: number;
  submitted: number;
  draft: number;
}

export interface AttendanceAnalytics {
  period: { from: string; to: string };
  summary: {
    totalTimesheets: number;
    approvedTimesheets: number;
    approvalRate: number;
    wtdCompliance: { ok: number; warning: number; violation: number };
  };
  weeklyTrend: WeeklyAttendanceTrend[];
  absenceByType: Array<{ type: string; hours: number }>;
  departmentAttendance: Array<{ name: string; totalHours: number; regularHours: number; overtimeHours: number; headcount: number }>;
  topEmployees: Array<{ employeeId: string; fullName: string; employeeNumber: string; totalHours: number; timesheetCount: number }>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const hrmsService = {
  // Self-Service
  async getMe(): Promise<{ linked: boolean; employee: Employee | null }> {
    return apiClient.get(`${BASE}/me`);
  },

  // Stats
  async getStats(): Promise<HrmsStats> {
    return apiClient.get(`${BASE}/stats`);
  },

  // Employees
  async getEmployees(query: EmployeeQuery = {}): Promise<{ data: Employee[]; meta: any }> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.departmentId) params.set('departmentId', query.departmentId);
    if (query.employmentType) params.set('employmentType', query.employmentType);
    const qs = params.toString();
    return apiClient.get(`${BASE}/employees${qs ? `?${qs}` : ''}`);
  },

  async getEmployee(id: string): Promise<Employee> {
    return apiClient.get(`${BASE}/employees/${id}`);
  },

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    return apiClient.post(`${BASE}/employees`, data);
  },

  async updateEmployee(id: string, data: Partial<CreateEmployeeData>): Promise<Employee> {
    return apiClient.put(`${BASE}/employees/${id}`, data);
  },

  async terminateEmployee(id: string): Promise<void> {
    return apiClient.delete(`${BASE}/employees/${id}`);
  },

  // Leave
  async createLeaveRequest(employeeId: string, data: { leaveType: LeaveType; startDate: string; endDate: string; notes?: string }): Promise<LeaveRequest> {
    return apiClient.post(`${BASE}/employees/${employeeId}/leave`, data);
  },

  async getLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
    return apiClient.get(`${BASE}/employees/${employeeId}/leave`);
  },

  async updateLeaveStatus(leaveId: string, status: LeaveStatus, rejectedReason?: string): Promise<LeaveRequest> {
    return apiClient.patch(`${BASE}/leave/${leaveId}/status`, { status, rejectedReason });
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    return apiClient.get(`${BASE}/departments`);
  },

  async createDepartment(data: { name: string; code?: string; description?: string; managerId?: string }): Promise<Department> {
    return apiClient.post(`${BASE}/departments`, data);
  },

  async updateDepartment(id: string, data: { name: string; code?: string; description?: string; managerId?: string }): Promise<Department> {
    return apiClient.put(`${BASE}/departments/${id}`, data);
  },

  // Positions
  async getPositions(): Promise<Position[]> {
    return apiClient.get(`${BASE}/positions`);
  },

  async createPosition(data: { title: string; code?: string; description?: string; department?: string }): Promise<Position> {
    return apiClient.post(`${BASE}/positions`, data);
  },

  // Payroll Runs
  async getPayrollRuns(page = 1, limit = 20): Promise<{ data: PayrollRun[]; meta: any }> {
    return apiClient.get(`${BASE}/payroll/runs?page=${page}&limit=${limit}`);
  },

  async getPayrollRun(id: string): Promise<PayrollRun> {
    return apiClient.get(`${BASE}/payroll/runs/${id}`);
  },

  async createPayrollRun(data: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    payFrequency?: string;
    notes?: string;
  }): Promise<PayrollRun> {
    return apiClient.post(`${BASE}/payroll/runs`, data);
  },

  async deletePayrollRun(id: string): Promise<void> {
    return apiClient.delete(`${BASE}/payroll/runs/${id}`);
  },

  async generatePayslips(runId: string): Promise<{ generated: number }> {
    return apiClient.post(`${BASE}/payroll/runs/${runId}/generate`, {});
  },

  async finalizePayrollRun(runId: string): Promise<PayrollRun> {
    return apiClient.post(`${BASE}/payroll/runs/${runId}/finalize`, {});
  },

  // Payslips
  async getPayslips(runId: string): Promise<Payslip[]> {
    return apiClient.get(`${BASE}/payroll/runs/${runId}/payslips`);
  },

  async getPayslip(id: string): Promise<Payslip> {
    return apiClient.get(`${BASE}/payroll/payslips/${id}`);
  },

  async updatePayslip(id: string, data: PayslipAdjustments): Promise<Payslip> {
    return apiClient.put(`${BASE}/payroll/payslips/${id}`, data);
  },

  async getEmployeePayslips(employeeId: string): Promise<Payslip[]> {
    return apiClient.get(`${BASE}/payroll/employees/${employeeId}/payslips`);
  },

  // Attendance — Weekly Overview
  async getWeeklyOverview(weekStart: string): Promise<WeeklyOverview> {
    return apiClient.get(`${BASE}/attendance/overview?weekStart=${weekStart}`);
  },

  // Attendance — Timesheets
  async getTimesheet(employeeId: string, weekStart: string): Promise<Timesheet> {
    return apiClient.get(`${BASE}/attendance/timesheets/${employeeId}?weekStart=${weekStart}`);
  },

  async saveTimesheetEntries(
    employeeId: string,
    weekStart: string,
    entries: TimesheetEntryInput[],
    notes?: string,
  ): Promise<Timesheet> {
    return apiClient.post(
      `${BASE}/attendance/timesheets/${employeeId}/entries?weekStart=${weekStart}`,
      { entries, notes },
    );
  },

  async deleteTimesheetEntry(timesheetId: string, entryDate: string): Promise<void> {
    return apiClient.delete(`${BASE}/attendance/timesheets/${timesheetId}/entries/${entryDate}`);
  },

  async submitTimesheet(timesheetId: string): Promise<Timesheet> {
    return apiClient.post(`${BASE}/attendance/timesheets/${timesheetId}/submit`, {});
  },

  async approveTimesheet(timesheetId: string): Promise<Timesheet> {
    return apiClient.post(`${BASE}/attendance/timesheets/${timesheetId}/approve`, {});
  },

  async rejectTimesheet(timesheetId: string, reason: string): Promise<Timesheet> {
    return apiClient.post(`${BASE}/attendance/timesheets/${timesheetId}/reject`, { reason });
  },

  // Attendance — WTD & Zero-hours
  async getWtdAverage(employeeId: string): Promise<WtdResult> {
    return apiClient.get(`${BASE}/attendance/wtd/${employeeId}`);
  },

  async getZeroHoursHoliday(employeeId: string): Promise<ZeroHoursResult> {
    return apiClient.get(`${BASE}/attendance/zero-hours/${employeeId}`);
  },

  // Attendance — Bank Holidays
  async getBankHolidays(year: number): Promise<BankHoliday[]> {
    return apiClient.get(`${BASE}/attendance/bank-holidays?year=${year}`);
  },

  async seedBankHolidays(year: number): Promise<{ seeded: number; total: number }> {
    return apiClient.post(`${BASE}/attendance/bank-holidays/seed?year=${year}`, {});
  },

  async deleteBankHoliday(id: string): Promise<void> {
    return apiClient.delete(`${BASE}/attendance/bank-holidays/${id}`);
  },

  // ─── Reports — P60 ────────────────────────────────────────────────────────────

  async getAllP60s(taxYear: string): Promise<P60Summary[]> {
    return apiClient.get(`${BASE}/reports/p60?taxYear=${taxYear}`);
  },

  async getP60(employeeId: string, taxYear: string): Promise<P60Detail> {
    return apiClient.get(`${BASE}/reports/p60/${employeeId}?taxYear=${taxYear}`);
  },

  // ─── Reports — P11D ───────────────────────────────────────────────────────────

  async getAllP11ds(taxYear: string): Promise<P11dSummary> {
    return apiClient.get(`${BASE}/reports/p11d?taxYear=${taxYear}`);
  },

  async getP11d(employeeId: string, taxYear: string): Promise<P11dDetail> {
    return apiClient.get(`${BASE}/reports/p11d/${employeeId}?taxYear=${taxYear}`);
  },

  async createP11dBenefit(employeeId: string, data: CreateP11dBenefitData): Promise<P11dBenefit> {
    return apiClient.post(`${BASE}/reports/p11d/${employeeId}`, data);
  },

  async deleteP11dBenefit(id: string): Promise<void> {
    return apiClient.delete(`${BASE}/reports/p11d/benefit/${id}`);
  },

  // ─── Reports — Analytics ──────────────────────────────────────────────────────

  async getPayrollAnalytics(from?: string, to?: string): Promise<PayrollAnalytics> {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString();
    return apiClient.get(`${BASE}/reports/analytics/payroll${q ? `?${q}` : ''}`);
  },

  async getAttendanceAnalytics(from?: string, to?: string): Promise<AttendanceAnalytics> {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString();
    return apiClient.get(`${BASE}/reports/analytics/attendance${q ? `?${q}` : ''}`);
  },
};
