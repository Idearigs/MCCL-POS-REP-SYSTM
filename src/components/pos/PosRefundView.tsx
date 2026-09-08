import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, RotateCcw, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { salesService, Sale } from '@/services/salesService';
import { printRefundReceipt, RefundReceiptData } from '@/utils/thermalReceipt';
import RefundSaleDialog from '@/components/sales/RefundSaleDialog';

interface PosRefundViewProps {
  onClose: () => void;
}

const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

/**
 * Full-page POS refund view (rendered over the tile grid, cart stays visible).
 * Shows recent sales on open, filterable by product code / sale # / receipt /
 * customer, each as a card with a Refund button. Choosing one runs the same
 * password-gated refund + receipt flow used in Sales Management.
 */
const PosRefundView: React.FC<PosRefundViewProps> = ({ onClose }) => {
  const { toast } = useToast();
  const { auth } = useAuth();
  const { settings } = useSettings();

  const [query, setQuery] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pendingShopCopy, setPendingShopCopy] = useState<RefundReceiptData | null>(null);

  // Load recent sales (or search results when a query is present).
  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const term = (q ?? '').trim();
      const res = await salesService.getSales(1, 25, term ? { search: term } : {});
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
    salesService
      .getRefundPasswordStatus()
      .then((s) => setPasswordRequired(s.isSet))
      .catch(() => setPasswordRequired(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildReceipt = (
    original: Sale,
    refundData: any,
    thisRefundAmount: number,
  ): RefundReceiptData => {
    const originalItems = (original.items || []) as any[];
    const items = (refundData.items || [])
      .map((ri: { saleItemId: string; quantity: number }) => {
        const src = originalItems.find((i) => i.id === ri.saleItemId);
        if (!src) return null;
        const unit =
          (src.totalPrice ?? src.total ?? src.unitPrice * src.quantity) /
          (src.quantity || 1);
        return {
          name: src.productName || src.name || 'Item',
          sku: src.sku || src.productSku,
          quantity: ri.quantity,
          unitPrice: unit,
          total: unit * ri.quantity,
        };
      })
      .filter(Boolean) as RefundReceiptData['items'];

    return {
      storeName: settings.general.storeName,
      tradingName: settings.general.tradingName,
      storeAddress: settings.general.address,
      storePhone: settings.general.phone,
      storeEmail: settings.general.email,
      vatNumber: settings.printer.vatNumber,
      originalSaleNumber:
        original.receiptNumber ||
        (original as any).saleNumber ||
        original.id.slice(0, 8),
      date: new Date().toISOString(),
      cashierName:
        `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim() ||
        auth.user?.email ||
        'Staff',
      customerName: (original as any).customerName,
      items: items.length
        ? items
        : [{ name: 'Refund', quantity: 1, unitPrice: thisRefundAmount, total: thisRefundAmount }],
      refundAmount: thisRefundAmount,
      reason: refundData.reason,
      paymentMethod: (original as any).paymentMethod,
      headerMessage:
        settings.receiptTypes?.sales?.headerText ||
        settings.printer.headerText ||
        undefined,
      footerMessage:
        settings.receiptTypes?.sales?.footerText ||
        settings.printer.footerText ||
        undefined,
    };
  };

  const handleConfirmRefund = async (refundData: any) => {
    const original = refundingSale;
    try {
      setIsProcessing(true);
      const prevRefunded = original?.refundedAmount || 0;
      const updated = await salesService.refundSale(refundData.saleId, {
        reason: refundData.reason,
        items: refundData.items,
        notes: refundData.notes,
        refundPassword: refundData.refundPassword,
      });
      const thisRefundAmount = Math.max(
        0,
        (updated.refundedAmount || 0) - prevRefunded,
      );

      toast({
        title: 'Refund Processed',
        description: `Refund of ${gbp(thisRefundAmount)} processed successfully`,
      });
      setRefundingSale(null);

      if (original) {
        const receipt = buildReceipt(original, refundData, thisRefundAmount);
        try {
          await printRefundReceipt(
            receipt,
            'CUSTOMER COPY',
            settings.printer.printerName || undefined,
          );
        } catch (e) {
          console.error('Refund receipt print failed:', e);
        }
        setPendingShopCopy(receipt);
      }
      load(query); // refresh so refunded totals update
    } catch (error: any) {
      const isAuth = error?.response?.status === 403;
      toast({
        title: isAuth ? 'Refund Not Authorised' : 'Error',
        description: isAuth
          ? 'Incorrect refund password. Please try again.'
          : 'Failed to process refund',
        variant: 'destructive',
      });
      if (!isAuth) setRefundingSale(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col animate-scale-in">
      {/* Header: back + title + search */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 mr-2">
          <RotateCcw className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">Refund a Sale</h2>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            autoFocus
            className="pl-10"
            placeholder="Product code, sale #, receipt, or customer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load(query);
            }}
          />
        </div>
        <Button variant="outline" onClick={() => load(query)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
        {query && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              load('');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Body: recent sales / results as cards */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {query ? 'Search results' : 'Recent sales'}
        </p>

        {loading && sales.length === 0 && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && sales.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            {query ? 'No sales match that search.' : 'No sales found.'}
          </div>
        )}

        {sales.map((sale) => {
          const remaining = (sale.totalAmount || 0) - (sale.refundedAmount || 0);
          const fullyRefunded = remaining <= 0;
          const itemNames = ((sale.items || []) as any[])
            .map((i) => i.productName || i.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
          return (
            <div
              key={sale.id}
              className="flex items-center justify-between border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {sale.receiptNumber || (sale as any).saleNumber || sale.id.slice(0, 8)}
                  </span>
                  {(sale.refundedAmount || 0) > 0 && (
                    <span className="text-[10px] font-medium bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                      {fullyRefunded ? 'Refunded' : 'Part-refunded'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {sale.createdAt
                    ? new Date(sale.createdAt).toLocaleString('en-GB')
                    : ''}
                  {(sale as any).customerName ? ` · ${(sale as any).customerName}` : ''}
                </p>
                {itemNames && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{itemNames}</p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{gbp(sale.totalAmount || 0)}</p>
                  {(sale.refundedAmount || 0) > 0 && (
                    <p className="text-xs text-orange-600">-{gbp(sale.refundedAmount)}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={fullyRefunded ? 'outline' : 'default'}
                  disabled={fullyRefunded}
                  className={!fullyRefunded ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  onClick={() => setRefundingSale(sale)}
                >
                  {fullyRefunded ? 'Refunded' : 'Refund'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refund options dialog (with the password gate) */}
      <RefundSaleDialog
        isOpen={!!refundingSale}
        onClose={() => setRefundingSale(null)}
        sale={refundingSale}
        onConfirmRefund={handleConfirmRefund}
        isProcessing={isProcessing}
        passwordRequired={passwordRequired}
      />

      {/* Print shop copy? */}
      <AlertDialog
        open={!!pendingShopCopy}
        onOpenChange={(o) => !o && setPendingShopCopy(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Print shop copy?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer's refund receipt has printed. Print a second copy for
              the shop's records?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingShopCopy(null)}>
              No, skip
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const receipt = pendingShopCopy;
                setPendingShopCopy(null);
                if (receipt) {
                  try {
                    await printRefundReceipt(
                      receipt,
                      'SHOP COPY',
                      settings.printer.printerName || undefined,
                    );
                  } catch (e) {
                    console.error('Shop copy print failed:', e);
                  }
                }
              }}
            >
              Yes, print shop copy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PosRefundView;
