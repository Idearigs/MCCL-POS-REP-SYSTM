import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const VOID_REASONS = [
  { value: 'cashier_error', label: 'Cashier Error' },
  { value: 'customer_changed_mind', label: 'Customer Changed Mind' },
  { value: 'duplicate_transaction', label: 'Duplicate Transaction' },
  { value: 'pricing_error', label: 'Pricing Error' },
  { value: 'fraud_suspected', label: 'Fraud Suspected' },
  { value: 'test_transaction', label: 'Test Transaction' },
  { value: 'system_error', label: 'System / Technical Error' },
  { value: 'manager_override', label: 'Manager Override' },
  { value: 'other', label: 'Other' },
];

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, details: string) => void;
  saleNumber?: string;
  totalAmount?: number;
  loading?: boolean;
}

const VoidTransactionDialog: React.FC<VoidTransactionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  saleNumber = 'N/A',
  totalAmount = 0,
  loading = false,
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [pinError, setPinError] = useState('');

  const isValid = !!reason && managerPin.length === 4;

  const handleConfirm = () => {
    if (managerPin.length !== 4 || !/^\d{4}$/.test(managerPin)) {
      setPinError('Enter a valid 4-digit manager PIN');
      return;
    }
    setPinError('');
    const label = VOID_REASONS.find((r) => r.value === reason)?.label ?? reason;
    onConfirm(label, details || label);
    setReason('');
    setDetails('');
    setManagerPin('');
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setDetails('');
      setManagerPin('');
      setPinError('');
      onOpenChange(false);
    }
  };

  const gbp = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <ShieldAlert className="h-5 w-5" />
            Void Transaction — Audit Gate
          </DialogTitle>
          <DialogDescription>
            Voiding sale <strong>#{saleNumber}</strong> ({gbp(totalAmount)}).
            This action is logged and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              The sale will be marked <strong>VOIDED</strong> and remain visible in the audit log.
              Inventory is not automatically restored.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Void Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason code…" />
              </SelectTrigger>
              <SelectContent>
                {VOID_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Additional Notes (optional)</Label>
            <Textarea
              placeholder="Provide further details…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-red-500" />
              Manager Authorization PIN <span className="text-red-500">*</span>
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              value={managerPin}
              onChange={(e) => {
                setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinError('');
              }}
              className="text-center tracking-[0.4em] text-lg w-32"
            />
            {pinError && <p className="text-xs text-red-500">{pinError}</p>}
            <p className="text-xs text-gray-400">Enter your manager PIN to authorize this void.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? 'Voiding…' : 'Confirm Void'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidTransactionDialog;
