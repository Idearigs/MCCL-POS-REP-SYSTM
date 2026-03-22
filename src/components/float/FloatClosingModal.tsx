import React, { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  floatService,
  CloseFloatSessionDto,
  FloatSession,
} from '@/services/floatService';

interface FloatClosingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floatSession: FloatSession | null;
  onFloatClosed: () => void;
}

// UK denominations
const DENOMINATIONS = [
  { value: 50, label: '£50', type: 'note' },
  { value: 20, label: '£20', type: 'note' },
  { value: 10, label: '£10', type: 'note' },
  { value: 5, label: '£5', type: 'note' },
  { value: 2, label: '£2', type: 'coin' },
  { value: 1, label: '£1', type: 'coin' },
  { value: 0.5, label: '50p', type: 'coin' },
  { value: 0.2, label: '20p', type: 'coin' },
  { value: 0.1, label: '10p', type: 'coin' },
  { value: 0.05, label: '5p', type: 'coin' },
  { value: 0.02, label: '2p', type: 'coin' },
  { value: 0.01, label: '1p', type: 'coin' },
];

const FloatClosingModal: React.FC<FloatClosingModalProps> = ({
  open,
  onOpenChange,
  floatSession,
  onFloatClosed,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [useCalculator, setUseCalculator] = useState(false);
  const [manualAmount, setManualAmount] = useState(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [denominations, setDenominations] = useState<Record<string, number>>(
    {}
  );

  // Calculate totals
  const calculatedTotal = Object.entries(denominations).reduce(
    (sum, [value, count]) => sum + parseFloat(value) * count,
    0
  );

  const actualClosing = useCalculator ? calculatedTotal : manualAmount;

  const expectedClosing = floatSession
    ? (floatSession.openingBalance || 0) +
      (floatSession.totalSales || 0) +
      (floatSession.totalCashIn || 0) -
      (floatSession.totalCashOut || 0) -
      (floatSession.totalRefunds || 0)
    : 0;

  const difference = actualClosing - expectedClosing;
  const isBalanced = Math.abs(difference) < 0.01;

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setUseCalculator(false);
      setManualAmount(0);
      setClosingNotes('');
      setDenominations({});
    }
  }, [open]);

  const handleDenominationChange = (value: number, count: string) => {
    const parsedCount = parseInt(count) || 0;
    setDenominations((prev) => ({
      ...prev,
      [value.toString()]: parsedCount,
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

    if (actualClosing < 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Closing balance cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const data: CloseFloatSessionDto = {
        actualClosing,
        closingNotes,
      };

      if (useCalculator) {
        data.denominationBreakdown = denominations;
      }

      await floatService.closeFloatSession(floatSession.id, data);

      const statusMessage = isBalanced
        ? 'Float balanced perfectly!'
        : difference > 0
        ? `Float over by £${Math.abs(difference).toFixed(2)}`
        : `Float short by £${Math.abs(difference).toFixed(2)}`;

      toast({
        title: 'Float Closed',
        description: statusMessage,
        variant: isBalanced ? 'default' : 'destructive',
      });

      onFloatClosed();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to close float:', error);
      toast({
        title: 'Failed to Close Float',
        description:
          error.response?.data?.message ||
          'An error occurred while closing the float session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!floatSession) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-blue-600" />
            Close Float Session
          </DialogTitle>
          <DialogDescription>
            Count your cash and close your shift
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Float Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Float Number:</span>
                  <span className="ml-2 font-mono font-semibold">
                    {floatSession.floatNumber}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Opening Balance:</span>
                  <span className="ml-2 font-semibold">
                    £{(floatSession.openingBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Sales:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    +£{(floatSession.totalSales || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cash In:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    +£{(floatSession.totalCashIn || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cash Out:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    -£{(floatSession.totalCashOut || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Refunds:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    -£{(floatSession.totalRefunds || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">
                    Expected Closing:
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    £{expectedClosing.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Counting Method Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!useCalculator ? 'default' : 'outline'}
              onClick={() => setUseCalculator(false)}
              className="flex-1"
            >
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={useCalculator ? 'default' : 'outline'}
              onClick={() => setUseCalculator(true)}
              className="flex-1"
            >
              Denomination Counter
            </Button>
          </div>

          {/* Manual Entry */}
          {!useCalculator && (
            <div className="space-y-2">
              <Label htmlFor="manualAmount" className="text-base font-semibold">
                Actual Closing Balance <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  £
                </span>
                <Input
                  id="manualAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) =>
                    setManualAmount(parseFloat(e.target.value) || 0)
                  }
                  className="pl-8 text-lg font-semibold"
                  required
                />
              </div>
            </div>
          )}

          {/* Denomination Counter */}
          {useCalculator && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Count Your Cash
              </Label>

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Notes</p>
                <div className="grid grid-cols-2 gap-2">
                  {DENOMINATIONS.filter((d) => d.type === 'note').map((denom) => (
                    <div
                      key={denom.value}
                      className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-2"
                    >
                      <Label className="font-semibold text-green-900 w-12">
                        {denom.label}
                      </Label>
                      <span className="text-gray-500">×</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[denom.value.toString()] || ''}
                        onChange={(e) =>
                          handleDenominationChange(denom.value, e.target.value)
                        }
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-gray-600 ml-auto">
                        £
                        {(
                          (denominations[denom.value.toString()] || 0) *
                          denom.value
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coins */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Coins</p>
                <div className="grid grid-cols-2 gap-2">
                  {DENOMINATIONS.filter((d) => d.type === 'coin').map((denom) => (
                    <div
                      key={denom.value}
                      className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-2"
                    >
                      <Label className="font-semibold text-amber-900 w-12">
                        {denom.label}
                      </Label>
                      <span className="text-gray-500">×</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denominations[denom.value.toString()] || ''}
                        onChange={(e) =>
                          handleDenominationChange(denom.value, e.target.value)
                        }
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-gray-600 ml-auto">
                        £
                        {(
                          (denominations[denom.value.toString()] || 0) *
                          denom.value
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated Total */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">
                    Counted Total:
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    £{calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Difference Display */}
          {actualClosing > 0 && (
            <Card
              className={
                isBalanced
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : difference > 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`font-semibold ${
                        isBalanced ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {isBalanced
                        ? 'Float Balanced'
                        : difference > 0
                        ? 'Float Over'
                        : 'Float Short'}
                    </span>
                  </div>
                  <Badge
                    variant={isBalanced ? 'default' : 'destructive'}
                    className="text-lg px-3 py-1"
                  >
                    {difference > 0 ? '+' : ''}£{difference.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="closingNotes">
              Closing Notes <span className="text-gray-400">(Optional)</span>
            </Label>
            <Textarea
              id="closingNotes"
              placeholder="Any notes about closing the shift..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for discrepancies */}
          {!isBalanced && actualClosing > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> There is a discrepancy in your float. Please
                double-check your count and add notes explaining the difference.
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
              disabled={loading || actualClosing === 0}
              variant={isBalanced ? 'default' : 'destructive'}
            >
              {loading ? 'Closing Float...' : 'Close Float'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FloatClosingModal;
