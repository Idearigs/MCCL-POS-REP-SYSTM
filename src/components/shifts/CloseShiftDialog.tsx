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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import { shiftService, CloseShiftData, Shift } from '@/services/shiftService';
import { format } from 'date-fns';
import { printShiftSummaryThermal } from '@/utils/thermalReceipt';
import { useSettings } from '@/contexts/SettingsContext';

interface CloseShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onShiftClosed: (shift: Shift) => void;
  activeShift: Shift | null;
}

const CloseShiftDialog: React.FC<CloseShiftDialogProps> = ({
  open,
  onClose,
  onShiftClosed,
  activeShift,
}) => {
  const [closingFloat, setClosingFloat] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variance, setVariance] = useState<number | null>(null);
  const { settings } = useSettings();

  // Calculate variance when closing float changes
  useEffect(() => {
    const floatValue = parseFloat(closingFloat);
    if (!isNaN(floatValue) && activeShift) {
      const calculatedVariance = floatValue - Number(activeShift.openingFloat);
      setVariance(calculatedVariance);
    } else {
      setVariance(null);
    }
  }, [closingFloat, activeShift]);

  const handleCloseShift = async () => {
    if (!activeShift) {
      setError('No active shift found');
      return;
    }

    // Validate closing float
    const floatValue = parseFloat(closingFloat);
    if (isNaN(floatValue) || floatValue < 0) {
      setError('Please enter a valid closing float amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const closeData: CloseShiftData = {
        closingFloat: floatValue,
        closingNotes: closingNotes.trim() || undefined,
      };

      const closedShift = await shiftService.closeShift(activeShift.id, closeData);

      // Auto open cash drawer
      const printerName = settings?.printer?.printerName;
      const printerModel = settings?.printer?.model;
      if (printerName) {
        try {
          const { openCashDrawer } = await import('@/utils/qzBridge');
          await openCashDrawer(printerName, printerModel as any, 'end-shift');
        } catch {
          // Non-fatal — drawer may not be connected
        }
      }

      // Print thermal shift summary
      try {
        const report = await shiftService.getShiftReport(closedShift.id);
        await printShiftSummaryThermal(
          {
            storeName: settings?.general?.storeName ?? 'Store',
            shiftNumber: closedShift.shiftNumber,
            cashierName: closedShift.user
              ? `${(closedShift.user as any).firstName ?? ''} ${(closedShift.user as any).lastName ?? ''}`.trim()
              : 'Staff',
            startTime: closedShift.startTime as unknown as string,
            endTime: closedShift.endTime as unknown as string ?? new Date().toISOString(),
            openingFloat: Number(closedShift.openingFloat),
            closingFloat: floatValue,
            totalSales: report.metrics.totalSales,
            totalRevenue: report.metrics.totalRevenue,
            paymentBreakdown: report.metrics.paymentBreakdown,
            totalDiscount: report.metrics.totalDiscount,
            totalTax: report.metrics.totalTax,
            variance: Number(closedShift.variance ?? 0),
          },
          printerName,
        );
      } catch {
        // Non-fatal — print dialog may not be available
      }

      // Reset form
      setClosingFloat('');
      setClosingNotes('');
      setVariance(null);

      // Notify parent and close
      onShiftClosed(closedShift);
      onClose();
    } catch (err: any) {
      console.error('Error closing shift:', err);
      setError(err.message || 'Failed to close shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setClosingFloat('');
      setClosingNotes('');
      setVariance(null);
      setError(null);
      onClose();
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (variance < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-5 w-5" />;
    if (variance < 0) return <TrendingDown className="h-5 w-5" />;
    return <CheckCircle className="h-5 w-5" />;
  };

  const getVarianceMessage = (variance: number) => {
    if (variance > 0) return 'Cash surplus detected';
    if (variance < 0) return 'Cash shortage detected';
    return 'Float balanced perfectly';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Close Shift
          </DialogTitle>
          <DialogDescription>
            Count your cash register and enter the closing float amount to close your
            shift.
          </DialogDescription>
        </DialogHeader>

        {activeShift && (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Shift Information */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shift Number:</span>
                    <span className="font-medium">{activeShift.shiftNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="font-medium">
                      {format(new Date(activeShift.startTime), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opening Float:</span>
                    <span className="font-medium">
                      £{Number(activeShift.openingFloat).toFixed(2)}
                    </span>
                  </div>
                  {activeShift._count && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">{activeShift._count.sales}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Closing Float Input */}
            <div className="space-y-2">
              <Label htmlFor="closingFloat" className="text-sm font-medium">
                Closing Float Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  £
                </span>
                <Input
                  id="closingFloat"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={closingFloat}
                  onChange={(e) => setClosingFloat(e.target.value)}
                  className="pl-7"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the total cash amount in your register now
              </p>
            </div>

            {/* Variance Display */}
            {variance !== null && (
              <Card className={`border-2 ${getVarianceColor(variance)}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getVarianceIcon(variance)}
                      <div>
                        <p className="font-semibold">
                          {variance >= 0 ? '+' : ''}£{Math.abs(variance).toFixed(2)}
                        </p>
                        <p className="text-sm">{getVarianceMessage(variance)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Closing Notes */}
            <div className="space-y-2">
              <Label htmlFor="closingNotes" className="text-sm font-medium">
                Closing Notes (Optional)
              </Label>
              <Textarea
                id="closingNotes"
                placeholder="Add any notes about your shift closing..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={3}
                disabled={loading}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Note any discrepancies, issues, or important information
              </p>
            </div>

            {/* Warning for large variance */}
            {variance !== null && Math.abs(variance) > 50 && (
              <Alert className="bg-yellow-50 border-yellow-300">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-900">
                  <strong>Large variance detected!</strong> Please double-check your
                  cash count and review all transactions before closing.
                </AlertDescription>
              </Alert>
            )}

            {/* Information Box */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-900">
                <strong>Important:</strong> Make sure all transactions are completed
                and recorded before closing your shift.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCloseShift}
            disabled={loading || !closingFloat}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing Shift...
              </>
            ) : (
              'Close Shift'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseShiftDialog;
