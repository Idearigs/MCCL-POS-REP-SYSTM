// Thermal receipt generator — 80mm paper (ONIX / EPSON)
// Printing is done via a hidden iframe so popup blockers never interfere.

export interface ThermalReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  receiptNumber: string;
  date: string; // ISO string
  cashierName: string;
  customerName?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
    isRepair?: boolean;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  footerMessage?: string;
}

export type PrinterModel = 'ONIX' | 'EPSON' | 'OTHER';

export interface PrintOptions {
  model?: PrinterModel;
  copies?: 1 | 2;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  DIGITAL_WALLET: 'Digital Wallet',
  INSTALLMENT: 'Installment',
};

function fmt(amount: number | undefined | null): string {
  return `£${(amount ?? 0).toFixed(2)}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCopyHTML(data: ThermalReceiptData, copyLabel?: string): string {
  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;

  const itemRows = data.items
    .map((item) => {
      const nameDisplay = item.name.length > 24 ? item.name.slice(0, 24) + '…' : item.name;
      const qtyPrice = `${item.quantity} x ${fmt(item.unitPrice)}`;
      return `
      <div class="item">
        <div class="item-name">${nameDisplay}${item.isRepair ? ' <span class="repair-tag">[Repair]</span>' : ''}</div>
        <div class="item-sub">
          <span>${qtyPrice}</span>
          <span>${fmt(item.total)}</span>
        </div>
        ${item.discount && item.discount > 0 ? `<div class="item-discount">Discount: -${fmt(item.discount)}</div>` : ''}
      </div>`;
    })
    .join('');

  const discountRow =
    data.discountAmount > 0
      ? `<div class="summary-row"><span>Discount</span><span>-${fmt(data.discountAmount)}</span></div>`
      : '';

  const taxRow =
    data.taxAmount > 0
      ? `<div class="summary-row"><span>Tax</span><span>${fmt(data.taxAmount)}</span></div>`
      : '';

  const changeRow =
    data.cashReceived && data.cashReceived > 0
      ? `<div class="summary-row"><span>Cash Received</span><span>${fmt(data.cashReceived)}</span></div>
         <div class="summary-row"><span>Change</span><span>${fmt(data.change ?? 0)}</span></div>`
      : '';

  const copyBadge = copyLabel
    ? `<div class="copy-badge">${copyLabel}</div>`
    : '';

  return `
  <div class="receipt-copy">
    ${copyBadge}

    <div class="store-name">${data.storeName}</div>
    ${data.storeAddress || data.storePhone || data.storeEmail ? `
    <div class="store-sub">
      ${data.storeAddress ? `${data.storeAddress}<br>` : ''}
      ${data.storePhone ? `Tel: ${data.storePhone}<br>` : ''}
      ${data.storeEmail ? `${data.storeEmail}` : ''}
    </div>` : ''}

    <hr class="divider" />

    <div class="receipt-number">RECEIPT: ${data.receiptNumber}</div>

    <div class="meta-row"><span>Date</span><span>${formatDate(data.date)}</span></div>
    <div class="meta-row"><span>Cashier</span><span>${data.cashierName}</span></div>
    ${data.customerName ? `<div class="meta-row"><span>Customer</span><span>${data.customerName}</span></div>` : ''}

    <hr class="divider" />

    ${itemRows}

    <hr class="divider" />

    <div class="summary-row"><span>Subtotal</span><span>${fmt(data.subtotal)}</span></div>
    ${discountRow}
    ${taxRow}
    <div class="total-row"><span>TOTAL</span><span>${fmt(data.totalAmount)}</span></div>

    <hr class="divider" />

    <div class="summary-row"><span>Payment</span><span>${paymentLabel}</span></div>
    ${changeRow}

    <hr class="divider" />

    <div class="footer">${
      data.footerMessage || 'Thank you for your purchase!<br>Please keep this receipt for your records.'
    }</div>
  </div>`;
}

function buildReceiptHTML(data: ThermalReceiptData, options: PrintOptions): string {
  const copies = options.copies ?? 1;

  const copy1 = buildCopyHTML(data, copies > 1 ? 'CUSTOMER COPY' : undefined);
  const copy2 = copies > 1 ? buildCopyHTML(data, 'MERCHANT COPY') : '';
  const cutLine = copies > 1 ? '<div class="cut-line">&#9986; &#x2014; &#x2014; &#x2014; CUT HERE &#x2014; &#x2014; &#x2014; &#9986;</div>' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 80mm;
      max-width: 80mm;
      color: #000;
      background: #fff;
    }

    .receipt-copy {
      width: 80mm;
      padding: 3mm 4mm;
    }

    .copy-badge {
      text-align: center;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #555;
      margin-bottom: 2mm;
    }

    .store-name {
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 1mm;
      letter-spacing: 0.5px;
    }

    .store-sub {
      font-size: 10px;
      text-align: center;
      color: #333;
      line-height: 1.5;
      margin-bottom: 2mm;
    }

    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 2.5mm 0;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 0.8mm 0;
    }

    .receipt-number {
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      margin: 1mm 0;
    }

    .item {
      margin: 1.5mm 0;
    }

    .item-name {
      font-size: 11px;
      font-weight: bold;
      word-break: break-word;
    }

    .repair-tag {
      font-size: 9px;
      font-weight: normal;
      color: #555;
    }

    .item-sub {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #222;
    }

    .item-discount {
      font-size: 10px;
      color: #444;
      text-align: right;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 0.8mm 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
      margin: 1.5mm 0;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #333;
      margin-top: 2mm;
      line-height: 1.6;
    }

    .cut-line {
      text-align: center;
      font-size: 9px;
      letter-spacing: 1px;
      color: #555;
      padding: 3mm 0;
    }

    @media print {
      body { width: 80mm; }
      .cut-line { color: #000; }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${copy1}
  ${cutLine}
  ${copy2}
</body>
</html>`;
}

export function printThermalReceipt(
  data: ThermalReceiptData,
  options: PrintOptions = {},
): void {
  const html = buildReceiptHTML(data, options);

  // Iframe approach — works without popup permissions.
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);
  };

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe unavailable');

    doc.open();
    doc.write(html);
    doc.close();

    // Small delay so styles are parsed before print fires
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        cleanup();
      }
    }, 280);
  } catch {
    // Fallback: popup window
    cleanup();
    const win = window.open('', '_blank', 'width=420,height=640,toolbar=0,menubar=0,location=0');
    if (!win) {
      alert('Unable to open print window. Please allow pop-ups for this site to print receipts.');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 300);
  }
}
