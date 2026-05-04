import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, RefreshCw, Clock, AlertTriangle,
  CheckCircle, XCircle, FileText, Users, Calendar, Trash2,
  Sun, Edit, Send,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  hrmsService,
  WeeklyOverview, WeeklyOverviewEmployee,
  Timesheet, TimesheetEntry, EntryType, BankHoliday,
} from '../../services/hrmsService';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ENTRY_TYPES: { value: EntryType; label: string; color: string }[] = [
  { value: 'REGULAR', label: 'Regular', color: 'text-green-700 bg-green-50' },
  { value: 'OVERTIME', label: 'Overtime', color: 'text-blue-700 bg-blue-50' },
  { value: 'SICK', label: 'Sick', color: 'text-orange-700 bg-orange-50' },
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave', color: 'text-purple-700 bg-purple-50' },
  { value: 'BANK_HOLIDAY', label: 'Bank Holiday', color: 'text-indigo-700 bg-indigo-50' },
  { value: 'TRAINING', label: 'Training', color: 'text-teal-700 bg-teal-50' },
  { value: 'UNPAID', label: 'Unpaid', color: 'text-gray-700 bg-gray-50' },
  { value: 'OTHER', label: 'Other', color: 'text-gray-700 bg-gray-100' },
];

const ENTRY_ABBR: Record<EntryType, string> = {
  REGULAR: '', OVERTIME: 'OT', SICK: 'S', ANNUAL_LEAVE: 'AL',
  BANK_HOLIDAY: 'BH', TRAINING: 'TR', UNPAID: 'UP', OTHER: '?',
};

const TS_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
};

const WTD_CONFIG = {
  OK: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  WARNING: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  VIOLATION: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isoDate = (d: Date) => d.toISOString().split('T')[0];

const fmtWeek = (start: string, end: string) => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return `${s.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

const fmtShortDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`;
};

// ─── Day Cell ─────────────────────────────────────────────────────────────────

const DayCell: React.FC<{
  data: { hoursWorked: number; entryType: EntryType } | null;
  isBankHoliday: boolean;
}> = ({ data, isBankHoliday }) => {
  if (isBankHoliday && !data) {
    return <span className="text-xs text-indigo-500 font-medium">BH</span>;
  }
  if (!data) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = ENTRY_TYPES.find((t) => t.value === data.entryType);
  const abbr = ENTRY_ABBR[data.entryType];
  return (
    <span className={`text-xs font-medium px-1 rounded ${cfg?.color ?? ''}`}>
      {abbr ? `${abbr} ` : ''}{data.hoursWorked > 0 ? `${data.hoursWorked}h` : abbr || '—'}
    </span>
  );
};

// ─── Timesheet Edit Dialog ────────────────────────────────────────────────────

interface DayForm {
  startTime: string;
  endTime: string;
  breakMinutes: string;
  hoursWorked: string;
  entryType: EntryType;
  notes: string;
}

const blankDay = (): DayForm => ({
  startTime: '09:00', endTime: '17:00', breakMinutes: '30',
  hoursWorked: '0', entryType: 'REGULAR', notes: '',
});

const needsTime = (t: EntryType) => t === 'REGULAR' || t === 'OVERTIME';

const calcHours = (form: DayForm): number => {
  if (needsTime(form.entryType) && form.startTime && form.endTime) {
    const [sh, sm] = form.startTime.split(':').map(Number);
    const [eh, em] = form.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm) - (parseInt(form.breakMinutes) || 0);
    return Math.max(0, Math.round(mins / 60 * 100) / 100);
  }
  return parseFloat(form.hoursWorked) || 0;
};

