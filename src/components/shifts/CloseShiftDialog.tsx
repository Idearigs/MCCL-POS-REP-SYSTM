import React, { useState, useMemo, useEffect } from 'react';
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
  Lock,
  Coins,
} from 'lucide-react';
import {
  shiftService,
  CloseShiftData,
  Shift,
  CloseShiftError,
} from '@/services/shiftService';
import { format } from 'date-fns';
import { printShiftSummaryThermal } from '@/utils/thermalReceipt';
import { useSettings } from '@/contexts/SettingsContext';

interface CloseShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onShiftClosed: (shift: Shift) => void;
  activeShift: Shift | null;
}

// GBP denomination matrix — value in pence keyed so it round-trips to the
// backend `denominations` JSON snapshot. Notes first, then coins.
const DENOMINATIONS: { pence: number; label: string; kind: 'note' | 'coin' }[] =
  [
    { pence: 5000, label: '£50', kind: 'note' },
    { pence: 2000, label: '£20', kind: 'note' },
    { pence: 1000, label: '£10', kind: 'note' },
    { pence: 500, label: '£5', kind: 'note' },
    { pence: 200, label: '£2', kind: 'coin' },
    { pence: 100, label: '£1', kind: 'coin' },
    { pence: 50, label: '50p', kind: 'coin' },
    { pence: 20, label: '20p', kind: 'coin' },
    { pence: 10, label: '10p', kind: 'coin' },
    { pence: 5, label: '5p', kind: 'coin' },
    { pence: 2, label: '2p', kind: 'coin' },
    { pence: 1, label: '1p', kind: 'coin' },
  ];

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CloseShiftDialog: React.FC<CloseShiftDialogProps> = ({
  open,
  onClose,
  onShiftClosed,
  activeShift,
}) => {
  const { settings } = useSettings();
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [cardActual, setCardActual] = useState('');
  const [giftCardSales, setGiftCardSales] = useState('');
  const [layawayDeposits, setLayawayDeposits] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Staged-close state (revealed only when the backend asks for them)
  const [varianceReason, setVarianceReason] = useState('');
  const [needsReason, setNeedsReason] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [needsPin, setNeedsPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset everything whenever the dialog is (re)opened for a shift
  useEffect(() => {
    if (open) {
      setCounts({});
      setCardActual('');
      setGiftCardSales('');
      setLayawayDeposits('');
      setClosingNotes('');
      setVarianceReason('');
      setNeedsReason(false);
      setManagerPin('');
      setNeedsPin(false);
      setError(null);
    }
  }, [open]);

  // Declared cash = sum of (denomination value × quantity counted)
  const declaredCash = useMemo(() => {
    return (
      DENOMINATIONS.reduce((sum, d) => {
        const qty = parseInt(counts[d.pence] || '0', 10);
        return sum + (isNaN(qty) ? 0 : qty) * d.pence;
      }, 0) / 100
    );
  }, [counts]);

  const denominationsPayload = useMemo(() => {
    const out: Record<string, number> = {};
    DENOMINATIONS.forEach((d) => {
      const qty = parseInt(counts[d.pence] || '0', 10);
      if (!isNaN(qty) && qty > 0) out[String(d.pence)] = qty;
    });
    return out;
  }, [counts]);

  const setCount = (pence: number, value: string) => {
    // Digits only
    const clean = value.replace(/[^0-9]/g, '');
    setCounts((prev) => ({ ...prev, [pence]: clean }));
  };

  const handleCloseShift = async () => {
    if (!activeShift) {
      setError('No active shift found');
      return;
    }
    if (needsReason && !varianceReason.trim()) {
      setError('Please enter a reason for the cash discrepancy.');
      return;
    }
    if (needsPin && !managerPin.trim()) {
      setError('A manager PIN is required to close this shift.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const closeData: CloseShiftData = {
        closingFloat: declaredCash,
        denominations: denominationsPayload,
        cardActual: cardActual ? parseFloat(cardActual) : undefined,
        giftCardSales: giftCardSales ? parseFloat(giftCardSales) : undefined,
        layawayDeposits: layawayDeposits
          ? parseFloat(layawayDeposits)
          : undefined,
        varianceReason: varianceReason.trim() || undefined,
        managerPin: managerPin.trim() || undefined,
        closingNotes: closingNotes.trim() || undefined,
      };

      const closedShift = await shiftService.closeShift(
        activeShift.id,
        closeData,
      );

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

      // Print thermal shift summary (Z-report)
      try {
        const report = await shiftService.getShiftReport(closedShift.id);
        await printShiftSummaryThermal(
          {
            storeName: settings?.general?.storeName ?? 'Store',
            storeAddress: settings?.general?.address,
            storePhone: settings?.general?.phone,
            vatNumber: settings?.printer?.vatNumber,
            companyRegNumber: settings?.cashUp?.companyRegistrationNumber,
            registerId: settings?.cashUp?.registerId,
            shiftNumber: closedShift.shiftNumber,
            cashierName: closedShift.user
              ? `${(closedShift.user as any).firstName ?? ''} ${(closedShift.user as any).lastName ?? ''}`.trim()
              : 'Staff',
            startTime: closedShift.startTime as unknown as string,
            endTime:
              (closedShift.endTime as unknown as string) ??
              new Date().toISOString(),
            openingFloat: Number(closedShift.openingFloat),
            closingFloat: declaredCash,
            expectedCash: Number(closedShift.expectedFloat ?? declaredCash),
            declaredCash,
            totalSales: report.metrics.totalSales,
            totalRevenue: report.metrics.totalRevenue,
            paymentBreakdown: report.metrics.paymentBreakdown,
            cashSales: report.metrics.cashSales,
            cardSales: report.metrics.cardSales,
            giftCardSales: Number(closedShift.giftCardSales ?? 0),
            layawayDeposits: Number(closedShift.layawayDeposits ?? 0),
            payIns: Number(closedShift.cashPayIns ?? 0),
            payOuts: Number(closedShift.cashPayOuts ?? 0),
            totalDiscount: report.metrics.totalDiscount,
            totalTax: report.metrics.totalTax,
            variance: Number(closedShift.variance ?? 0),
          },
          printerName,
        );
      } catch {
        // Non-fatal — print dialog may not be available
      }

      onShiftClosed(closedShift);
      onClose();
    } catch (err: unknown) {
      const code = err instanceof CloseShiftError ? err.code : undefined;
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to close shift. Please try again.';

      if (code === 'VARIANCE_REASON_REQUIRED') {
        // Blind close: we still don't reveal the expected figure — only that
        // the count differs and a reason is required.
        setNeedsReason(true);
        setError(message);
      } else if (code === 'MANAGER_PIN_REQUIRED') {
        setNeedsReason(true); // a reason is also required for any variance
        setNeedsPin(true);
        setError(message);
      } else if (code === 'MANAGER_PIN_INVALID') {
        setNeedsPin(true);
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  const notes = DENOMINATIONS.filter((d) => d.kind === 'note');
  const coins = DENOMINATIONS.filter((d) => d.kind === 'coin');

  const renderRow = (d: { pence: number; label: string }) => {
    const qty = parseInt(counts[d.pence] || '0', 10);
    const subtotal = (isNaN(qty) ? 0 : qty) * (d.pence / 100);
    return (
      <div key={d.pence} className="flex items-center gap-2">
        <span className="w-12 text-sm font-medium text-gray-700">
          {d.label}
        </span>
        <span className="text-gray-400">×</span>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={counts[d.pence] ?? ''}
          onChange={(e) => setCount(d.pence, e.target.value)}
          disabled={loading}
          className="h-8 w-16 text-center"
        />
        <span className="ml-auto text-sm tabular-nums text-gray-600">
          {gbp(subtotal)}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Close Shift
          </DialogTitle>
          <DialogDescription>
            Count the physical cash in your drawer by denomination. The system
            checks your count against the expected total when you close.
          </DialogDescription>
        </DialogHeader>

        {activeShift && (
          <div className="space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Shift info */}
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shift Number:</span>
                    <span className="font-medium">
                      {activeShift.shiftNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="font-medium">
                      {format(
                        new Date(activeShift.startTime),
                        'MMM dd, yyyy HH:mm',
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opening Float:</span>
                    <span className="font-medium">
                      {gbp(Number(activeShift.openingFloat))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Denomination matrix */}
            <div>
              <Label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                <Coins className="h-4 w-4" />
                Cash Count
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-gray-200 p-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Notes
                  </p>
                  {notes.map(renderRow)}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Coins
                  </p>
                  {coins.map(renderRow)}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
                <span className="text-sm font-medium text-blue-900">
                  Total Counted (Declared Cash)
                </span>
                <span className="text-lg font-bold text-blue-700 tabular-nums">
                  {gbp(declaredCash)}
                </span>
              </div>
            </div>

            <Separator />

            {/* Card / PDQ Z-Read + non-revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cardActual" className="text-xs font-medium">
                  Card Terminal (Z-Read)
                </Label>
                <Input
                  id="cardActual"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cardActual}
                  onChange={(e) => setCardActual(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="giftCardSales" className="text-xs font-medium">
                  Gift Card Sales
                </Label>
                <Input
                  id="giftCardSales"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={giftCardSales}
                  onChange={(e) => setGiftCardSales(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="layawayDeposits"
                  className="text-xs font-medium"
                >
                  Layaway Deposits
                </Label>
                <Input
                  id="layawayDeposits"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={layawayDeposits}
                  onChange={(e) => setLayawayDeposits(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Variance reason — revealed when the count does not balance */}
            {needsReason && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="varianceReason"
                  className="flex items-center gap-1.5 text-sm font-medium text-amber-700"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Variance Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="varianceReason"
                  placeholder="Explain why the counted cash differs from the expected amount…"
                  value={varianceReason}
                  onChange={(e) => setVarianceReason(e.target.value)}
                  rows={2}
                  disabled={loading}
                  className="resize-none border-amber-300"
                  autoFocus
                />
              </div>
            )}

            {/* Manager PIN — revealed when the variance exceeds the threshold */}
            {needsPin && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="managerPin"
                  className="flex items-center gap-1.5 text-sm font-medium text-red-700"
                >
                  <Lock className="h-4 w-4" />
                  Manager PIN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="managerPin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  value={managerPin}
                  onChange={(e) =>
                    setManagerPin(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  disabled={loading}
                  className="w-32 border-red-300 tracking-widest"
                />
                <p className="text-xs text-gray-500">
                  This variance exceeds the allowed threshold and must be
                  authorised by a manager.
                </p>
              </div>
            )}

            {/* Closing notes */}
            <div className="space-y-1.5">
              <Label htmlFor="closingNotes" className="text-sm font-medium">
                Closing Notes (Optional)
              </Label>
              <Textarea
                id="closingNotes"
                placeholder="Add any notes about your shift closing…"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                rows={2}
                disabled={loading}
                className="resize-none"
              />
            </div>
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
            disabled={loading || declaredCash <= 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing Shift…
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
