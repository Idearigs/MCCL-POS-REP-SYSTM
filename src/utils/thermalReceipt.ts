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
  headerMessage?: string;
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
      if (item.sku) {
        rows.push(`<div class="item-disc">SKU: ${item.sku}</div>`);
      }
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
      <div style="grid-column:1/-1"><div class="meta-lbl">Receipt No.</div><div><strong>${data.receiptNumber}</strong></div></div>
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

    ${data.headerMessage ? `<hr class="divider"/><div class="header-msg">${data.headerMessage.replace(/\n/g, '<br>')}</div>` : ''}
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

    .header-msg {
      font-size: 10px;
      text-align: center;
      line-height: 1.6;
      margin: 1mm 0;
      word-wrap: break-word;
    }

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

// ─── Petty Cash Receipt ───────────────────────────────────────────────────────

export interface PettyCashReceiptData {
  storeName: string;
  tradingName?: string;
  storeAddress?: string;
  storePhone?: string;
  vatNumber?: string;
  receiptNumber: string;
  date: string; // ISO
  cashierName: string; // staff member who raised the expense
  accountName?: string; // petty cash account name
  category: string; // e.g. "OFFICE_SUPPLIES"
  description: string;
  vendor?: string;
  amount: number;
  notes?: string;
  headerMessage?: string; // from receiptTypes.pettyCash.headerText
  footerMessage?: string; // from receiptTypes.pettyCash.footerText
}

export function buildPettyCashReceiptHTML(data: PettyCashReceiptData): string {
  const d = new Date(data.date);
  const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const categoryLabel = data.category.replace(/_/g, ' ');
  const footer = data.footerMessage
    || 'Authorised signature: ___________\nKEEP THIS VOUCHER FOR YOUR RECORDS';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Petty Cash Receipt ${data.receiptNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 600;
      width: 72mm;
      margin: 0 auto;
      color: #000;
      background: #fff;
      padding: 3mm 0;
    }

    .title {
      font-size: 15px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 3mm;
    }

    .section-label {
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5mm;
    }

    .section-value {
      font-size: 11px;
      margin-bottom: 1mm;
      font-weight: 600;
    }

    .divider { border: none; border-top: 1px dashed #000; margin: 2.5mm 0; }

    .section-heading {
      font-size: 11px;
      font-weight: bold;
      margin: 2mm 0 1.5mm;
      text-decoration: underline;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      padding: 1.2mm 0;
      border-bottom: 1px solid #ccc;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #333; flex: 0 0 40%; }
    .detail-value { text-align: right; flex: 0 0 58%; font-weight: bold; word-break: break-word; }

    .amount-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
      margin: 2mm 0;
      padding: 1.5mm 0;
    }

    .footer {
      font-size: 10px;
      line-height: 1.6;
      margin-top: 2mm;
      text-align: center;
    }

    ${data.notes ? `.notes {
      font-size: 10px;
      margin: 1.5mm 0;
      font-style: italic;
    }` : ''}

    @media print {
      html, body { height: auto !important; overflow: visible !important; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="title">Petty Cash Receipt</div>

  <div class="section-label">Business Name:</div>
  <div class="section-value">${data.storeName}</div>
  ${data.tradingName ? `<div class="section-value">Trading as ${data.tradingName.replace(/^A trading name of\s*/i, '')}</div>` : ''}

  ${data.storeAddress ? `<div class="section-label" style="margin-top:2mm">Address:</div>
  <div class="section-value">${data.storeAddress.replace(/\n/g, ', ')}</div>` : ''}

  ${data.storePhone ? `<div class="section-value">Tel: ${data.storePhone}</div>` : ''}
  ${data.vatNumber ? `<div class="section-value">VAT No: ${data.vatNumber}</div>` : ''}

  <hr class="divider"/>

  <div class="section-heading">Receipt Details</div>
  <div class="detail-row"><span class="detail-label">Receipt No.</span><span class="detail-value">${data.receiptNumber}</span></div>
  <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
  <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeStr}</span></div>
  <div class="detail-row"><span class="detail-label">Staff Member</span><span class="detail-value">${data.cashierName}</span></div>
  ${data.accountName ? `<div class="detail-row"><span class="detail-label">Account</span><span class="detail-value">${data.accountName}</span></div>` : ''}

  <hr class="divider"/>

  <div class="section-heading">Expense Details</div>
  <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${categoryLabel}</span></div>
  <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${data.description}</span></div>
  ${data.vendor ? `<div class="detail-row"><span class="detail-label">Vendor</span><span class="detail-value">${data.vendor}</span></div>` : ''}
  ${data.notes ? `<div class="notes">Note: ${data.notes}</div>` : ''}

  <hr class="divider"/>

  <div class="amount-row"><span>AMOUNT PAID</span><span>£${data.amount.toFixed(2)}</span></div>

  <hr class="divider"/>

  <div class="footer">${footer.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
}

export async function printPettyCashReceipt(
  data: PettyCashReceiptData,
  printerName?: string,
  _model?: PrintOptions['model'],
): Promise<void> {
  // Always use the HTML layout — raw ESC/POS would double-print the store header.
  // Try QZ Tray HTML path first (no browser dialog), fall back to iframe.
  const html = buildPettyCashReceiptHTML(data);
  if (printerName) {
    try {
      const { printHtmlViaQZ } = await import('./qzBridge');
      await printHtmlViaQZ(printerName, html);
      return;
    } catch {
      // fall through to iframe
    }
  }
  // iframe fallback — browser print dialog
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  const cleanup = () => setTimeout(() => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  }, 2000);
  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe unavailable');
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
      finally { cleanup(); }
    }, 280);
  } catch {
    cleanup();
    const win = window.open('', '_blank', 'width=420,height=640,toolbar=0,menubar=0,location=0');
    if (!win) { alert('Allow pop-ups to print receipts.'); return; }
    win.document.write(html); win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
  }
}

