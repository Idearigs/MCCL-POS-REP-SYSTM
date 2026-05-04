import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, TrendingUp, Users, Building2, Plus, Trash2,
  Download, RefreshCw, AlertTriangle, CheckCircle,
  BarChart3, Clock, Calendar,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  hrmsService,
  P60Summary, P60Detail,
  P11dSummary, P11dBenefit, CreateP11dBenefitData, P11dBenefitType,
  PayrollAnalytics, AttendanceAnalytics,
  Employee,
} from '../../services/hrmsService';

// ─── Constants ────────────────────────────────────────────────────────────────

const BENEFIT_TYPES: { value: P11dBenefitType; label: string }[] = [
  { value: 'COMPANY_CAR',       label: 'Company Car' },
  { value: 'MEDICAL_INSURANCE', label: 'Medical Insurance' },
  { value: 'LIFE_INSURANCE',    label: 'Life Insurance' },
  { value: 'GYM_MEMBERSHIP',    label: 'Gym Membership' },
  { value: 'INTEREST_FREE_LOAN',label: 'Interest-Free Loan' },
  { value: 'VOUCHERS',          label: 'Vouchers' },
  { value: 'ACCOMMODATION',     label: 'Accommodation' },
  { value: 'TRAVEL_SUBSISTENCE',label: 'Travel & Subsistence' },
  { value: 'ENTERTAINMENT',     label: 'Entertainment' },
  { value: 'OTHER',             label: 'Other' },
];

function currentTaxYear(): string {
  const now = new Date();
  const yr = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const startYr = (m > 4 || (m === 4 && d >= 6)) ? yr : yr - 1;
  return `${startYr}-${String(startYr + 1).slice(2)}`;
}

function taxYearOptions(): string[] {
  const current = currentTaxYear();
  const startYr = parseInt(current.split('-')[0], 10);
  return [
    `${startYr}-${String(startYr + 1).slice(2)}`,
    `${startYr - 1}-${String(startYr).slice(2)}`,
    `${startYr - 2}-${String(startYr - 1).slice(2)}`,
  ];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const fmtShort = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);

// ─── P60 Tab ──────────────────────────────────────────────────────────────────

