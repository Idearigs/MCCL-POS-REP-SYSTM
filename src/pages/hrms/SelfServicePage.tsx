import React, { useState, useEffect, useCallback } from 'react';
import {
  User, FileText, Calendar, Clock, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, XCircle, Loader2, Download,
  TrendingUp, Shield, Briefcase, Phone, Home, Users,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  hrmsService,
  Employee, Payslip, LeaveRequest, LeaveType, Timesheet,
  TimesheetEntryInput, EntryType,
} from '../../services/hrmsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function currentTaxYear(): string {
  const now = new Date();
  const yr = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const startYr = (m > 4 || (m === 4 && d >= 6)) ? yr : yr - 1;
  return `${startYr}-${String(startYr + 1).slice(2)}`;
}

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'ANNUAL',          label: 'Annual Leave' },
  { value: 'SICK',            label: 'Sick Leave' },
  { value: 'MATERNITY',       label: 'Maternity Leave' },
  { value: 'PATERNITY',       label: 'Paternity Leave' },
  { value: 'SHARED_PARENTAL', label: 'Shared Parental' },
  { value: 'COMPASSIONATE',   label: 'Compassionate Leave' },
  { value: 'JURY_DUTY',       label: 'Jury Duty' },
  { value: 'STUDY',           label: 'Study Leave' },
  { value: 'UNPAID',          label: 'Unpaid Leave' },
  { value: 'OTHER',           label: 'Other' },
];

const LEAVE_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING:   { label: 'Pending',   variant: 'secondary' },
  APPROVED:  { label: 'Approved',  variant: 'default' },
  REJECTED:  { label: 'Rejected',  variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
};

const TS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'Approved',  cls: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-100 text-red-700' },
};

const ENTRY_TYPES: { value: EntryType; label: string; color: string }[] = [
  { value: 'REGULAR',      label: 'Regular',      color: 'text-green-700' },
  { value: 'OVERTIME',     label: 'Overtime',     color: 'text-blue-700' },
  { value: 'SICK',         label: 'Sick',         color: 'text-red-700' },
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave', color: 'text-purple-700' },
  { value: 'BANK_HOLIDAY', label: 'Bank Holiday', color: 'text-orange-700' },
  { value: 'TRAINING',     label: 'Training',     color: 'text-indigo-700' },
  { value: 'UNPAID',       label: 'Unpaid',       color: 'text-gray-700' },
  { value: 'OTHER',        label: 'Other',        color: 'text-gray-500' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Not Linked State ─────────────────────────────────────────────────────────

function NotLinked() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <User className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-1">No Employee Profile Linked</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account isn't linked to an employee record yet. Ask your HR manager to set your
          work email on your employee profile to match your login email.
        </p>
      </div>
    </div>
  );
}

// ─── My Profile Tab ───────────────────────────────────────────────────────────

