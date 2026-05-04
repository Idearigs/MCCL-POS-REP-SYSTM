import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RefreshCw, ChevronDown, ChevronRight,
  Play, Lock, Trash2, Eye, DollarSign, Users,
  TrendingUp, FileText, AlertCircle, CheckCircle,
  Calendar,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { hrmsService, PayrollRun, Payslip } from '../../services/hrmsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Play },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  LOCKED: { label: 'Locked', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Lock },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── New Run Dialog ───────────────────────────────────────────────────────────

const NewRunDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (run: PayrollRun) => void;
}> = ({ open, onClose, onCreated }) => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const payday = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [form, setForm] = useState({
    periodStart: firstOfMonth,
    periodEnd: lastOfMonth,
    payDate: payday,
    payFrequency: 'MONTHLY',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const run = await hrmsService.createPayrollRun(form);
      toast.success(`Payroll run created for ${fmtDate(run.periodStart)} – ${fmtDate(run.periodEnd)}`);
      onCreated(run);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create payroll run');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Payroll Run</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period Start *</Label>
              <Input type="date" value={form.periodStart} onChange={(e) => set('periodStart', e.target.value)} required />
            </div>
            <div>
              <Label>Period End *</Label>
              <Input type="date" value={form.periodEnd} onChange={(e) => set('periodEnd', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pay Date *</Label>
              <Input type="date" value={form.payDate} onChange={(e) => set('payDate', e.target.value)} required />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.payFrequency} onValueChange={(v) => set('payFrequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                  <SelectItem value="FOUR_WEEKLY">4-Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input placeholder="Optional notes…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Run'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Payslips Panel ───────────────────────────────────────────────────────────

const PayslipsPanel: React.FC<{ run: PayrollRun }> = ({ run }) => {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    hrmsService.getPayslips(run.id)
      .then(setPayslips)
      .catch(() => toast.error('Failed to load payslips'))
      .finally(() => setLoading(false));
  }, [run.id]);

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Loading payslips…</div>;
  if (payslips.length === 0) return (
    <div className="py-4 text-center text-sm text-muted-foreground">
      No payslips yet. Click <strong>Generate</strong> to create payslips for all active employees.
    </div>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead className="text-right">Gross</TableHead>
          <TableHead className="text-right">PAYE</TableHead>
          <TableHead className="text-right">Emp NI</TableHead>
          <TableHead className="text-right">Pension</TableHead>
          <TableHead className="text-right">Net Pay</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payslips.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div className="font-medium text-sm">{s.employeeName}</div>
              <div className="text-xs text-muted-foreground">{s.employeeNumber}</div>
            </TableCell>
            <TableCell className="text-right text-sm">{fmt(Number(s.grossPay))}</TableCell>
            <TableCell className="text-right text-sm">{fmt(Number(s.paye))}</TableCell>
            <TableCell className="text-right text-sm">{fmt(Number(s.employeeNI))}</TableCell>
            <TableCell className="text-right text-sm">{fmt(Number(s.employeePension))}</TableCell>
            <TableCell className="text-right font-medium text-sm">{fmt(Number(s.netPay))}</TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => navigate(`/hrms/payslips/${s.id}`)}
              >
                <Eye size={14} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// ─── Run Row ──────────────────────────────────────────────────────────────────

const RunRow: React.FC<{
  run: PayrollRun;
  onRefresh: () => void;
}> = ({ run, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [working, setWorking] = useState(false);

  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;

  const handleGenerate = async () => {
    setWorking(true);
    try {
      const r = await hrmsService.generatePayslips(run.id);
      toast.success(`Generated ${r.generated} payslips`);
      onRefresh();
      setExpanded(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setWorking(false);
    }
  };

  const handleFinalize = async () => {
    setWorking(true);
    try {
      await hrmsService.finalizePayrollRun(run.id);
      toast.success('Payroll run finalized and locked');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to finalize payroll run');
    } finally {
      setWorking(false);
      setConfirmFinalize(false);
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      await hrmsService.deletePayrollRun(run.id);
      toast.success('Payroll run deleted');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setWorking(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/30" onClick={() => setExpanded((p) => !p)}>
        <TableCell className="w-8">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </TableCell>
        <TableCell>
          <div className="text-sm font-medium">
            {fmtDate(run.periodStart)} – {fmtDate(run.periodEnd)}
          </div>
          <div className="text-xs text-muted-foreground">Pay date: {fmtDate(run.payDate)}</div>
        </TableCell>
        <TableCell>
          <Badge className={`text-xs border ${cfg.color}`}>
            <StatusIcon size={11} className="mr-1" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-center">{run.employeeCount}</TableCell>
        <TableCell className="text-sm text-right">{fmt(run.totalGross)}</TableCell>
        <TableCell className="text-sm text-right">{fmt(run.totalTax)}</TableCell>
        <TableCell className="text-sm text-right">{fmt(run.totalNetPay)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 justify-end">
            {run.status !== 'LOCKED' && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerate} disabled={working}>
                <Play size={11} className="mr-1" />
                Generate
              </Button>
            )}
            {run.status !== 'LOCKED' && run.employeeCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => setConfirmFinalize(true)}
                disabled={working}
              >
                <Lock size={11} className="mr-1" />
                Finalise
              </Button>
            )}
            {run.status !== 'LOCKED' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
                disabled={working}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-0">
            <div className="px-6 py-3">
              <PayslipsPanel run={run} />
            </div>
          </TableCell>
        </TableRow>
      )}

      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalise Payroll Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all {run.employeeCount} payslips as final and lock the run. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize} className="bg-green-600 hover:bg-green-700">
              Finalise & Lock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this payroll run and all its payslips.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showNewRun, setShowNewRun] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await hrmsService.getPayrollRuns(page);
      setRuns(res.data);
      setMeta(res.meta);
    } catch {
      toast.error('Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary stats
  const locked = runs.filter((r) => r.status === 'LOCKED');
  const ytdGross = locked.reduce((s, r) => s + r.totalGross, 0);
  const ytdTax = locked.reduce((s, r) => s + r.totalTax, 0);
  const ytdNet = locked.reduce((s, r) => s + r.totalNetPay, 0);

  return (
    <MainLayout pageTitle="Payroll">
      {/* HRMS Section Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b pb-3">
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms')}>
          Employees
        </Button>
        <Button variant="default" size="sm" className="text-sm">
          Payroll
        </Button>
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/attendance')}>
          Time &amp; Attendance
        </Button>
        <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/reports')}>
          Reports
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            UK PAYE · 2024/25 rates · Auto-enrolment pension
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(meta.page)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={() => setShowNewRun(true)}>
            <Plus size={14} className="mr-1" />
            New Payroll Run
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <FileText size={12} /> Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{meta.total}</div>
            <div className="text-xs text-muted-foreground">{locked.length} finalised</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <TrendingUp size={12} /> YTD Gross
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{fmt(ytdGross)}</div>
            <div className="text-xs text-muted-foreground">Finalised runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <DollarSign size={12} /> YTD Tax
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{fmt(ytdTax)}</div>
            <div className="text-xs text-muted-foreground">PAYE collected</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Users size={12} /> YTD Net Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{fmt(ytdNet)}</div>
            <div className="text-xs text-muted-foreground">Paid to employees</div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Table */}
      <Card>
        <CardContent className="p-0">
          {loading && runs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No payroll runs yet</p>
              <Button size="sm" className="mt-3" onClick={() => setShowNewRun(true)}>
                <Plus size={13} className="mr-1" />
                Create First Run
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <RunRow key={run.id} run={run} onRefresh={() => load(meta.page)} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <NewRunDialog
        open={showNewRun}
        onClose={() => setShowNewRun(false)}
        onCreated={() => load(1)}
      />
    </MainLayout>
  );
};

export default PayrollPage;
