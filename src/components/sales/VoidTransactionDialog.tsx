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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, details: string) => void;
  saleNumber?: string;
  totalAmount?: number;
  loading?: boolean;
}

const VOID_REASONS = [
  { value: 'customer_request', label: 'Customer Request', color: 'blue' },
  { value: 'pricing_error', label: 'Pricing Error', color: 'orange' },
  { value: 'wrong_item', label: 'Wrong Item Sold', color: 'yellow' },
  { value: 'payment_issue', label: 'Payment Issue', color: 'red' },
  { value: 'duplicate_transaction', label: 'Duplicate Transaction', color: 'purple' },
  { value: 'system_error', label: 'System Error', color: 'gray' },
  { value: 'fraud_suspected', label: 'Fraud Suspected', color: 'red' },
  { value: 'manager_override', label: 'Manager Override', color: 'green' },
  { value: 'other', label: 'Other', color: 'gray' },
];

const VoidTransactionDialog: React.FC<VoidTransactionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  saleNumber = 'N/A',
  totalAmount = 0,
  loading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    // Validation
    if (!selectedReason) {
      setError('Please select a reason for voiding this transaction');
      return;
    }

    if (!details.trim()) {
      setError('Please provide additional details');
      return;
    }

    if (details.trim().length < 10) {
      setError('Please provide more detailed explanation (at least 10 characters)');
      return;
    }

    // Clear error and proceed
    setError('');
    onConfirm(selectedReason, details);
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    setError('');
    onOpenChange(false);
  };

  const selectedReasonData = VOID_REASONS.find(r => r.value === selectedReason);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Void Transaction</DialogTitle>
          </div>
          <DialogDescription className="text-base mt-3">
            This action will void the selected transaction and cannot be undone. Please provide a reason for audit purposes.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sale Number:</span>
            <Badge variant="outline" className="font-mono">{saleNumber}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="text-lg font-semibold text-gray-900">£{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="void-reason" className="text-sm font-semibold">
              Void Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="void-reason" className="w-full">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {VOID_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-${reason.color}-500`} />
                      {reason.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="void-details" className="text-sm font-semibold">
              Additional Details <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="void-details"
              placeholder="Provide detailed explanation for voiding this transaction (minimum 10 characters)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Characters: {details.length} {details.length < 10 && '(minimum 10 required)'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Warning</p>
              <p>This transaction will be permanently voided. The action will be logged for audit purposes.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !selectedReason || details.length < 10}
            className="flex-1 sm:flex-initial"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Voiding...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Void Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidTransactionDialog;