function ProfileTab({ employee }: { employee: Employee }) {
  const sections = [
    {
      icon: User,
      title: 'Personal Details',
      rows: [
        ['Full Name',      employee.fullName],
        ['Preferred Name', employee.preferredName],
        ['Date of Birth',  employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB') : undefined],
        ['Gender',         employee.gender?.replace(/_/g, ' ')],
        ['Nationality',    employee.nationality],
      ],
    },
    {
      icon: Briefcase,
      title: 'Employment',
      rows: [
        ['Employee No.',   employee.employeeNumber],
        ['Job Title',      employee.jobTitle],
        ['Department',     employee.departmentName],
        ['Status',         employee.status?.replace(/_/g, ' ')],
        ['Employment Type',employee.employmentType?.replace(/_/g, ' ')],
        ['Contract Type',  employee.contractType?.replace(/_/g, ' ')],
        ['Start Date',     employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB') : undefined],
        ['Pay Frequency',  employee.payFrequency?.replace(/_/g, ' ')],
      ],
    },
    {
      icon: Shield,
      title: 'Payroll & Pension',
      rows: [
        ['Tax Code',        employee.taxCode],
        ['NI Category',     employee.niCategory],
        ['NI Number',       employee.niNumberMasked],
        ['Pension Eligible',employee.pensionEligible ? 'Yes' : 'No'],
        ['Pension Enrolled',employee.pensionEnrolled ? 'Yes' : 'No'],
        ['Employee Pension',employee.employeePensionPct != null ? `${employee.employeePensionPct}%` : undefined],
        ['Employer Pension',employee.employerPensionPct != null ? `${employee.employerPensionPct}%` : undefined],
        ['Annual Leave',    `${employee.annualLeaveEntitlement} days`],
      ],
    },
    {
      icon: Home,
      title: 'Address',
      rows: [
        ['Address Line 1', employee.addressLine1],
        ['Address Line 2', employee.addressLine2],
        ['City',           employee.city],
        ['County',         employee.county],
        ['Postcode',       employee.postcode],
        ['Country',        employee.country],
      ],
    },
    {
      icon: Phone,
      title: 'Emergency Contact',
      rows: [
        ['Name',           employee.emergencyName],
        ['Phone',          employee.emergencyPhone],
        ['Relationship',   employee.emergencyRelation],
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(section => {
        const visibleRows = section.rows.filter(([, v]) => v != null && v !== '');
        if (visibleRows.length === 0) return null;
        return (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <section.icon className="h-4 w-4" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {visibleRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── My Payslips Tab ──────────────────────────────────────────────────────────

function PayslipsTab({ employeeId }: { employeeId: string }) {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Payslip | null>(null);

  useEffect(() => {
    setLoading(true);
    hrmsService.getEmployeePayslips(employeeId)
      .then(setPayslips)
      .catch(() => toast.error('Failed to load payslips'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading payslips…</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{payslips.length} finalized payslip{payslips.length !== 1 ? 's' : ''}</p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pay Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">NI</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payslips yet</TableCell>
              </TableRow>
            ) : payslips.map(p => (
              <TableRow key={p.id}>
                <TableCell className="text-sm font-medium">
                  {new Date(p.payDate).toLocaleDateString('en-GB')}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.payPeriodStart).toLocaleDateString('en-GB')} –{' '}
                  {new Date(p.payPeriodEnd).toLocaleDateString('en-GB')}
                </TableCell>
                <TableCell className="text-right text-sm">{fmt(p.grossPay)}</TableCell>
                <TableCell className="text-right text-sm text-red-600">{fmt(p.paye)}</TableCell>
                <TableCell className="text-right text-sm text-orange-600">{fmt(p.employeeNI)}</TableCell>
                <TableCell className="text-right text-sm font-bold">{fmt(p.netPay)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setDetail(p)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Payslip Detail */}
      <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payslip — {detail && new Date(detail.payDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                <span>Tax Code:</span>    <span className="font-mono font-medium text-foreground">{detail.taxCode}</span>
                <span>NI Category:</span><span className="font-medium text-foreground">{detail.niCategory}</span>
                <span>Period:</span>
                <span className="text-foreground">
                  {new Date(detail.payPeriodStart).toLocaleDateString('en-GB')} – {new Date(detail.payPeriodEnd).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className="border rounded p-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Earnings</p>
                {[
                  ['Basic Pay',      detail.basicPay],
                  ['Overtime',       detail.overtimePay],
                  ['Bonus',          detail.bonusPay],
                  ['Commission',     detail.commissionPay],
                  ['Sick Pay',       detail.sickPay],
                  ['Holiday Pay',    detail.holidayPay],
                  ['Other',          detail.otherAdditions],
                ].filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={String(l)} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span>{fmt(Number(v))}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                  <span>Gross Pay</span>
                  <span>{fmt(detail.grossPay)}</span>
                </div>
              </div>
              <div className="border rounded p-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Deductions</p>
                {[
                  ['PAYE Tax',        detail.paye,                   'text-red-600'],
                  ['Employee NI',     detail.employeeNI,             'text-orange-600'],
                  ['Employee Pension',detail.employeePension,        'text-blue-600'],
                  ['Student Loan',    detail.studentLoanRepayment,   'text-purple-600'],
                  ['Other',          detail.otherDeductions,         ''],
                ].filter(([, v]) => Number(v) > 0).map(([l, v, cls]) => (
                  <div key={String(l)} className={`flex justify-between ${cls}`}>
                    <span className="text-muted-foreground">{l}</span>
                    <span>{fmt(Number(v))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-bold border rounded p-3 bg-muted/30">
                <span>Net Pay</span>
                <span>{fmt(detail.netPay)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center text-muted-foreground">
                <div className="border rounded p-2">
                  <p>YTD Gross</p>
                  <p className="font-medium text-foreground">{fmt(detail.ytdGross)}</p>
                </div>
                <div className="border rounded p-2">
                  <p>YTD Tax</p>
                  <p className="font-medium text-foreground">{fmt(detail.ytdTax)}</p>
                </div>
                <div className="border rounded p-2">
                  <p>YTD NI</p>
                  <p className="font-medium text-foreground">{fmt(detail.ytdEmployeeNI)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── My Leave Tab ─────────────────────────────────────────────────────────────

function LeaveTab({ employee }: { employee: Employee }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'ANNUAL' as LeaveType,
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    hrmsService.getLeaveRequests(employee.id)
      .then(setRequests)
      .catch(() => toast.error('Failed to load leave requests'))
      .finally(() => setLoading(false));
  }, [employee.id]);

  useEffect(() => { load(); }, [load]);

  // Compute leave balance for current year
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const annualApproved = requests
    .filter(r => r.leaveType === 'ANNUAL' && r.status === 'APPROVED' && new Date(r.startDate) >= yearStart)
    .reduce((s, r) => s + r.days, 0);
  const annualPending = requests
    .filter(r => r.leaveType === 'ANNUAL' && r.status === 'PENDING' && new Date(r.startDate) >= yearStart)
    .reduce((s, r) => s + r.days, 0);
  const entitlement = employee.annualLeaveEntitlement;
  const remaining = entitlement - annualApproved - annualPending;

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) { toast.error('Start and end date are required'); return; }
    if (new Date(form.startDate) > new Date(form.endDate)) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      await hrmsService.createLeaveRequest(employee.id, {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes || undefined,
      });
      toast.success('Leave request submitted');
      setRequestOpen(false);
      setForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', notes: '' });
      load();
    } catch {
      toast.error('Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Balance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Entitlement', value: `${entitlement}d`, cls: 'text-slate-600' },
          { label: 'Used',        value: `${annualApproved}d`, cls: 'text-green-600' },
          { label: 'Pending',     value: `${annualPending}d`, cls: 'text-yellow-600' },
          { label: 'Remaining',   value: `${remaining}d`, cls: remaining < 5 ? 'text-red-600' : 'text-blue-600' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-2xl font-bold ${c.cls}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
        {entitlement > 0 && (
          <>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min((annualApproved / entitlement) * 100, 100)}%` }} />
            <div className="h-full bg-yellow-400 transition-all" style={{ width: `${Math.min((annualPending / entitlement) * 100, 100)}%` }} />
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-right">
        <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Approved</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" /> Pending</span>
      </p>

      {/* Header + button */}
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Leave History</p>
        <Button size="sm" onClick={() => setRequestOpen(true)}>
          Request Leave
        </Button>
      </div>

      {/* Leave table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
            ) : requests.map(r => {
              const sb = LEAVE_STATUS_BADGE[r.status] ?? { label: r.status, variant: 'outline' as const };
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{LEAVE_TYPES.find(t => t.value === r.leaveType)?.label ?? r.leaveType}</TableCell>
                  <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="text-sm">{new Date(r.endDate).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="text-right text-sm">{r.days}</TableCell>
                  <TableCell><Badge variant={sb.variant}>{sb.label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.notes ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Request Leave Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leaveType} onValueChange={v => setForm(f => ({ ...f, leaveType: v as LeaveType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Reason or additional information…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── My Timesheets Tab ────────────────────────────────────────────────────────

interface DayEntry {
  entryType: EntryType;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hoursWorked: string;
  notes: string;
}

const BLANK_DAY: DayEntry = { entryType: 'REGULAR', startTime: '', endTime: '', breakMinutes: 0, hoursWorked: '', notes: '' };

function TimesheetsTab({ employeeId }: { employeeId: string }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<DayEntry[]>(Array.from({ length: 7 }, () => ({ ...BLANK_DAY })));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = await hrmsService.getTimesheet(employeeId, isoDate(weekStart));
      setTimesheet(ts);
      // Populate day entries from timesheet
      const newDays = Array.from({ length: 7 }, (_, i) => {
        const date = isoDate(addDays(weekStart, i));
        const entry = ts.entries.find(e => e.entryDate.slice(0, 10) === date);
        if (!entry) return { ...BLANK_DAY };
        return {
          entryType: entry.entryType,
          startTime: entry.startTime ?? '',
          endTime: entry.endTime ?? '',
          breakMinutes: entry.breakMinutes,
          hoursWorked: entry.hoursWorked > 0 ? String(entry.hoursWorked) : '',
          notes: entry.notes ?? '',
        };
      });
      setDays(newDays);
    } catch {
      toast.error('Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  }, [employeeId, weekStart]);

  useEffect(() => { load(); }, [load]);

  const updateDay = (idx: number, field: keyof DayEntry, value: string | number) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    if (timesheet?.status === 'SUBMITTED' || timesheet?.status === 'APPROVED') return;
    setSaving(true);
    try {
      const entries: TimesheetEntryInput[] = days
        .map((d, i) => ({
          entryDate: isoDate(addDays(weekStart, i)),
          entryType: d.entryType,
          startTime: d.startTime || undefined,
          endTime: d.endTime || undefined,
          breakMinutes: d.breakMinutes,
          hoursWorked: d.hoursWorked ? parseFloat(d.hoursWorked) : undefined,
          notes: d.notes || undefined,
        }))
        .filter(e => e.startTime || (e.hoursWorked != null && e.hoursWorked > 0));
      await hrmsService.saveTimesheetEntries(employeeId, isoDate(weekStart), entries);
      toast.success('Timesheet saved');
      load();
    } catch {
      toast.error('Failed to save timesheet');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!timesheet) return;
    setSaving(true);
    try {
      await hrmsService.submitTimesheet(timesheet.id);
      toast.success('Timesheet submitted for approval');
      load();
    } catch {
      toast.error('Failed to submit timesheet');
    } finally {
      setSaving(false);
    }
  };

  const isLocked = timesheet?.status === 'SUBMITTED' || timesheet?.status === 'APPROVED';
  const status = timesheet?.status ?? 'DRAFT';
  const sb = TS_BADGE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(w => addDays(w, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
            {addDays(weekStart, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(w => addDays(w, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(getMonday(new Date()))}>Today</Button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${sb.cls}`}>{sb.label}</span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Status messages */}
      {timesheet?.status === 'REJECTED' && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Timesheet Rejected</p>
            {timesheet.rejectedReason && <p className="text-red-600">{timesheet.rejectedReason}</p>}
            <p className="text-xs mt-1">Make corrections and resubmit.</p>
          </div>
        </div>
      )}
      {timesheet?.status === 'APPROVED' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          Timesheet approved — approved on {timesheet.approvedAt ? new Date(timesheet.approvedAt).toLocaleDateString('en-GB') : '—'}
        </div>
      )}
      {timesheet?.status === 'SUBMITTED' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <AlertCircle className="h-4 w-4" />
          Submitted — awaiting manager approval
        </div>
      )}

      {/* Day entries */}
      <div className="space-y-2">
        {weekDates.map((date, i) => {
          const d = days[i];
          const isWeekend = date.getDay() === 6 || date.getDay() === 0;
          const typeInfo = ENTRY_TYPES.find(t => t.value === d.entryType);
          const isTimeEntry = d.entryType === 'REGULAR' || d.entryType === 'OVERTIME';

          return (
            <Card key={i} className={isWeekend ? 'opacity-70' : ''}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  {/* Day label */}
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs text-muted-foreground">{DAY_NAMES[i]}</p>
                    <p className="text-sm font-medium">{date.getDate()}</p>
                  </div>

                  {/* Entry type */}
                  <div className="w-36 shrink-0">
                    <Select
                      value={d.entryType}
                      onValueChange={v => updateDay(i, 'entryType', v)}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>
                            <span className={t.color}>{t.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time or hours */}
                  {isTimeEntry ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 w-20 text-xs"
                          type="time"
                          value={d.startTime}
                          onChange={e => updateDay(i, 'startTime', e.target.value)}
                          disabled={isLocked}
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          className="h-8 w-20 text-xs"
                          type="time"
                          value={d.endTime}
                          onChange={e => updateDay(i, 'endTime', e.target.value)}
                          disabled={isLocked}
                        />
                        <Input
                          className="h-8 w-16 text-xs"
                          type="number"
                          min="0"
                          placeholder="Break"
                          value={d.breakMinutes || ''}
                          onChange={e => updateDay(i, 'breakMinutes', parseInt(e.target.value) || 0)}
                          disabled={isLocked}
                          title="Break minutes"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-8 w-20 text-xs"
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="Hours"
                        value={d.hoursWorked}
                        onChange={e => updateDay(i, 'hoursWorked', e.target.value)}
                        disabled={isLocked}
                      />
                      <span className="text-xs text-muted-foreground">hrs</span>
                    </div>
                  )}

                  {/* Notes */}
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="Notes…"
                    value={d.notes}
                    onChange={e => updateDay(i, 'notes', e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Totals + actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          {timesheet && (
            <span>
              Total: <strong className="text-foreground">{Number(timesheet.totalHours).toFixed(2)}h</strong>
              {' · '}Regular: <strong className="text-foreground">{Number(timesheet.regularHours).toFixed(2)}h</strong>
              {' · '}Overtime: <strong className="text-blue-600">{Number(timesheet.overtimeHours).toFixed(2)}h</strong>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
            </Button>
          )}
          {(status === 'DRAFT' || status === 'REJECTED') && timesheet && (
            <Button onClick={handleSubmit} disabled={saving}>
              Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SelfServicePage ──────────────────────────────────────────────────────────

export default function SelfServicePage() {
  const [meResult, setMeResult] = useState<{ linked: boolean; employee: Employee | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [taxYear] = useState(currentTaxYear());

  useEffect(() => {
    hrmsService.getMe()
      .then(setMeResult)
      .catch(() => setMeResult({ linked: false, employee: null }))
      .finally(() => setLoading(false));
  }, []);

  const employee = meResult?.employee ?? null;

  return (
    <MainLayout pageTitle="My Portal">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Portal</h1>
            <p className="text-sm text-muted-foreground">Your personal HR self-service</p>
          </div>
          {employee && (
            <Badge variant="outline" className="ml-auto">
              {employee.employeeNumber} · {employee.jobTitle ?? employee.departmentName ?? 'Employee'}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your profile…
          </div>
        ) : !meResult?.linked || !employee ? (
          <NotLinked />
        ) : (
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              <TabsTrigger value="profile" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="payslips" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Payslips
              </TabsTrigger>
              <TabsTrigger value="leave" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Leave
              </TabsTrigger>
              <TabsTrigger value="timesheets" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Timesheets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <ProfileTab employee={employee} />
            </TabsContent>

            <TabsContent value="payslips" className="mt-6">
              <PayslipsTab employeeId={employee.id} />
            </TabsContent>

            <TabsContent value="leave" className="mt-6">
              <LeaveTab employee={employee} />
            </TabsContent>

            <TabsContent value="timesheets" className="mt-6">
              <TimesheetsTab employeeId={employee.id} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