// Main entry point — tries QZ Tray HTML path (one job, no double-print) then
// falls back to the browser iframe print dialog.
// Raw ESC/POS was removed: QZ would spool the raw bytes successfully but then
// throw, causing both the raw receipt AND the iframe HTML to print.
export async function printThermalReceipt(
  data: ThermalReceiptData,
  options: PrintOptions = {},
  printerName?: string,
): Promise<void> {
  if (printerName) {
    try {
      const { printHtmlViaQZ } = await import('./qzBridge');
      const html = buildReceiptHTML(data, options);
      await printHtmlViaQZ(printerName, html);
      return; // success — done, no dialog shown
    } catch (err) {
      console.warn('[ThermalReceipt] QZ Tray failed, falling back to iframe:', err);
    }
  }
  printIframeFallback(data, options);
}

// ─── Shift Summary (thermal) ──────────────────────────────────────────────────

export interface ShiftSummaryData {
  storeName: string;
  shiftNumber: string;
  cashierName: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  openingFloat: number;
  closingFloat: number;
  totalSales: number;
  totalRevenue: number;
  paymentBreakdown: Record<string, number>;
  totalDiscount: number;
  totalTax: number;
  variance: number;
  // ── Z-report extras (all optional; legacy callers still work) ──
  storeAddress?: string;     // newline-separated
  storePhone?: string;
  vatNumber?: string;
  companyRegNumber?: string;
  registerId?: string;
  expectedCash?: number;
  declaredCash?: number;
  // Aggregate tender matrix — printed even when £0
  cashSales?: number;
  cardSales?: number;
  giftCardSales?: number;
  layawayDeposits?: number;
  // Cash movements
  payIns?: number;
  payOuts?: number;
  // Department subtotals (e.g. Retail / Repair Services / Scrap Trade-Ins)
  departments?: { name: string; itemCount: number; salesAmount: number }[];
  managerName?: string;
}

