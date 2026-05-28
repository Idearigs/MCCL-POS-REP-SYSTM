import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Calendar,
  CreditCard,
  Receipt,
  UserCircle,
  Package,
  Printer,
  RotateCcw,
  FileText,
  TrendingUp,
  Banknote,
  PiggyBank,
  AlertCircle,
  Tag,
  Wrench,
} from 'lucide-react';
import { Sale } from '@/services/salesService';
import { format } from 'date-fns';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPrintReceipt: (saleId: string) => void;
  onRefund: (sale: Sale) => void;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  DIGITAL_WALLET: 'Digital Wallet',
  INSTALLMENT: 'Installment',
};

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintReceipt,
  onRefund,
}) => {
  if (!sale) return null;

  const canRefund = sale.paymentStatus === 'COMPLETED' && sale.status === 'COMPLETED';

  const parseCondition = (notes?: string) => {
    const m = (notes || '').match(/CONDITION:(BRAND_NEW|USED)/);
    return m ? (m[1] === 'BRAND_NEW' ? 'Brand New' : 'Used') : null;
  };

  // ── Margin calculation ─────────────────────────────────────────────────
  const itemsWithMargin = (sale.items || []).map((item) => {
    const cost = (item as any).costPrice ? Number((item as any).costPrice) * item.quantity : null;
    const revenue = item.totalPrice ?? item.total ?? item.unitPrice * item.quantity;
    const margin = cost !== null ? revenue - cost : null;
    const marginPct = cost !== null && revenue > 0 ? ((revenue - cost) / revenue) * 100 : null;
    return { ...item, cost, revenue, margin, marginPct };
  });

  const totalCost = itemsWithMargin.reduce((s, i) => s + (i.cost ?? 0), 0);
  const totalRevenue = sale.totalAmount;
  const totalMargin = totalCost > 0 ? totalRevenue - totalCost : null;
  const totalMarginPct = totalCost > 0 && totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null;

  // ── Payments breakdown ─────────────────────────────────────────────────
  const payments = (sale as any).payments as Array<{
    id: string; method: string; amount: number; status: string;
    reference?: string; cardLast4?: string; notes?: string;
  }> | undefined;

  const isSplitPayment = payments && payments.length > 1;

  // ── Tax / VAT ledger ───────────────────────────────────────────────────
  const totalTax = sale.taxAmount || 0;
  const subtotalExTax = sale.subtotal - totalTax;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-navy" />
              <span>Sale #{sale.receiptNumber || sale.id.slice(0, 8)}</span>
            </div>
            <Badge className={
              sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
              sale.status === 'REFUNDED' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              sale.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-200' :
              'bg-gray-100 text-gray-600'
            }>{sale.status}</Badge>
          </DialogTitle>
          <DialogDescription>Full financial breakdown · {format(new Date(sale.createdAt), 'PPpp')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Row 1: Customer + Transaction info ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <User size={12} /> Customer
              </h4>
              <p className="font-semibold text-sm">{sale.customerName || 'Walk-in Customer'}</p>
              {sale.customerId && <p className="text-xs text-gray-400">ID: {sale.customerId.slice(0, 8)}</p>}
            </div>
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={12} /> Transaction
              </h4>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700 flex items-center gap-1.5">
                  <Calendar size={12} className="text-gray-400" />
                  {format(new Date(sale.createdAt), 'dd MMM yyyy, HH:mm')}
                </p>
                <p className="text-gray-700 flex items-center gap-1.5">
                  <UserCircle size={12} className="text-gray-400" />
                  Cashier: <span className="font-medium">{sale.cashierName || '—'}</span>
                </p>
                {sale.salespersonName && (
                  <p className="text-purple-700 flex items-center gap-1.5">
                    <Tag size={12} />
                    Salesperson: <span className="font-medium">{sale.salespersonName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Profit Margin Panel ── */}
          {totalCost > 0 && totalMargin !== null && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <TrendingUp size={12} /> Profit Margin Analysis
              </h4>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Revenue</p>
                  <p className="font-bold text-slate-800">{fmt(totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Cost</p>
                  <p className="font-bold text-slate-800">{fmt(totalCost)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Gross Profit</p>
                  <p className={`font-bold ${totalMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(totalMargin)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Margin %</p>
                  <p className={`font-bold text-lg ${(totalMarginPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {totalMarginPct?.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Items Table with per-line margin ── */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <Package size={12} /> Line Items
            </h4>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Cond.</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit £</TableHead>
                    <TableHead className="text-right">Disc</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {totalCost > 0 && <TableHead className="text-right">Margin</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsWithMargin.length > 0 ? (
                    itemsWithMargin.map((item, i) => {
                      const sku = (item as any).productSku || item.sku || '—';
                      const condition = parseCondition((item as any).notes);
                      const lineTotal = item.totalPrice ?? item.total ?? (item.unitPrice * item.quantity - (item.discount || 0));
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                          <TableCell className="text-xs text-gray-500 font-mono">{sku}</TableCell>
                          <TableCell>
                            {condition ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${condition === 'Brand New' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {condition}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(item.unitPrice)}</TableCell>
                          <TableCell className="text-right text-sm text-red-500">
                            {(item.discount || 0) > 0 ? `-${fmt(item.discount)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">{fmt(lineTotal)}</TableCell>
                          {totalCost > 0 && (
                            <TableCell className="text-right text-xs">
                              {item.marginPct !== null ? (
                                <span className={`font-semibold ${(item.marginPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {item.marginPct?.toFixed(0)}%
                                </span>
                              ) : <span className="text-gray-300">—</span>}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-400 text-sm py-6">No items</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ── Split Payment Breakdown ── */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={12} /> Payment{isSplitPayment ? ' Breakdown (Split)' : ''}
              </h4>
              {isSplitPayment ? (
                <div className="space-y-2">
                  {payments!.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Banknote size={12} className="text-blue-500" />
                        <span className="text-gray-700">
                          {PAYMENT_LABELS[p.method] || p.method}
                          {p.cardLast4 && <span className="text-gray-400 ml-1">····{p.cardLast4}</span>}
                          {p.reference && <span className="text-gray-400 ml-1">Ref: {p.reference}</span>}
                        </span>
                        <Badge className={`text-[9px] px-1.5 ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span>
                    <span className="font-semibold">{fmt(sale.totalAmount)}</span>
                  </div>
                  {(sale as any).payments?.[0]?.cardLast4 && (
                    <p className="text-xs text-gray-400">Card ····{(sale as any).payments[0].cardLast4}</p>
                  )}
                  <div className="flex items-center gap-1">
                    <Badge className={sale.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700 text-[9px]' : 'bg-yellow-100 text-yellow-700 text-[9px]'}>
                      {sale.paymentStatus}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* ── Tax / VAT Ledger ── */}
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
              <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                <PiggyBank size={12} /> VAT / Tax Ledger
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (ex. VAT)</span>
                  <span>{fmt(subtotalExTax > 0 ? subtotalExTax : sale.subtotal)}</span>
                </div>
                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-{fmt(sale.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>VAT collected</span>
                  <span>{fmt(totalTax)}</span>
                </div>
                {totalTax === 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <AlertCircle size={10} />
                    Zero-rated / Tax-exempt
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-base text-navy">
                  <span>Total</span>
                  <span>{fmt(sale.totalAmount)}</span>
                </div>
                {sale.refundedAmount > 0 && (
                  <div className="flex justify-between text-orange-600 text-xs pt-1 border-t">
                    <span>Refunded</span>
                    <span>-{fmt(sale.refundedAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Repair / Layaway link ── */}
          {sale.paymentMethod === 'INSTALLMENT' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              <Wrench size={14} className="text-orange-500" />
              <span className="text-orange-700 font-medium">Installment sale</span>
              <span className="text-orange-500 text-xs">Balance due: {fmt(sale.balanceDue ?? 0)}</span>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 whitespace-pre-wrap">
              <span className="font-semibold text-gray-700 text-xs uppercase block mb-1">Notes</span>
              {sale.notes}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onPrintReceipt(sale.id)} className="rounded-full text-sm">
              <Printer size={14} className="mr-2" />
              Print Receipt
            </Button>
            {canRefund && (
              <Button
                variant="outline"
                onClick={() => onRefund(sale)}
                className="rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 text-sm"
              >
                <RotateCcw size={14} className="mr-2" />
                Refund / Exchange
              </Button>
            )}
            <Button onClick={onClose} className="rounded-full bg-navy hover:bg-navy-dark text-sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailModal;