function P60Tab({ taxYear }: { taxYear: string }) {
  const [rows, setRows] = useState<P60Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<P60Detail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrmsService.getAllP60s(taxYear);
      setRows(data);
    } catch {
      toast.error('Failed to load P60 summaries');
    } finally {
      setLoading(false);
    }
  }, [taxYear]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (employeeId: string) => {
    try {
      const d = await hrmsService.getP60(employeeId, taxYear);
      setDetail(d);
      setDetailOpen(true);
    } catch {
      toast.error('Failed to load P60 detail');
    }
  };

  const totalGross = rows.reduce((s, r) => s + r.grossPay, 0);
  const totalPaye  = rows.reduce((s, r) => s + r.paye, 0);
  const totalNI    = rows.reduce((s, r) => s + r.employeeNI, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Gross</p>
            <p className="text-xl font-bold">{fmtShort(totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total PAYE</p>
            <p className="text-xl font-bold text-red-600">{fmtShort(totalPaye)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Employee NI</p>
            <p className="text-xl font-bold text-orange-600">{fmtShort(totalNI)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} employees with payslips</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Tax Code</TableHead>
              <TableHead className="text-right">Gross Pay</TableHead>
              <TableHead className="text-right">PAYE</TableHead>
              <TableHead className="text-right">Employee NI</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No finalized payslips for tax year {taxYear}
                </TableCell>
              </TableRow>
            ) : rows.map(r => (
              <TableRow key={r.employeeId}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.department ?? '—'}</TableCell>
                <TableCell className="text-sm font-mono">{r.taxCode}</TableCell>
                <TableCell className="text-right text-sm">{fmt(r.grossPay)}</TableCell>
                <TableCell className="text-right text-sm text-red-600">{fmt(r.paye)}</TableCell>
                <TableCell className="text-right text-sm text-orange-600">{fmt(r.employeeNI)}</TableCell>
                <TableCell className="text-right text-sm font-medium">{fmt(r.netPay)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openDetail(r.employeeId)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* P60 Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>P60 — {detail?.employee.fullName}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Employee No:</span>
                <span className="font-medium text-foreground">{detail.employee.employeeNumber}</span>
                <span>Tax Code:</span>
                <span className="font-medium font-mono text-foreground">{detail.employee.taxCode}</span>
                <span>NI Number:</span>
                <span className="font-medium font-mono text-foreground">{detail.employee.niNumberMasked ?? '—'}</span>
                <span>NI Category:</span>
                <span className="font-medium text-foreground">{detail.employee.niCategory}</span>
                <span>Tax Year:</span>
                <span className="font-medium text-foreground">{detail.taxYear}</span>
                <span>Period:</span>
                <span className="font-medium text-foreground">
                  {detail.summary.taxYearStart} to {detail.summary.taxYearEnd}
                </span>
              </div>
              <div className="border rounded p-3 space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Earnings & Deductions</p>
                {[
                  { label: 'Gross Pay', value: detail.summary.grossPay, cls: '' },
                  { label: 'PAYE Tax', value: detail.summary.paye, cls: 'text-red-600' },
                  { label: 'Employee NI', value: detail.summary.employeeNI, cls: 'text-orange-600' },
                  { label: 'Employee Pension', value: detail.summary.employeePension, cls: 'text-blue-600' },
                  { label: 'Student Loan', value: detail.summary.studentLoan, cls: 'text-purple-600' },
                  { label: 'Net Pay', value: detail.summary.netPay, cls: 'font-bold' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={row.cls}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Based on {detail.summary.payslipCount} finalized payslip{detail.summary.payslipCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── P11D Tab ─────────────────────────────────────────────────────────────────

function P11dTab({ taxYear }: { taxYear: string }) {
  const [summary, setSummary] = useState<P11dSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<CreateP11dBenefitData & { employeeId: string }>({
    employeeId: '',
    taxYear,
    benefitType: 'OTHER',
    description: '',
    cashEquivalent: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, emp] = await Promise.all([
        hrmsService.getAllP11ds(taxYear),
        hrmsService.getEmployees({ limit: 200 }),
      ]);
      setSummary(s);
      setEmployees(emp.data);
    } catch {
      toast.error('Failed to load P11D data');
    } finally {
      setLoading(false);
    }
  }, [taxYear]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!form.employeeId) { toast.error('Select an employee'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (form.cashEquivalent <= 0) { toast.error('Cash equivalent must be > 0'); return; }
    setSaving(true);
    try {
      const { employeeId, ...data } = form;
      await hrmsService.createP11dBenefit(employeeId, { ...data, taxYear });
      toast.success('Benefit added');
      setAddOpen(false);
      setForm({ employeeId: '', taxYear, benefitType: 'OTHER', description: '', cashEquivalent: 0, notes: '' });
      load();
    } catch {
      toast.error('Failed to add benefit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrmsService.deleteP11dBenefit(deleteTarget.id);
      toast.success('Benefit removed');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete benefit');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {summary?.employees.length ?? 0} employees with benefits · Grand total:{' '}
            <span className="font-semibold text-foreground">{fmt(summary?.grandTotal ?? 0)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Benefit
          </Button>
        </div>
      </div>

      {(!summary || summary.employees.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          No P11D benefits recorded for tax year {taxYear}
        </div>
      ) : (
        <div className="space-y-2">
          {summary.employees.map(emp => (
            <div key={emp.employeeId} className="border rounded-md">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
                onClick={() => toggleExpand(emp.employeeId)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{emp.fullName}</span>
                  <span className="text-xs text-muted-foreground">{emp.employeeNumber}</span>
                  {emp.department && (
                    <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{emp.benefits.length} benefit{emp.benefits.length !== 1 ? 's' : ''}</Badge>
                </div>
                <span className="font-semibold text-sm">{fmt(emp.total)}</span>
              </button>
              {expanded.has(emp.employeeId) && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Cash Equivalent</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emp.benefits.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-sm">
                            {BENEFIT_TYPES.find(t => t.value === b.benefitType)?.label ?? b.benefitType}
                          </TableCell>
                          <TableCell className="text-sm">{b.description}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{fmt(b.cashEquivalent)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: b.id, desc: b.description })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Benefit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add P11D Benefit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Benefit Type</Label>
              <Select
                value={form.benefitType}
                onValueChange={v => setForm(f => ({ ...f, benefitType: v as P11dBenefitType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. BMW 3 Series company car"
              />
            </div>
            <div>
              <Label>Cash Equivalent (£)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cashEquivalent || ''}
                onChange={e => setForm(f => ({ ...f, cashEquivalent: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving…' : 'Add Benefit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Benefit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteTarget?.desc}" from the P11D record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Payroll Analytics Tab ────────────────────────────────────────────────────

function PayrollAnalyticsTab() {
  const [data, setData] = useState<PayrollAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await hrmsService.getPayrollAnalytics());
    } catch {
      toast.error('Failed to load payroll analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading analytics…</div>;
  if (!data)   return <div className="text-center py-12 text-muted-foreground">No data available</div>;

  const { totals, monthlyTrend, departmentBreakdown, payTypeTotals } = data;

  const payTypeRows = [
    { label: 'Basic Pay',       value: payTypeTotals.basicPay,       cls: 'text-green-700' },
    { label: 'Overtime',        value: payTypeTotals.overtimePay,    cls: 'text-blue-700' },
    { label: 'Bonus',           value: payTypeTotals.bonusPay,       cls: 'text-purple-700' },
    { label: 'Commission',      value: payTypeTotals.commissionPay,  cls: 'text-orange-700' },
    { label: 'Sick Pay',        value: payTypeTotals.sickPay,        cls: 'text-red-700' },
    { label: 'Holiday Pay',     value: payTypeTotals.holidayPay,     cls: 'text-yellow-700' },
    { label: 'Other Additions', value: payTypeTotals.otherAdditions, cls: 'text-gray-700' },
  ].filter(r => r.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Gross',    value: fmtShort(totals.gross),    icon: TrendingUp, cls: 'text-green-600' },
          { label: 'Total Net Pay',  value: fmtShort(totals.net),      icon: Users,      cls: 'text-blue-600' },
          { label: 'Total PAYE',     value: fmtShort(totals.paye),     icon: FileText,   cls: 'text-red-600' },
          { label: 'Total NI',       value: fmtShort(totals.ni),       icon: BarChart3,  cls: 'text-orange-600' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 flex items-start gap-3">
              <c.icon className={`h-5 w-5 mt-0.5 ${c.cls}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly trend table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Monthly Cost Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">Emp NI</TableHead>
                  <TableHead className="text-right">Pension</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyTrend.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No data</TableCell>
                  </TableRow>
                ) : monthlyTrend.map(m => (
                  <TableRow key={m.month}>
                    <TableCell className="text-sm font-medium">{m.month}</TableCell>
                    <TableCell className="text-right text-sm">{m.headcount}</TableCell>
                    <TableCell className="text-right text-sm">{fmtShort(m.gross)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtShort(m.net)}</TableCell>
                    <TableCell className="text-right text-sm text-red-600">{fmtShort(m.paye)}</TableCell>
                    <TableCell className="text-right text-sm text-orange-600">{fmtShort(m.employeeNI)}</TableCell>
                    <TableCell className="text-right text-sm text-blue-600">{fmtShort(m.pension)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Department breakdown + Pay type side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {departmentBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : departmentBreakdown.map(dept => {
                const pct = totals.gross > 0 ? (dept.gross / totals.gross) * 100 : 0;
                return (
                  <div key={dept.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{dept.name}</span>
                      <span className="text-muted-foreground">{fmtShort(dept.gross)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Pay Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payTypeRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : payTypeRows.map(row => {
                const pct = totals.gross > 0 ? (row.value / totals.gross) * 100 : 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{row.label}</span>
                      <span className="text-muted-foreground">{fmtShort(row.value)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-current ${row.cls}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Data period: {data.period.from} to {data.period.to} · Finalized payslips only
      </p>
    </div>
  );
}

// ─── Attendance Analytics Tab ─────────────────────────────────────────────────

function AttendanceAnalyticsTab() {
  const [data, setData] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await hrmsService.getAttendanceAnalytics());
    } catch {
      toast.error('Failed to load attendance analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading analytics…</div>;
  if (!data)   return <div className="text-center py-12 text-muted-foreground">No data available</div>;

  const { summary, weeklyTrend, absenceByType, departmentAttendance, topEmployees } = data;
  const { wtdCompliance } = summary;
  const wtdTotal = wtdCompliance.ok + wtdCompliance.warning + wtdCompliance.violation;

  const absenceLabels: Record<string, string> = {
    SICK: 'Sick Leave', ANNUAL_LEAVE: 'Annual Leave',
    BANK_HOLIDAY: 'Bank Holiday', UNPAID: 'Unpaid Leave', OTHER: 'Other',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Timesheets',  value: summary.totalTimesheets,    icon: FileText,      cls: 'text-slate-600' },
          { label: 'Approval Rate',     value: `${summary.approvalRate}%`, icon: CheckCircle,   cls: 'text-green-600' },
          { label: 'WTD Warnings',      value: wtdCompliance.warning,      icon: AlertTriangle, cls: 'text-yellow-600' },
          { label: 'WTD Violations',    value: wtdCompliance.violation,    icon: AlertTriangle, cls: 'text-red-600' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 flex items-start gap-3">
              <c.icon className={`h-5 w-5 mt-0.5 ${c.cls}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-bold ${c.cls}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* WTD compliance bar */}
      {wtdTotal > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> WTD 48h Compliance (approved timesheets)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-6 rounded-full overflow-hidden">
              {wtdCompliance.ok > 0 && (
                <div
                  className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(wtdCompliance.ok / wtdTotal) * 100}%` }}
                >
                  {Math.round((wtdCompliance.ok / wtdTotal) * 100)}%
                </div>
              )}
              {wtdCompliance.warning > 0 && (
                <div
                  className="bg-yellow-400 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(wtdCompliance.warning / wtdTotal) * 100}%` }}
                >
                  {Math.round((wtdCompliance.warning / wtdTotal) * 100)}%
                </div>
              )}
              {wtdCompliance.violation > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(wtdCompliance.violation / wtdTotal) * 100}%` }}
                >
                  {Math.round((wtdCompliance.violation / wtdTotal) * 100)}%
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> OK ({wtdCompliance.ok})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" /> Warning 44-48h ({wtdCompliance.warning})</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block" /> Violation &gt;48h ({wtdCompliance.violation})</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Absence by type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Absence by Type (hours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absenceByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">No absence recorded</p>
            ) : (
              <div className="space-y-2">
                {absenceByType.map(row => {
                  const total = absenceByType.reduce((s, r) => s + r.hours, 0);
                  const pct = total > 0 ? (row.hours / total) * 100 : 0;
                  return (
                    <div key={row.type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{absenceLabels[row.type] ?? row.type}</span>
                        <span className="text-muted-foreground">{row.hours.toFixed(1)}h ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department attendance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Department Attendance (approved hrs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved timesheets</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Staff</TableHead>
                    <TableHead className="text-right">Total Hrs</TableHead>
                    <TableHead className="text-right">OT Hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentAttendance.map(d => (
                    <TableRow key={d.name}>
                      <TableCell className="text-sm">{d.name}</TableCell>
                      <TableCell className="text-right text-sm">{d.headcount}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{d.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm text-blue-600">{d.overtimeHours.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top employees */}
      {topEmployees.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Top 10 by Approved Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Timesheets</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Avg / Week</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEmployees.map((e, i) => (
                  <TableRow key={e.employeeId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{e.fullName}</p>
                          <p className="text-xs text-muted-foreground">{e.employeeNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{e.timesheetCount}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{e.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right text-sm">
                      {e.timesheetCount > 0 ? (e.totalHours / e.timesheetCount).toFixed(1) : '—'}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Weekly trend */}
      {weeklyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Weekly Hours Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Submitted</TableHead>
                    <TableHead className="text-right">Draft</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyTrend.slice().reverse().map(w => (
                    <TableRow key={w.week}>
                      <TableCell className="text-sm font-medium">{w.week}</TableCell>
                      <TableCell className="text-right text-sm">{w.totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-sm text-green-600">{w.approved}</TableCell>
                      <TableCell className="text-right text-sm text-yellow-600">{w.submitted}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{w.draft}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Data period: {data.period.from} to {data.period.to}
      </p>
    </div>
  );
}

// ─── ReportsPage ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const navigate = useNavigate();
  const [taxYear, setTaxYear] = useState(currentTaxYear());
  const years = taxYearOptions();

  return (
    <MainLayout pageTitle="HRMS Reports">
      <div className="space-y-6 p-6">
        {/* HRMS Section Navigation */}
        <div className="flex items-center gap-1 border-b pb-3">
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms')}>
            Employees
          </Button>
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/payroll')}>
            Payroll
          </Button>
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/attendance')}>
            Time &amp; Attendance
          </Button>
          <Button variant="default" size="sm" className="text-sm">
            Reports
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
            <p className="text-sm text-muted-foreground">P60, P11D benefits, payroll and attendance insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Tax Year</Label>
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="p60">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="p60">P60</TabsTrigger>
            <TabsTrigger value="p11d">P11D</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="p60" className="mt-6">
            <P60Tab taxYear={taxYear} />
          </TabsContent>

          <TabsContent value="p11d" className="mt-6">
            <P11dTab taxYear={taxYear} />
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <PayrollAnalyticsTab />
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <AttendanceAnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
