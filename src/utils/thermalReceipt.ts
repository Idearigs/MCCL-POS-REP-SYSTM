// Thermal receipt generator — 80mm paper, window.print()

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

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  DIGITAL_WALLET: 'Digital Wallet',
  INSTALLMENT: 'Installment',
};

function fmt(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function padLine(left: string, right: string, width = 40): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildReceiptHTML(data: ThermalReceiptData): string {
  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;

  const itemRows = data.items.map(item => {
    const nameDisplay = item.name.length > 22 ? item.name.slice(0, 22) + '…' : item.name;
    const qtyPrice = `${item.quantity} x ${fmt(item.unitPrice)}`;
    let html = `
      <div class="item">
        <div class="item-name">${nameDisplay}${item.isRepair ? ' <span class="repair-tag">[Repair]</span>' : ''}</div>
        <div class="item-sub">
          <span class="item-qty">${qtyPrice}</span>
          <span class="item-total">${fmt(item.total)}</span>
        </div>
        ${item.discount && item.discount > 0 ? `<div class="item-discount">Discount: -${fmt(item.discount)}</div>` : ''}
      </div>`;
    return html;
  }).join('');

  const changeRow = data.cashReceived && data.cashReceived > 0 ? `
    <div class="summary-row">
      <span>Cash Received</span>
      <span>${fmt(data.cashReceived)}</span>
    </div>
    <div class="summary-row">
      <span>Change</span>
      <span>${fmt(data.change || 0)}</span>
    </div>` : '';

  const discountRow = data.discountAmount > 0 ? `
    <div class="summary-row">
      <span>Discount</span>
      <span>-${fmt(data.discountAmount)}</span>
    </div>` : '';

  const taxRow = data.taxAmount > 0 ? `
    <div class="summary-row">
      <span>Tax</span>
      <span>${fmt(data.taxAmount)}</span>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
      padding: 3mm 4mm;
    }

    .center { text-align: center; }
    .bold { font-weight: bold; }

    .store-name {
      font-size: 16px;
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

    .payment-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 0.8mm 0;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #333;
      margin-top: 2mm;
      line-height: 1.6;
    }

    @media print {
      body { width: 80mm; }
      @page {
        size: 80mm auto;
        margin: 0;
      }
    }
  </style>
</head>
<body>

  <!-- STORE HEADER -->
  <div class="store-name">${data.storeName}</div>
  ${data.storeAddress || data.storePhone || data.storeEmail ? `
  <div class="store-sub">
    ${data.storeAddress ? `${data.storeAddress}<br>` : ''}
    ${data.storePhone ? `Tel: ${data.storePhone}<br>` : ''}
    ${data.storeEmail ? `${data.storeEmail}` : ''}
  </div>` : ''}

  <hr class="divider" />

  <!-- RECEIPT META -->
  <div class="receipt-number">RECEIPT: ${data.receiptNumber}</div>

  <div class="meta-row">
    <span>Date</span>
    <span>${formatDate(data.date)}</span>
  </div>
  <div class="meta-row">
    <span>Cashier</span>
    <span>${data.cashierName}</span>
  </div>
  ${data.customerName ? `
  <div class="meta-row">
    <span>Customer</span>
    <span>${data.customerName}</span>
  </div>` : ''}

  <hr class="divider" />

  <!-- ITEMS -->
  ${itemRows}

  <hr class="divider" />

  <!-- TOTALS -->
  <div class="summary-row">
    <span>Subtotal</span>
    <span>${fmt(data.subtotal)}</span>
  </div>
  ${discountRow}
  ${taxRow}
  <div class="total-row">
    <span>TOTAL</span>
    <span>${fmt(data.totalAmount)}</span>
  </div>

  <hr class="divider" />

  <!-- PAYMENT -->
  <div class="payment-row">
    <span>Payment</span>
    <span>${paymentLabel}</span>
  </div>
  ${changeRow}

  <hr class="divider" />

  <!-- FOOTER -->
  <div class="footer">
    ${data.footerMessage || 'Thank you for your purchase!<br>Please keep this receipt for your records.'}
  </div>

</body>
</html>`;
}

export function printThermalReceipt(data: ThermalReceiptData): void {
  const html = buildReceiptHTML(data);
  const win = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0,location=0');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Small delay so styles are applied before print dialog
  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 300);
}
