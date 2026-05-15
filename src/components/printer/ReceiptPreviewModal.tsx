import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildReceiptHTML } from '@/utils/thermalReceipt';
import type { ThermalReceiptData, PrintOptions } from '@/utils/thermalReceipt';

interface Props {
  open: boolean;
  onClose: () => void;
  storeName: string;
  tradingName?: string;
  storeAddress?: string;
  storePhone?: string;
  vatNumber?: string;
  headerText?: string;
  footerText?: string;
  model: PrintOptions['model'];
  copies: 1 | 2;
}

const SAMPLE_DATA = (p: Omit<Props, 'open' | 'onClose' | 'model' | 'copies'>): ThermalReceiptData => ({
  storeName: p.storeName || 'Store Name',
  tradingName: p.tradingName,
  storeAddress: p.storeAddress,
  storePhone: p.storePhone,
  vatNumber: p.vatNumber,
  tillNumber: '01',
  receiptNumber: 'PREVIEW-001',
  date: new Date().toISOString(),
  cashierName: 'Staff',
  customerName: 'Sample Customer',
  items: [
    { name: 'Gold Ring 18ct', quantity: 1, unitPrice: 125.00, total: 125.00 },
    { name: 'Silver Chain 20"', quantity: 1, unitPrice: 45.00, total: 45.00 },
    { name: 'Watch Battery', quantity: 2, unitPrice: 5.00, total: 10.00 },
  ],
  subtotal: 180.00,
  discountAmount: 0,
  taxAmount: 30.00,
  taxRate: 20,
  totalAmount: 180.00,
  paymentMethod: 'CASH',
  cashReceived: 200.00,
  change: 20.00,
  headerMessage: p.headerText || undefined,
  footerMessage: p.footerText,
});

export function ReceiptPreviewModal({
  open,
  onClose,
  model,
  copies,
  ...rest
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open || !iframeRef.current) return;
    const html = buildReceiptHTML(SAMPLE_DATA(rest), { model, copies });
    const doc = iframeRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rest.storeName, rest.tradingName, rest.storeAddress, rest.storePhone,
      rest.vatNumber, rest.headerText, rest.footerText, model, copies]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-row items-center justify-between space-y-0 border-b">
          <DialogTitle className="text-base">Receipt Preview</DialogTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="bg-gray-100 p-4 overflow-y-auto flex justify-center" style={{ maxHeight: 'calc(90vh - 72px)' }}>
          <div className="bg-white shadow-md" style={{ width: '80mm' }}>
            <iframe
              ref={iframeRef}
              title="Receipt Preview"
              style={{ width: '80mm', height: '600px', border: 'none', display: 'block' }}
              scrolling="no"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
