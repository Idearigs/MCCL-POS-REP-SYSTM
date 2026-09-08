import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Receipt, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService, Sale } from '@/services/salesService';
import { shiftService } from '@/services/shiftService';

interface PosTodaySalesViewProps {
  onClose: () => void;
}

const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

/**
 * Full-page POS view listing the current shift's sales (falls back to today's
 * sales when no shift is open). Read-only summary — count, gross, refunded,
 * net — plus a card per sale. Rendered over the tile grid, cart stays right.
 */
const PosTodaySalesView: React.FC<PosTodaySalesViewProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [shiftNumber, setShiftNumber] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer the active shift's start time; otherwise today from midnight.
      let startDate: string;
      let shiftNo: string | null = null;
      try {
        const shift = await shiftService.getActiveShift();
        if (shift?.startTime) {
          startDate = new Date(shift.startTime).toISOString();
          shiftNo = shift.shiftNumber || null;
        } else {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          startDate = d.toISOString();
        }
      } catch {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
      }
      setShiftNumber(shiftNo);
      const res = await salesService.getSales(1, 100, { startDate });
      setSales(res.data || []);
    } catch {
      setSales([]);
      toast({
        title: 'Could not load sales',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const gross = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const refunded = sales.reduce((s, x) => s + (x.refundedAmount || 0), 0);
  const net = gross - refunded;

  return (
    <div className="h-full flex flex-col animate-scale-in">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Receipt className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Today's Sales
          </h2>
          {shiftNumber && (
            <span className="text-xs text-gray-400">· Shift {shiftNumber}</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3 py-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <p className="text-xs text-gray-400">Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <p className="text-xs text-gray-400">Gross Sales</p>
          <p className="text-2xl font-bold text-gray-900">{gbp(gross)}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs text-green-600">Net (after refunds)</p>
          <p className="text-2xl font-bold text-green-700">{gbp(net)}</p>
          {refunded > 0 && (
            <p className="text-xs text-orange-600 mt-0.5">
              −{gbp(refunded)} refunded
            </p>
          )}
        </div>
      </div>

      {/* Sales list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading && sales.length === 0 && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!loading && sales.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No sales yet for this shift.
          </div>
        )}
        {sales.map((sale) => {
          const itemNames = ((sale.items || []) as any[])
            .map((i) => i.productName || i.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
          return (
            <div
              key={sale.id}
              className="flex items-center justify-between border border-gray-200 rounded-xl p-4 bg-white"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {sale.receiptNumber ||
                      (sale as any).saleNumber ||
                      sale.id.slice(0, 8)}
                  </span>
                  {(sale.refundedAmount || 0) > 0 && (
                    <span className="text-[10px] font-medium bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                      Refunded
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sale.createdAt
                    ? new Date(sale.createdAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                  {(sale as any).paymentMethod
                    ? ` · ${(sale as any).paymentMethod}`
                    : ''}
                  {(sale as any).customerName
                    ? ` · ${(sale as any).customerName}`
                    : ''}
                </p>
                {itemNames && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {itemNames}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">
                  {gbp(sale.totalAmount || 0)}
                </p>
                {(sale.refundedAmount || 0) > 0 && (
                  <p className="text-xs text-orange-600">
                    −{gbp(sale.refundedAmount)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PosTodaySalesView;