const TimesheetDialog: React.FC<{
  employee: WeeklyOverviewEmployee;
  weekDays: string[];
  bankHolidayDates: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}> = ({ employee, weekDays, bankHolidayDates, onClose, onSaved }) => {
  const initForms = (): Record<string, DayForm> => {
    const f: Record<string, DayForm> = {};
    weekDays.forEach((d) => {
      const existing = employee.days[d];
      if (existing) {
        f[d] = {
          startTime: '', endTime: '', breakMinutes: '0',
          hoursWorked: String(existing.hoursWorked),
          entryType: existing.entryType as EntryType,
          notes: '',
        };
      } else {
        const isBH = bankHolidayDates.has(d);
        f[d] = {
          ...blankDay(),
          entryType: isBH ? 'BANK_HOLIDAY' : 'REGULAR',
          hoursWorked: isBH ? '0' : '0',
        };
      }
    });
    return f;
  };

  const [forms, setForms] = useState<Record<string, DayForm>>(initForms);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [timesheetId, setTimesheetId] = useState(employee.timesheetId);
  const [tsStatus, setTsStatus] = useState(employee.timesheetStatus);

  const setDay = (date: string, field: keyof DayForm, value: string) =>
    setForms((p) => ({ ...p, [date]: { ...p[date], [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = weekDays.map((d) => {
        const f = forms[d];
        const hours = calcHours(f);
        return {
          entryDate: d,
          entryType: f.entryType,
          ...(needsTime(f.entryType) && f.startTime && f.endTime
            ? { startTime: f.startTime, endTime: f.endTime, breakMinutes: parseInt(f.breakMinutes) || 0 }
            : { hoursWorked: hours }),
          notes: f.notes || undefined,
        };
      }).filter((e) => {
        const f = forms[e.entryDate];
        return calcHours(f) > 0 || (f.entryType !== 'REGULAR');
      });

      const ts = await hrmsService.saveTimesheetEntries(
        employee.employeeId,
        weekDays[0],
        entries,
        notes || undefined,
      );
      setTimesheetId(ts.id);
      setTsStatus(ts.status as any);
      toast.success('Timesheet saved');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!timesheetId) { toast.error('Save the timesheet first'); return; }
    setSubmitting(true);
    try {
      const ts = await hrmsService.submitTimesheet(timesheetId);
      setTsStatus(ts.status as any);
      toast.success('Timesheet submitted for approval');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!timesheetId) return;
    try {
      const ts = await hrmsService.approveTimesheet(timesheetId);
      setTsStatus(ts.status as any);
      toast.success('Timesheet approved');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!timesheetId || !rejectReason) return;
    try {
      const ts = await hrmsService.rejectTimesheet(timesheetId, rejectReason);
      setTsStatus(ts.status as any);
      toast.success('Timesheet rejected');
      setRejectDialog(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    }
  };

  const totalHours = weekDays.reduce((s, d) => s + calcHours(forms[d]), 0);
  const isLocked = tsStatus === 'APPROVED';
  const statusCfg = tsStatus ? TS_STATUS[tsStatus] : null;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{employee.employeeName} — Timesheet</DialogTitle>
              {statusCfg && (
                <Badge className={`text-xs border ${statusCfg.color}`}>{statusCfg.label}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtWeek(weekDays[0], weekDays[6])} · Total: <strong>{Math.round(totalHours * 100) / 100}h</strong>
            </p>
          </DialogHeader>

          {tsStatus === 'REJECTED' && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              Rejected: {employee.timesheetStatus}
            </div>
          )}

          <div className="space-y-2">
            {weekDays.map((date) => {
              const f = forms[date];
              const isBH = bankHolidayDates.has(date);
              const hours = calcHours(f);
              const tCfg = ENTRY_TYPES.find((t) => t.value === f.entryType);

              return (
                <div key={date} className="border rounded-lg p-3 bg-muted/20">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Day label */}
                    <div className="col-span-2">
                      <p className="text-sm font-medium">{fmtShortDate(date)}</p>
                      {isBH && <p className="text-[10px] text-indigo-600">Bank Hol</p>}
                    </div>

                    {/* Entry type */}
                    <div className="col-span-3">
                      <Select
                        value={f.entryType}
                        onValueChange={(v) => setDay(date, 'entryType', v)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTRY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Time inputs (regular/overtime) or hours (leave types) */}
                    {needsTime(f.entryType) ? (
                      <>
                        <div className="col-span-2">
                          <Input
                            type="time" value={f.startTime} disabled={isLocked}
                            onChange={(e) => setDay(date, 'startTime', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="time" value={f.endTime} disabled={isLocked}
                            onChange={(e) => setDay(date, 'endTime', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number" min="0" max="120" step="5"
                            value={f.breakMinutes} disabled={isLocked}
                            onChange={(e) => setDay(date, 'breakMinutes', e.target.value)}
                            className="h-8 text-xs" placeholder="Brk"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2">
                          <Input
                            type="number" min="0" max="24" step="0.5"
                            value={f.hoursWorked} disabled={isLocked}
                            onChange={(e) => setDay(date, 'hoursWorked', e.target.value)}
                            className="h-8 text-xs" placeholder="Hours"
                          />
                        </div>
                        <div className="col-span-3"></div>
                      </>
                    )}

                    {/* Hours result */}
                    <div className="col-span-2 text-right">
                      <span className={`text-sm font-semibold ${hours > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {hours > 0 ? `${hours}h` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Week notes…"
              className="h-16 text-sm"
              disabled={isLocked}
            />
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {!isLocked && (
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <FileText size={13} className="mr-1" />
                {saving ? 'Saving…' : 'Save Draft'}
              </Button>
            )}
            {(tsStatus === 'DRAFT' || tsStatus === 'REJECTED' || !tsStatus) && timesheetId && (
              <Button onClick={handleSubmit} disabled={submitting}>
                <Send size={13} className="mr-1" />
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
            )}
            {tsStatus === 'SUBMITTED' && (
              <>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                  <CheckCircle size={13} className="mr-1" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => setRejectDialog(true)}>
                  <XCircle size={13} className="mr-1" /> Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Timesheet</AlertDialogTitle>
            <AlertDialogDescription>Please provide a reason for rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason…"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Bank Holidays Panel ──────────────────────────────────────────────────────

const BankHolidaysPanel: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<BankHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHolidays(await hrmsService.getBankHolidays(year));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      const r = await hrmsService.seedBankHolidays(year);
      toast.success(`Seeded ${r.seeded} bank holidays for ${year}`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to seed');
    } finally {
      setSeeding(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await hrmsService.deleteBankHoliday(id);
      setHolidays((p) => p.filter((h) => h.id !== id));
      toast.success('Removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={seed} disabled={seeding}>
          <Sun size={13} className="mr-1" />
          {seeding ? 'Seeding…' : `Seed ${year} Holidays`}
        </Button>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No bank holidays for {year}. Click &ldquo;Seed {year} Holidays&rdquo; to populate England &amp; Wales dates.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between border rounded p-2 text-sm">
              <div>
                <p className="font-medium text-xs">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(h.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:bg-red-50" onClick={() => remove(h.id)}>
                <Trash2 size={11} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => isoDate(getMonday(new Date())));
  const [overview, setOverview] = useState<WeeklyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<WeeklyOverviewEmployee | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await hrmsService.getWeeklyOverview(weekStart));
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(isoDate(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(isoDate(d));
  };

  const thisWeek = () => setWeekStart(isoDate(getMonday(new Date())));

  const bankHolidayDates = new Set(overview?.bankHolidays.map((bh) => bh.date) ?? []);

  return (
    <MainLayout pageTitle="Time & Attendance">
      {/* HRMS Section Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b pb-3">
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms')}>
          Employees
        </Button>
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/payroll')}>
          Payroll
        </Button>
        <Button variant="default" size="sm" className="text-sm">
          Time &amp; Attendance
        </Button>
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/reports')}>
          Reports
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Time &amp; Attendance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">WTD compliance · Timesheets · Bank Holidays</p>
          </div>
          <div className="flex items-center gap-2">
            <TabsList className="h-8">
              <TabsTrigger value="attendance" className="text-xs px-3">Attendance</TabsTrigger>
              <TabsTrigger value="bank-holidays" className="text-xs px-3">Bank Holidays</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        <TabsContent value="attendance" className="space-y-4">
          {/* Week Navigator */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevWeek}>
              <ChevronLeft size={16} />
            </Button>
            <div className="text-sm font-medium min-w-52 text-center">
              {overview ? fmtWeek(overview.weekStart, overview.weekEnd) : '…'}
            </div>
            <Button variant="outline" size="sm" onClick={nextWeek}>
              <ChevronRight size={16} />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={thisWeek}>
              This Week
            </Button>
          </div>

          {/* Stats */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Employees</p>
                    <p className="text-xl font-bold">{overview.summary.totalEmployees}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <Clock size={18} className="text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-xl font-bold">{Math.round(overview.summary.totalHours * 10) / 10}h</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <Send size={18} className="text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                    <p className="text-xl font-bold">{overview.summary.pendingApprovals}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">WTD Alerts</p>
                    <p className="text-xl font-bold">{overview.summary.wtdWarnings}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Grid */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
              ) : !overview || overview.employees.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No active employees.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-40">Employee</TableHead>
                      {overview.days.map((d, i) => (
                        <TableHead key={d} className={`text-center text-xs w-16 ${i >= 5 ? 'text-muted-foreground' : ''}`}>
                          <div>{DAY_NAMES[i]}</div>
                          <div className="font-normal">
                            {new Date(d + 'T00:00:00').getDate()}
                            {bankHolidayDates.has(d) && <span className="text-indigo-400 ml-0.5">*</span>}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right text-xs">Total</TableHead>
                      <TableHead className="text-center text-xs">WTD</TableHead>
                      <TableHead className="text-center text-xs">Status</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.employees.map((emp) => {
                      const wtdCfg = WTD_CONFIG[emp.wtdStatus];
                      const WtdIcon = wtdCfg.icon;
                      const statusCfg = emp.timesheetStatus ? TS_STATUS[emp.timesheetStatus] : null;

                      return (
                        <TableRow key={emp.employeeId} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="text-sm font-medium">{emp.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{emp.employeeNumber}</div>
                          </TableCell>
                          {overview.days.map((d) => (
                            <TableCell key={d} className="text-center p-1">
                              <DayCell
                                data={emp.days[d] ?? null}
                                isBankHoliday={bankHolidayDates.has(d)}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right text-sm font-medium">
                            {emp.totalHours > 0 ? `${emp.totalHours}h` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border ${wtdCfg.color}`}>
                              <WtdIcon size={10} />
                              {emp.wtdAverage > 0 ? `${emp.wtdAverage}h` : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {statusCfg ? (
                              <Badge className={`text-xs border ${statusCfg.color}`}>{statusCfg.label}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setSelectedEmployee(emp)}
                            >
                              <Edit size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {overview && overview.bankHolidays.length > 0 && (
            <p className="text-xs text-muted-foreground">
              * Bank holiday this week: {overview.bankHolidays.map((bh) => bh.name).join(', ')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="bank-holidays">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank Holidays (England &amp; Wales)</CardTitle>
            </CardHeader>
            <CardContent>
              <BankHolidaysPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEmployee && overview && (
        <TimesheetDialog
          employee={selectedEmployee}
          weekDays={overview.days}
          bankHolidayDates={bankHolidayDates}
          onClose={() => setSelectedEmployee(null)}
          onSaved={() => { load(); setSelectedEmployee(null); }}
        />
      )}
    </MainLayout>
  );
};

export default AttendancePage;
