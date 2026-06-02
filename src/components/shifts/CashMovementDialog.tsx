import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  shiftService,
  Shift,
  ShiftCashMovementType,
} from '@/services/shiftService';
import { toast } from '@/hooks/use-toast';

interface CashMovementDialogProps {
  open: boolean;
  onClose: () => void;
  activeShift: Shift | null;
  onRecorded?: () => void;
}

const CashMovementDialog: React.FC<CashMovementDialogProps> = ({
  open,
  onClose,
  activeShift,
  onRecorded,
}) => {
  const [type, setType] = useState<ShiftCashMovementType>('PAY_OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType('PAY_OUT');
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!activeShift) {
      setError('No active shift found');
      return;
    }
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!reason.trim()) {
      setError('Please enter a reason');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await shiftService.createCashMovement(activeShift.id, {
        type,
        amount: value,
        reason: reason.trim(),
      });
      toast({
        title: type === 'PAY_IN' ? 'Pay-In Recorded' : 'Pay-Out Recorded',
        description: `£${value.toFixed(2)} — ${reason.trim()}`,
      });
      onRecorded?.();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to record cash movement',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Till Cash Movement</DialogTitle>
          <DialogDescription>
            Record cash added to (Pay-In) or removed from (Pay-Out) the till
            during this shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('PAY_OUT')}
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                type === 'PAY_OUT'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Pay-Out
            </button>
            <button
              type="button"
              onClick={() => setType('PAY_IN')}
              disabled={loading}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                type === 'PAY_IN'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Pay-In
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmAmount" className="text-sm font-medium">
              Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                id="cmAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="pl-7"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cmReason" className="text-sm font-medium">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cmReason"
              placeholder={
                type === 'PAY_OUT'
                  ? 'e.g. Petrol for delivery, postage…'
                  : 'e.g. Extra change added to till…'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={loading}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              'Record Movement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashMovementDialog;