export async function printShiftSummaryThermal(
  data: ShiftSummaryData,
  printerName?: string,
): Promise<void> {
  function fmtMoney(v: number) { return `£${(v ?? 0).toFixed(2)}`; }
  // Money shown as a deduction: prefix '-' only for a real (non-zero) amount,
  // so a zero never prints as "-£0.00".
  function fmtNeg(v: number) { return (v ?? 0) > 0 ? `-${fmtMoney(v)}` : fmtMoney(0); }
  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  const esc = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const varianceClass = data.variance >= 0 ? 'color:#166534' : 'color:#991b1b';

  // Legal header block
  const addressLines = (data.storeAddress || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<div class="sub">${esc(l)}</div>`)
    .join('');
  const legalRows = [
    data.storePhone ? `<div class="sub">Tel: ${esc(data.storePhone)}</div>` : '',
    data.vatNumber ? `<div class="sub">VAT No: ${esc(data.vatNumber)}</div>` : '',
    data.companyRegNumber ? `<div class="sub">Company Reg: ${esc(data.companyRegNumber)}</div>` : '',
  ].join('');

  // Comprehensive payment matrix — always print all four tender types
  const cash = data.cashSales ?? data.paymentBreakdown?.CASH ?? 0;
  const card = data.cardSales ?? data.paymentBreakdown?.CARD ?? 0;
  const giftCard = data.giftCardSales ?? 0;
  const layaway = data.layawayDeposits ?? 0;
  const paymentMatrix = [
    ['Cash', cash],
    ['Card', card],
    ['Gift Card', giftCard],
    ['Layaway', layaway],
  ]
    .map(([label, amount]) =>
      `<div class="row"><span>${label}</span><span>${fmtMoney(amount as number)}</span></div>`)
    .join('');

  // Department subtotals
  const deptRows = (data.departments && data.departments.length > 0)
    ? data.departments
        .map((d) =>
          `<div class="row"><span>${esc(d.name)} (${d.itemCount})</span><span>${fmtMoney(d.salesAmount)}</span></div>`)
        .join('')
    : '';

  const expected = data.expectedCash ?? data.closingFloat;
  const declared = data.declaredCash ?? data.closingFloat;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Z-Report ${data.shiftNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:11px; font-weight:600; width:72mm; margin:0 auto; color:#000; background:#fff; padding:3mm 0; }
  .center { text-align:center; }
  .title { font-size:14px; font-weight:900; text-align:center; margin-bottom:2px; }
  .sub { font-size:10px; text-align:center; color:#333; }
  hr { border:none; border-top:1px dashed #333; margin:4px 0; }
  .row { display:flex; justify-content:space-between; padding:1px 0; }
  .total-row { display:flex; justify-content:space-between; font-size:13px; font-weight:900; padding:2px 0; }
  .section { font-size:10px; font-weight:900; margin:3px 0 1px; text-transform:uppercase; letter-spacing:.5px; }
  .sign { margin-top:14px; }
  .sign-line { border-top:1px dotted #000; margin-top:18px; font-size:9px; padding-top:2px; }
</style></head><body>
  <div class="title">${esc(data.storeName.toUpperCase())}</div>
  ${addressLines}
  ${legalRows}
  <hr/>
  <div class="sub" style="font-weight:900;">Z-READ — END OF SHIFT REPORT</div>
  <div class="row"><span>Register/Till</span><span>${esc(data.registerId || '1')}</span></div>
  <div class="row"><span>Shift No.</span><span>${esc(data.shiftNumber)}</span></div>
  <div class="row"><span>Cashier</span><span>${esc(data.cashierName)}</span></div>
  <div class="row"><span>Start</span><span>${fmtDate(data.startTime)}</span></div>
  <div class="row"><span>End</span><span>${fmtDate(data.endTime)}</span></div>
  <hr/>
  <div class="section">Float Audit</div>
  <div class="row"><span>Opening Float</span><span>${fmtMoney(data.openingFloat)}</span></div>
  <div class="row"><span>Expected Cash</span><span>${fmtMoney(expected)}</span></div>
  <div class="row"><span>Declared Cash</span><span>${fmtMoney(declared)}</span></div>
  <div class="row" style="${varianceClass}"><span>Variance</span><span>${data.variance >= 0 ? '+' : ''}${fmtMoney(data.variance)}</span></div>
  <hr/>
  <div class="section">Sales Summary</div>
  <div class="row"><span>Total Transactions</span><span>${data.totalSales}</span></div>
  <div class="row"><span>Total Discount</span><span>${fmtNeg(data.totalDiscount)}</span></div>
  <div class="row"><span>Total Tax</span><span>${fmtMoney(data.totalTax)}</span></div>
  <div class="total-row"><span>TOTAL REVENUE</span><span>${fmtMoney(data.totalRevenue)}</span></div>
  ${deptRows ? `<hr/><div class="section">Departments</div>${deptRows}` : ''}
  <hr/>
  <div class="section">Payment Matrix</div>
  ${paymentMatrix}
  <hr/>
  <div class="section">Cash Movements</div>
  <div class="row"><span>Pay-Ins</span><span>${fmtMoney(data.payIns ?? 0)}</span></div>
  <div class="row"><span>Pay-Outs</span><span>${fmtNeg(data.payOuts ?? 0)}</span></div>
  <hr/>
  <div class="sign">
    <div class="sign-line">Cashier Signature</div>
    <div class="sign-line">Manager Signature</div>
  </div>
  <div class="center" style="font-size:10px;margin-top:8px;">End of Z-Report</div>
</body></html>`;

  if (printerName) {
    try {
      const { printHtmlViaQZ } = await import('./qzBridge');
      await printHtmlViaQZ(printerName, html);
      return;
    } catch {
      // fall through
    }
  }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  const cleanup = () => setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('no iframe');
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } finally { cleanup(); } }, 280);
  } catch {
    cleanup();
  }
}

/**
 * Group a shift report's completed sale line items into department subtotals
 * (by product category) for the Z-report. Items with no category fall under
 * "Other".
 */
