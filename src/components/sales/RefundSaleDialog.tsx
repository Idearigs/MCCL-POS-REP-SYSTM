import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';
import { Sale, SaleItem } from '@/services/salesService';

interface RefundSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirmRefund: (refundData: {
    saleId: string;
    refundType: 'full' | 'partial';
    amount?: number;
    items?: Array<{ productId: string; quantity: number }>;
    reason: string;
    notes?: string;
  }) => void;
  isProcessing?: boolean;
}

const RefundSaleDialog: React.FC<RefundSaleDialogProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirmRefund,
  isProcessing = false
}) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  if (!sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleItemToggle = (item: SaleItem, checked: boolean) => {
    const newSelectedItems = new Map(selectedItems);
    if (checked) {
      newSelectedItems.set(item.productId, item.quantity);
    } else {
      newSelectedItems.delete(item.productId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleItemQuantityChange = (productId: string, quantity: number) => {
    const newSelectedItems = new Map(selectedItems);
    newSelectedItems.set(productId, quantity);
    setSelectedItems(newSelectedItems);
  };

  const calculatePartialRefundAmount = () => {
    let total = 0;
    sale.items.forEach(item => {
      const selectedQty = selectedItems.get(item.productId);
      if (selectedQty) {
        const itemUnitPrice = item.total / item.quantity;
        total += itemUnitPrice * selectedQty;
      }
    });
    return total;
  };

  const getRefundAmount = () => {
    if (refundType === 'full') {
      return sale.totalAmount - (sale.refundedAmount || 0);
    } else if (refundType === 'partial' && refundAmount) {
      return parseFloat(refundAmount);
    } else {
      return calculatePartialRefundAmount();
    }
  };

  const handleConfirm = () => {
    const refundData: any = {
      saleId: sale.id,
      refundType,
      reason: refundReason,
      notes: refundNotes || undefined
    };

    if (refundType === 'full') {
      refundData.amount = sale.totalAmount - (sale.refundedAmount || 0);
    } else {
      if (selectedItems.size > 0) {
        refundData.items = Array.from(selectedItems.entries()).map(([productId, quantity]) => ({
          productId,
          quantity
        }));
      } else if (refundAmount) {
        refundData.amount = parseFloat(refundAmount);
      }
    }

    onConfirmRefund(refundData);
  };

  const isValid = () => {
    if (!refundReason) return false;
    if (refundType === 'partial') {
      if (selectedItems.size === 0 && !refundAmount) return false;
      if (refundAmount && parseFloat(refundAmount) <= 0) return false;
      if (refundAmount && parseFloat(refundAmount) > (sale.totalAmount - (sale.refundedAmount || 0))) return false;
    }
    return true;
  };

  const resetForm = () => {
    setRefundType('full');
    setRefundAmount('');
    setRefundReason('');
    setRefundNotes('');
    setSelectedItems(new Map());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Refund Sale
          </DialogTitle>
          <DialogDescription>
            Process a refund for sale #{sale.receiptNumber || sale.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sale Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Amount:</span>
              <span className="font-semibold">{formatCurrency(sale.totalAmount)}</span>
            </div>
            {sale.refundedAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Already Refunded:</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(sale.refundedAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-600">Available to Refund:</span>
              <span className="font-bold text-navy">
                {formatCurrency(sale.totalAmount - (sale.refundedAmount || 0))}
              </span>
            </div>
          </div>

          {/* Refund Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Refund Type</Label>
            <RadioGroup value={refundType} onValueChange={(value: any) => setRefundType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Refund - {formatCurrency(sale.totalAmount - (sale.refundedAmount || 0))}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Partial Refund - Select items or enter amount
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Refund Options */}
          {refundType === 'partial' && (
            <div className="space-y-4 border border-gray-200 p-4 rounded-lg">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Items to Refund</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sale.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedItems.has(item.productId)}
                          onCheckedChange={(checked) => handleItemToggle(item, checked as boolean)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(item.total)} ({item.quantity} items)
                          </p>
                        </div>
                      </div>
                      {selectedItems.has(item.productId) && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Qty:</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={selectedItems.get(item.productId)}
                            onChange={(e) => handleItemQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedItems.size > 0 && (
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>Calculated Refund:</span>
                    <span className="text-navy">{formatCurrency(calculatePartialRefundAmount())}</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or enter custom amount</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundAmount" className="text-sm">Custom Refund Amount</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={sale.totalAmount - (sale.refundedAmount || 0)}
                  placeholder="Enter amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={selectedItems.size > 0}
                />
              </div>
            </div>
          )}

          {/* Refund Reason */}
          <div className="space-y-2">
            <Label htmlFor="refundReason" className="text-sm font-semibold">
              Refund Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={refundReason} onValueChange={setRefundReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="defective_product">Defective Product</SelectItem>
                <SelectItem value="wrong_item">Wrong Item Sold</SelectItem>
                <SelectItem value="pricing_error">Pricing Error</SelectItem>
                <SelectItem value="duplicate_sale">Duplicate Sale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="refundNotes" className="text-sm font-semibold">
              Additional Notes
            </Label>
            <Textarea
              id="refundNotes"
              placeholder="Enter any additional notes about this refund..."
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Refund Summary */}
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-orange-900 mb-2">
                  Refund Summary
                </p>
                <div className="space-y-1 text-sm text-orange-800">
                  <p>• Refund amount: <span className="font-bold">{formatCurrency(getRefundAmount())}</span></p>
                  <p>• This action cannot be undone</p>
                  <p>• Inventory will be adjusted automatically</p>
                  <p>• Customer will be notified (if email available)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid() || isProcessing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing ? 'Processing...' : `Confirm Refund ${formatCurrency(getRefundAmount())}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundSaleDialog;
