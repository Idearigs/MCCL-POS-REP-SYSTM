// Thermal receipt generator — 80mm paper (ONIX / EPSON)
// Printing is done via a hidden iframe so popup blockers never interfere.

export interface ThermalReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  tradingName?: string; // legal entity line e.g. "A trading name of Beeston Jewellers Ltd"
  vatNumber?: string;   // e.g. "275322603" — shown as "VAT No: ..."
  tillNumber?: string;  // outlet code / till ID shown in header row
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
  taxRate?: number;     // percentage, e.g. 20
  totalAmount: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  footerMessage?: string;
}

export type PrinterModel = 'ONIX' | 'EPSON' | 'STAR_TSP100' | 'OTHER';

export interface PrintOptions {
  model?: PrinterModel;
  copies?: 1 | 2;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'CASH',
  CARD: 'CREDIT CARD',
  BANK_TRANSFER: 'BANK TRANSFER',
  CHEQUE: 'CHEQUE',
  DIGITAL_WALLET: 'DIGITAL WALLET',
  INSTALLMENT: 'INSTALLMENT',
};

function fmt(amount: number | undefined | null): string {
  return `£${(amount ?? 0).toFixed(2)}`;
}

// "08-May-2026 09:28" — matches reference receipt date style
function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hh}:${mm}`;
}

function buildCopyHTML(data: ThermalReceiptData, copyLabel?: string): string {
  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod.toUpperCase();
  const itemCount = data.items.reduce((s, i) => s + i.quantity, 0);

  const itemRows = data.items
    .map((item) => {
      const name = item.name.length > 26 ? item.name.slice(0, 26) + '…' : item.name;
      const tag = item.isRepair ? ' [Repair]' : '';
      const qtyPrice = `${item.quantity}@${fmt(item.unitPrice)}`;
      const rows = [`<div class="item-line">
        <span class="item-name">${name}${tag}</span>
        <span class="item-mid">${qtyPrice}</span>
        <span class="item-amt">${fmt(item.total)}</span>
      </div>`];
      if (item.discount && item.discount > 0) {
        rows.push(`<div class="item-disc">Discount: -${fmt(item.discount)}</div>`);
      }
      return rows.join('');
    })
    .join('');

  const discountRow = data.discountAmount > 0
    ? `<div class="row"><span>DISCOUNT</span><span>-${fmt(data.discountAmount)}</span></div>`
    : '';

  const vatRows = (() => {
    if (data.taxAmount <= 0) return '';
    const rate = data.taxRate ?? 20;
    const taxableAmt = data.totalAmount - data.taxAmount;
    return `<hr class="divider"/>
    <table class="vat-tbl"><thead>
      <tr><th>Rate</th><th>Amount</th><th>VAT</th></tr>
    </thead><tbody>
      <tr><td>${rate.toFixed(2)}%</td><td>${fmt(taxableAmt)}</td><td>${fmt(data.taxAmount)}</td></tr>
      <tr><td>0.00%</td><td>${fmt(data.subtotal - taxableAmt)}</td><td>${fmt(0)}</td></tr>
    </tbody></table>`;
  })();

  const changeRows = (data.cashReceived ?? 0) > 0
    ? `<div class="row"><span>${paymentLabel}</span><span>${fmt(data.cashReceived)}</span></div>
       <div class="row"><span>CHANGE DUE</span><span>${fmt(data.change ?? 0)}</span></div>`
    : `<div class="row"><span>${paymentLabel}</span><span>${fmt(data.totalAmount)}</span></div>
       <div class="row"><span>CHANGE DUE</span><span>${fmt(0)}</span></div>`;

  const copyBadge = copyLabel
    ? `<div class="copy-badge">${copyLabel}</div>`
    : '';

  const header = (() => {
    const till = data.tillNumber ?? '01';
    const date = formatDate(data.date);
    const operator = data.cashierName;
    return `<div class="meta-grid">
      <div><div class="meta-lbl">Till</div><div>${till}</div></div>
      <div><div class="meta-lbl">Date &amp; Time</div><div>${date}</div></div>
      <div><div class="meta-lbl">Operator</div><div>${operator}</div></div>
    </div>`;
  })();

  const customerRow = data.customerName
    ? `<div class="row"><span>Customer</span><span>${data.customerName}</span></div>`
    : '';

  return `<div class="receipt-copy">
    ${copyBadge}
    <div class="store-name">${data.storeName.toUpperCase()}</div>
    ${data.tradingName ? `<div class="trading-name">${data.tradingName}</div>` : ''}
    <div class="store-sub">${[
      data.storeAddress,
      data.storePhone,
      data.storeEmail,
      data.vatNumber ? `VAT No: GB ${data.vatNumber}` : null,
    ].filter(Boolean).join('<br>')}</div>

    <hr class="divider"/>
    <div class="center">Receipt - Copy - Sales</div>
    <hr class="divider"/>

    ${header}
    ${customerRow}
    <hr class="divider"/>

    ${itemRows}
    <hr class="divider"/>

    <div class="row"><span>${itemCount} ITEM${itemCount !== 1 ? 'S' : ''} PURCHASED</span></div>
    ${discountRow}
    <div class="total-row"><span>TOTAL</span><span>${fmt(data.totalAmount)}</span></div>

    <hr class="divider"/>

    ${changeRows}

    ${vatRows}

    <hr class="divider"/>
    <div class="footer">${(data.footerMessage ?? 'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE').replace(/\n/g, '<br>')}</div>
  </div>`;
}

export function buildReceiptHTML(data: ThermalReceiptData, options: PrintOptions): string {
  const copies = options.copies ?? 1;

  const copy1 = buildCopyHTML(data, copies > 1 ? 'CUSTOMER COPY' : undefined);
  const copy2 = copies > 1 ? buildCopyHTML(data, 'MERCHANT COPY') : '';
  const cutLine = copies > 1 ? '<div class="cut-line">&#9986; &#x2014; &#x2014; &#x2014; CUT HERE &#x2014; &#x2014; &#x2014; &#9986;</div>' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt ${data.receiptNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 600;
      /* 72mm centered on 80mm paper — 4mm buffer each side prevents right-edge clipping */
      width: 72mm;
      margin: 0 auto;
      color: #000;
      background: #fff;
    }

    .receipt-copy { padding: 3mm 0; }

    .copy-badge {
      text-align: center;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 2px;
      margin-bottom: 2mm;
    }

    .store-name {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5px;
      margin-bottom: 1mm;
    }

    .trading-name {
      font-size: 9.5px;
      text-align: center;
      font-style: italic;
      margin-bottom: 1mm;
    }

    .store-sub {
      font-size: 10px;
      text-align: center;
      line-height: 1.6;
      margin-bottom: 2mm;
    }

    .divider { border: none; border-top: 1px dashed #000; margin: 2mm 0; }

    .center { text-align: center; font-size: 11px; margin: 1mm 0; }

    /* Till / Date / Operator 3-column header */
    .meta-grid {
      display: grid;
      grid-template-columns: 0.6fr 1.4fr 1.4fr;
      font-size: 9.5px;
      gap: 0 2mm;
      margin: 1mm 0;
    }
    .meta-lbl { font-weight: bold; margin-bottom: 0.5mm; }

    /* Item line: name | qty@price | total */
    .item-line {
      display: flex;
      align-items: baseline;
      gap: 2mm;
      margin: 1mm 0;
      font-size: 11px;
    }
    .item-name { font-weight: bold; flex: 1; word-break: break-word; }
    .item-mid  { white-space: nowrap; flex-shrink: 0; }
    .item-amt  { white-space: nowrap; flex-shrink: 0; text-align: right; min-width: 10mm; }
    .item-disc { font-size: 10px; text-align: right; color: #333; }

    /* Generic 2-col row (payment, change, subtotal…) */
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 0.6mm 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
      margin: 1.5mm 0;
    }

    /* VAT breakdown table */
    .vat-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin: 1mm 0;
    }
    .vat-tbl th { font-weight: bold; text-align: left; padding-bottom: 0.5mm; }
    .vat-tbl td { text-align: left; padding: 0.2mm 0; }

    .footer {
      font-size: 10px;
      line-height: 1.6;
      margin-top: 2mm;
      word-wrap: break-word;
    }

    .cut-line {
      text-align: center;
      font-size: 9px;
      color: #555;
      padding: 3mm 0;
    }

    @media print {
      html, body { height: auto !important; overflow: visible !important; }
      .cut-line { color: #000; }
      @page { size: 80mm auto; margin: 0; }
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

// Main entry point — tries QZ Tray (silent, direct ESC/POS) then falls back to iframe
export async function printThermalReceipt(
  data: ThermalReceiptData,
  options: PrintOptions = {},
  printerName?: string,
): Promise<void> {
  if (printerName) {
    try {
      const { printReceiptQZ } = await import('./qzBridge');
      await printReceiptQZ(printerName, data, options);
      return; // success — done, no dialog shown
    } catch (err) {
      console.warn('[ThermalReceipt] QZ Tray failed, falling back to iframe:', err);
    }
  }
  printIframeFallback(data, options);
}

function printIframeFallback(data: ThermalReceiptData, options: PrintOptions): void {
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
