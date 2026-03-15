import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  floatService,
  CreateFloatTransactionDto,
  FloatTransactionType,
  FloatSession,
} from '@/services/floatService';

interface CashInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floatSession: FloatSession | null;
  onTransactionCreated: () => void;
  defaultType?: 'CASH_IN' | 'CASH_OUT';
}

const CashInOutDialog: React.FC<CashInOutDialogProps> = ({
  open,
  onOpenChange,
  floatSession,
  onTransactionCreated,
  defaultType = 'CASH_IN',
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateFloatTransactionDto, 'sessionId'>>({
    type: defaultType,
    amount: 0,
    reason: '',
    reference: '',
    notes: '',
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        type: defaultType,
        amount: 0,
        reason: '',
        reference: '',
        notes: '',
      });
    }
  }, [open, defaultType]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      type: value as FloatTransactionType,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!floatSession) {
      toast({
        title: 'Error',
        description: 'No active float session',
        variant: 'destructive',
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Amount must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for this transaction',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await floatService.createFloatTransaction({
        sessionId: floatSession.id,
        ...formData,
      });

      const actionLabel =
        formData.type === FloatTransactionType.CASH_IN ? 'Cash In' : 'Cash Out';

      toast({
        title: `${actionLabel} Recorded`,
        description: `£${formData.amount.toFixed(2)} ${
          formData.type === FloatTransactionType.CASH_IN ? 'added to' : 'removed from'
        } float`,
      });

      onTransactionCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to create transaction:', error);
      toast({
        title: 'Transaction Failed',
        description:
          error.response?.data?.message ||
          'An error occurred while recording the transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCashIn = formData.type === FloatTransactionType.CASH_IN;
  const icon = isCashIn ? ArrowDownCircle : ArrowUpCircle;
  const IconComponent = icon;
  const iconColor = isCashIn ? 'text-green-600' : 'text-red-600';
  const title = isCashIn ? 'Cash In' : 'Cash Out';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconComponent className={`h-6 w-6 ${iconColor}`} />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isCashIn
              ? 'Record cash added to the register'
              : 'Record cash removed from the register'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FloatTransactionType.CASH_IN}>
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    <span>Cash In</span>
                  </div>
                </SelectItem>
                <SelectItem value={FloatTransactionType.CASH_OUT}>
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    <span>Cash Out</span>
                  </div>
                </SelectItem>
                <SelectItem value={FloatTransactionType.EXPENSE}>
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-orange-600" />
                    <span>Expense</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.type === FloatTransactionType.CASH_IN &&
                'Adding cash to the register (e.g., change fund, bank deposit return)'}
              {formData.type === FloatTransactionType.CASH_OUT &&
                'Removing cash from register (e.g., bank deposit, safe drop)'}
              {formData.type === FloatTransactionType.EXPENSE &&
                'Paying for expenses from the register (e.g., petty cash, supplies)'}
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-base font-semibold">
              Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                £
              </span>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={handleInputChange}
                className="pl-8 text-lg font-semibold"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reason"
              name="reason"
              placeholder={
                isCashIn
                  ? 'e.g., Change fund replenishment'
                  : 'e.g., Bank deposit, Safe drop'
              }
              value={formData.reason}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">
              Reference <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="reference"
              name="reference"
              placeholder="e.g., Receipt number, authorization code"
              value={formData.reference}
              onChange={handleInputChange}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-gray-400">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={handleInputChange}
              rows={2}
            />
          </div>

          {/* Summary */}
          {formData.amount > 0 && (
            <div
              className={`p-3 rounded-lg border ${
                isCashIn
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p className="text-sm font-medium">
                {isCashIn ? '+ ' : '- '}£{formData.amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {isCashIn
                  ? 'Will be added to your float'
                  : 'Will be deducted from your float'}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant={isCashIn ? 'default' : 'destructive'}
            >
              {loading
                ? 'Recording...'
                : `Record ${isCashIn ? 'Cash In' : 'Cash Out'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashInOutDialog;