export function buildDepartmentsFromShiftReport(
  sales: Array<{
    sale_items: Array<{
      quantity: number;
      totalPrice?: number;
      unitPrice?: number;
      products?: { categories?: { name: string } | null } | null;
    }>;
  }>,
): { name: string; itemCount: number; salesAmount: number }[] {
  const map = new Map<string, { name: string; itemCount: number; salesAmount: number }>();
  (sales || []).forEach((sale) => {
    (sale.sale_items || []).forEach((item) => {
      const name = item.products?.categories?.name || 'Other';
      const qty = Number(item.quantity ?? 0);
      const amount = Number(
        item.totalPrice ?? (item.unitPrice ?? 0) * qty,
      );
      const cur = map.get(name) || { name, itemCount: 0, salesAmount: 0 };
      cur.itemCount += qty;
      cur.salesAmount += amount;
      map.set(name, cur);
    });
  });
  return Array.from(map.values()).sort((a, b) => b.salesAmount - a.salesAmount);
}

export interface DetailedJournalEntry {
  time: string;        // ISO
  saleNumber: string;
  productName: string;
  sku?: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
  customerName?: string;
}

export interface DetailedJournalData {
  storeName: string;
  shiftNumber: string;
  cashierName: string;
  registerId?: string;
  rangeLabel: string;  // e.g. "01 Jun 25 – 02 Jun 25"
  entries: DetailedJournalEntry[];
}

/**
 * Print a line-by-line chronological journal of every transaction for a shift
 * (deep audit). Unlike the Z-report this lists individual line items.
 */
export async function printDetailedJournal(
  data: DetailedJournalData,
  printerName?: string,
): Promise<void> {
  const fmtMoney = (v: number) => `£${(v ?? 0).toFixed(2)}`;
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  const esc = (s: string) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const total = data.entries.reduce((s, e) => s + (e.amount || 0), 0);

  const rows = data.entries.length
    ? data.entries
        .map(
          (e) => `
  <div class="je">
    <div class="row"><span>${fmtTime(e.time)}</span><span>${esc(e.saleNumber)}</span></div>
    <div class="row"><span class="prod">${esc(e.productName)}${e.sku ? ` <span class="sku">[${esc(e.sku)}]</span>` : ''} ×${e.quantity}</span><span>${fmtMoney(e.amount)}</span></div>
    <div class="meta">${esc(e.paymentMethod)}${e.customerName ? ` · ${esc(e.customerName)}` : ''}</div>
  </div>`,
        )
        .join('')
    : '<div class="center">No transactions in this period</div>';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Journal ${esc(data.shiftNumber)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:10px; font-weight:600; width:72mm; margin:0 auto; color:#000; background:#fff; padding:3mm 0; }
  .center { text-align:center; }
  .title { font-size:13px; font-weight:900; text-align:center; }
  .sub { font-size:9px; text-align:center; color:#333; }
  hr { border:none; border-top:1px dashed #333; margin:4px 0; }
  .row { display:flex; justify-content:space-between; }
  .je { padding:2px 0; border-bottom:1px dotted #ccc; }
  .prod { max-width:48mm; }
  .sku { color:#555; font-size:9px; }
  .meta { font-size:9px; color:#555; }
  .total-row { display:flex; justify-content:space-between; font-size:12px; font-weight:900; padding-top:3px; }
</style></head><body>
  <div class="title">${esc(data.storeName.toUpperCase())}</div>
  <div class="sub">DETAILED TRANSACTION JOURNAL</div>
  <hr/>
  <div class="row"><span>Register/Till</span><span>${esc(data.registerId || '1')}</span></div>
  <div class="row"><span>Shift No.</span><span>${esc(data.shiftNumber)}</span></div>
  <div class="row"><span>Cashier</span><span>${esc(data.cashierName)}</span></div>
  <div class="row"><span>Period</span><span>${esc(data.rangeLabel)}</span></div>
  <hr/>
  ${rows}
  <div class="total-row"><span>TOTAL (${data.entries.length})</span><span>${fmtMoney(total)}</span></div>
  <hr/>
  <div class="center" style="font-size:9px;">End of Journal</div>
</body></html>`;

  if (printerName) {
    try {
      const { printHtmlViaQZ } = await import('./qzBridge');
      await printHtmlViaQZ(printerName, html);
      return;
    } catch {
      // fall through to iframe
    }
  }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);
  const cleanup = () => setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error('no iframe');
    doc.open(); doc.write(html); doc.close();
    setTimeout(() => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } finally { cleanup(); } }, 280);
  } catch {
    cleanup();
  }
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
