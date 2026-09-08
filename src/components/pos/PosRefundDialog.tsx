import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { salesService, Sale } from '@/services/salesService';
import { printRefundReceipt, RefundReceiptData } from '@/utils/thermalReceipt';
import RefundSaleDialog from '@/components/sales/RefundSaleDialog';

interface PosRefundDialogProps {
  open: boolean;
  onClose: () => void;
}

const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

/**
 * POS-window refund entry: search a past sale (by product code, sale #,
 * receipt or customer), pick it, then run the same password-gated refund +
 * receipt flow used in Sales Management.
 */
const PosRefundDialog: React.FC<PosRefundDialogProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const { auth } = useAuth();
  const { settings } = useSettings();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Sale[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pendingShopCopy, setPendingShopCopy] = useState<RefundReceiptData | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setSearched(false);
    salesService
      .getRefundPasswordStatus()
      .then((s) => setPasswordRequired(s.isSet))
      .catch(() => setPasswordRequired(false));
  }, [open]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    try {
      const found = await salesService.searchSales(q, 20);
      setResults(found || []);
    } catch {
      setResults([]);
      toast({
        title: 'Search failed',
        description: 'Could not search sales. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

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
      // Refresh the search results so refunded totals show.
      runSearch();
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
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Refund a Sale
            </DialogTitle>
            <DialogDescription>
              Search by product code, sale number, receipt, or customer, then
              choose the sale to refund.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                autoFocus
                className="pl-10"
                placeholder="Product code, sale #, receipt, or customer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch();
                }}
              />
            </div>
            <Button onClick={runSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {searched && !searching && results.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                No sales found. Try a different code or number.
              </p>
            )}
            {results.map((sale) => {
              const remaining =
                (sale.totalAmount || 0) - (sale.refundedAmount || 0);
              const fullyRefunded = remaining <= 0;
              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border rounded-lg p-3 bg-white"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {sale.receiptNumber || (sale as any).saleNumber || sale.id.slice(0, 8)}
                      {(sale as any).customerName ? ` · ${(sale as any).customerName}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sale.createdAt
                        ? new Date(sale.createdAt).toLocaleString('en-GB')
                        : ''}{' '}
                      · Total {gbp(sale.totalAmount || 0)}
                      {(sale.refundedAmount || 0) > 0
                        ? ` · Refunded ${gbp(sale.refundedAmount)}`
                        : ''}
                    </p>
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
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <RefundSaleDialog
        isOpen={!!refundingSale}
        onClose={() => setRefundingSale(null)}
        sale={refundingSale}
        onConfirmRefund={handleConfirmRefund}
        isProcessing={isProcessing}
        passwordRequired={passwordRequired}
      />

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
    </>
  );
};

export default PosRefundDialog;
