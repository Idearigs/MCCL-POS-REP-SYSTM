import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/table";
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  Receipt,
  UserCircle,
  Package,
  Printer,
  RotateCcw,
  FileText
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

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrintReceipt,
  onRefund
}) => {
  if (!sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp');
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      FAILED: { variant: 'destructive', label: 'Failed' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
      PARTIALLY_REFUNDED: { variant: 'outline', label: 'Partially Refunded' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSaleStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded' }
    };

    const config = statusConfig[status] || statusConfig.COMPLETED;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      CASH: 'Cash',
      CARD: 'Card',
      BANK_TRANSFER: 'Bank Transfer',
      CHEQUE: 'Cheque',
      DIGITAL_WALLET: 'Digital Wallet',
      INSTALLMENT: 'Installment'
    };
    return methods[method] || method;
  };

  const canRefund = sale.paymentStatus === 'COMPLETED' && sale.status === 'COMPLETED';

  // Parse condition from item notes (stored as "CONDITION:BRAND_NEW | ...")
  const parseCondition = (notes?: string): string | null => {
    if (!notes) return null;
    const match = notes.match(/CONDITION:(BRAND_NEW|USED)/);
    if (!match) return null;
    return match[1] === 'BRAND_NEW' ? 'Brand New' : 'Used';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-navy" />
              <span>Sale #{sale.receiptNumber || sale.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2">
              {getSaleStatusBadge(sale.status)}
            </div>
          </DialogTitle>
          <DialogDescription>
            Sale details and transaction information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer & Transaction Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-navy">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <UserCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{sale.customerName || 'Walk-in Customer'}</p>
                    {sale.customerId && (
                      <p className="text-xs text-gray-500">ID: {sale.customerId.slice(0, 8)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Information */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-navy">
                <FileText className="h-4 w-4" />
                Transaction Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{formatDate(sale.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                  {getPaymentStatusBadge(sale.paymentStatus)}
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">Cashier: {sale.cashierName || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items Purchased */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-navy">
              <Package className="h-4 w-4" />
              Items Purchased
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">Condition</TableHead>
                    <TableHead className="font-semibold text-center">Qty</TableHead>
                    <TableHead className="font-semibold text-right">Unit Price</TableHead>
                    <TableHead className="font-semibold text-right">Discount</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items && sale.items.length > 0 ? (
                    sale.items.map((item, index) => {
                      const itemTotal = item.total || ((item.quantity * item.unitPrice) - (item.discount || 0));
                      const itemSku = (item as any).productSku || item.sku || '-';
                      const condition = parseCondition((item as any).notes);

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-gray-600 text-sm">{itemSku}</TableCell>
                          <TableCell>
                            {condition ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                condition === 'Brand New'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {condition}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right text-red-600">
                            {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(itemTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="space-y-3 bg-navy/5 p-4 rounded-lg">
            <h3 className="font-semibold text-sm text-navy">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(sale.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (VAT 20%)</span>
                <span className="font-medium">{formatCurrency(sale.taxAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-bold text-navy">Total Amount</span>
                <span className="font-bold text-navy text-lg">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
              {sale.refundedAmount > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600">Refunded Amount</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(sale.refundedAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-navy">Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {sale.notes}
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onPrintReceipt(sale.id)}
              className="rounded-full"
            >
              <Printer size={16} className="mr-2" />
              Print Receipt
            </Button>
            {canRefund && (
              <Button
                variant="outline"
                onClick={() => onRefund(sale)}
                className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
              >
                <RotateCcw size={16} className="mr-2" />
                Refund Sale
              </Button>
            )}
            <Button onClick={onClose} className="rounded-full bg-navy hover:bg-navy-dark">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailModal;
