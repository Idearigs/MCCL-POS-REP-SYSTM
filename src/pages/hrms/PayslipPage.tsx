import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Edit, Save, X } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { hrmsService, Payslip, PayslipAdjustments } from '../../services/hrmsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(n));

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

const Row: React.FC<{ label: string; value: string; bold?: boolean; indent?: boolean }> = ({
  label, value, bold, indent,
}) => (
  <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-4' : ''}`}>
    <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''}`}>{value}</span>
  </div>
);

// ─── Edit Panel ───────────────────────────────────────────────────────────────

const EditPanel: React.FC<{
  payslip: Payslip;
  onSaved: (updated: Payslip) => void;
  onCancel: () => void;
}> = ({ payslip, onSaved, onCancel }) => {
  const [form, setForm] = useState<PayslipAdjustments>({
    overtimePay: Number(payslip.overtimePay),
    bonusPay: Number(payslip.bonusPay),
    commissionPay: Number(payslip.commissionPay),
    sickPay: Number(payslip.sickPay),
    holidayPay: Number(payslip.holidayPay),
    otherAdditions: Number(payslip.otherAdditions),
    otherDeductions: Number(payslip.otherDeductions),
    notes: payslip.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof PayslipAdjustments, v: string) =>
    setForm((p) => ({ ...p, [k]: k === 'notes' ? v : parseFloat(v) || 0 }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await hrmsService.updatePayslip(payslip.id, form);
      toast.success('Payslip updated');
      onSaved(updated as Payslip);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update payslip');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof PayslipAdjustments, isText = false) => (
    <div className="grid grid-cols-2 items-center gap-2">
      <Label className="text-xs">{label}</Label>
      <Input
        type={isText ? 'text' : 'number'}
        step="0.01"
        min="0"
        className="h-7 text-sm"
        value={String(form[key] ?? '')}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-amber-50">
      <p className="text-sm font-medium text-amber-800">Adjustments (recalculates tax automatically)</p>
      <div className="space-y-2">
        {field('Overtime Pay (£)', 'overtimePay')}
        {field('Bonus Pay (£)', 'bonusPay')}
        {field('Commission (£)', 'commissionPay')}
        {field('Sick Pay (£)', 'sickPay')}
        {field('Holiday Pay (£)', 'holidayPay')}
        {field('Other Additions (£)', 'otherAdditions')}
        {field('Other Deductions (£)', 'otherDeductions')}
        {field('Notes', 'notes', true)}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={13} className="mr-1" /> {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X size={13} className="mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PayslipPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    hrmsService.getPayslip(id)
      .then(setPayslip)
      .catch(() => toast.error('Payslip not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <MainLayout pageTitle="Payslip">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!payslip) {
    return (
      <MainLayout pageTitle="Payslip">
        <div className="text-center py-12 text-muted-foreground">Payslip not found.</div>
      </MainLayout>
    );
  }

  const isLocked = payslip.status === 'FINAL';
  const run = payslip.payrollRun;

  return (
    <MainLayout pageTitle="Payslip">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Payslip — {payslip.employeeName}</h1>
            <p className="text-xs text-muted-foreground">
              {payslip.employeeNumber} · {run ? `${fmtDate(run.periodStart)} – ${fmtDate(run.periodEnd)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs border ${isLocked ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {isLocked ? 'Final' : 'Draft'}
          </Badge>
          {!isLocked && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit size={13} className="mr-1" /> Adjust
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer size={13} className="mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto print:max-w-full">
        {/* Payslip Header */}
        <div className="border rounded-lg p-5 mb-4 print:border-0 print:p-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pay Period</p>
              <p className="font-semibold">
                {run ? `${fmtDate(run.periodStart)} – ${fmtDate(run.periodEnd)}` : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pay Date</p>
              <p className="font-semibold">{fmtDate(payslip.payDate)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Tax Code</p>
              <p className="font-medium">{payslip.taxCode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">NI Category</p>
              <p className="font-medium">{payslip.niCategory}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay Frequency</p>
              <p className="font-medium capitalize">{String(payslip.payFrequency).toLowerCase()}</p>
            </div>
          </div>
        </div>

        {editing && (
          <div className="mb-4">
            <EditPanel
              payslip={payslip}
              onSaved={(updated) => { setPayslip(updated); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {/* Earnings */}
        <div className="border rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Earnings</p>
          <Row label="Basic Pay" value={fmt(payslip.basicPay)} />
          {Number(payslip.overtimePay) > 0 && <Row label="Overtime" value={fmt(payslip.overtimePay)} indent />}
          {Number(payslip.bonusPay) > 0 && <Row label="Bonus" value={fmt(payslip.bonusPay)} indent />}
          {Number(payslip.commissionPay) > 0 && <Row label="Commission" value={fmt(payslip.commissionPay)} indent />}
          {Number(payslip.sickPay) > 0 && <Row label="Sick Pay" value={fmt(payslip.sickPay)} indent />}
          {Number(payslip.holidayPay) > 0 && <Row label="Holiday Pay" value={fmt(payslip.holidayPay)} indent />}
          {Number(payslip.otherAdditions) > 0 && <Row label="Other Additions" value={fmt(payslip.otherAdditions)} indent />}
          <Separator className="my-2" />
          <Row label="Gross Pay" value={fmt(payslip.grossPay)} bold />
        </div>

        {/* Deductions */}
        <div className="border rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Deductions</p>
          <Row label="Income Tax (PAYE)" value={fmt(payslip.paye)} />
          <Row label="National Insurance (Employee)" value={fmt(payslip.employeeNI)} />
          {Number(payslip.employeePension) > 0 && (
            <Row label="Pension (Employee)" value={fmt(payslip.employeePension)} />
          )}
          {Number(payslip.studentLoanRepayment) > 0 && (
            <Row label="Student Loan Repayment" value={fmt(payslip.studentLoanRepayment)} />
          )}
          {Number(payslip.otherDeductions) > 0 && (
            <Row label="Other Deductions" value={fmt(payslip.otherDeductions)} />
          )}
          <Separator className="my-2" />
          <Row label="Total Deductions" value={fmt(payslip.totalDeductions)} bold />
        </div>

        {/* Net Pay */}
        <div className="border-2 border-primary/30 rounded-lg p-4 mb-4 bg-primary/5">
          <Row label="Net Pay" value={fmt(payslip.netPay)} bold />
        </div>

        {/* Employer Contributions */}
        <div className="border rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Employer Contributions (not deducted from pay)
          </p>
          <Row label="Employer NI" value={fmt(payslip.employerNI)} />
          {Number(payslip.employerPension) > 0 && (
            <Row label="Employer Pension" value={fmt(payslip.employerPension)} />
          )}
        </div>

        {/* Year to Date */}
        <div className="border rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Year to Date (this tax year)
          </p>
          <Row label="Gross Pay YTD" value={fmt(payslip.ytdGross)} />
          <Row label="Tax Paid YTD" value={fmt(payslip.ytdTax)} />
          <Row label="Employee NI YTD" value={fmt(payslip.ytdEmployeeNI)} />
        </div>

        {payslip.notes && (
          <div className="mt-4 text-sm text-muted-foreground border-t pt-3">
            <span className="font-medium">Notes: </span>{payslip.notes}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PayslipPage;
