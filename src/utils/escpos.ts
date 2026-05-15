// ESC/POS command builder for 80mm thermal printers (EPSON / ONIX)
// Star Line command builder for Star TSP100 FuturePRNT
import type { ThermalReceiptData } from './thermalReceipt';

const LINE_WIDTH = 42; // characters per line at standard density on 80mm paper

const ESC = '\x1B';
const GS = '\x1D';

// ESC/POS commands — for EPSON / ONIX printers
const CMD = {
  INIT:         ESC + '@',
  CUT:          GS  + 'V\x42\x03',  // full cut + 3mm feed
  ALIGN_LEFT:   ESC + 'a\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  BOLD_ON:      ESC + 'E\x01',
  BOLD_OFF:     ESC + 'E\x00',
  SIZE_DOUBLE:  GS  + '!\x11',      // double width + height
  SIZE_NORMAL:  GS  + '!\x00',
  LF:           '\n',
  FEED:         ESC + 'd\x04',      // feed 4 lines before cut
};

// Star Line commands — for Star TSP100 FuturePRNT in Star Line mode
// Key differences vs ESC/POS: bold uses ESC E / ESC F (no param), cut uses ESC i,
// double-size uses ESC ! flags, GS commands do not exist in Star Line mode.
const STAR = {
  INIT:         ESC + '@',
  CUT:          ESC + 'd\x03' + ESC + 'i', // feed 3 lines then full cut
  ALIGN_LEFT:   ESC + 'a\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  BOLD_ON:      ESC + 'E',          // ESC E  (no parameter — different from ESC/POS)
  BOLD_OFF:     ESC + 'F',          // ESC F
  SIZE_DOUBLE:  ESC + '!\x30',      // ESC ! 0x30 = double width (0x20) + double height (0x10)
  SIZE_NORMAL:  ESC + '!\x00',
  LF:           '\n',
  FEED:         ESC + 'd\x03',      // feed 3 lines before cut
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque', DIGITAL_WALLET: 'Digital Wallet', INSTALLMENT: 'Installment',
};

function fmt(amount: number | undefined | null): string {
  // 0x23 = '#' which maps to £ when UK NRC (ESC R 3) is active.
  // More universally supported than WPC1252 codepage on clone printers.
  return `\x23${(amount ?? 0).toFixed(2)}`;
}

function divider(): string {
  return '-'.repeat(LINE_WIDTH) + CMD.LF;
}

function padBetween(left: string, right: string): string {
  const gap = LINE_WIDTH - left.length - right.length;
  return left + ' '.repeat(Math.max(1, gap)) + right;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildCopy(data: ThermalReceiptData, copyLabel?: string): string {
  const parts: string[] = [];
  const p = (...s: string[]) => parts.push(...s);

  // ESC R 3 = UK National Replacement Character Set: maps 0x23 (#) → £.
  // Supported by all ESC/POS printers including cheap clones.
  p(CMD.INIT, '\x1B\x52\x03');

  if (copyLabel) {
    p(CMD.ALIGN_CENTER, CMD.BOLD_ON, copyLabel + CMD.LF, CMD.BOLD_OFF);
  }

  // Store name
  p(CMD.ALIGN_CENTER, CMD.SIZE_DOUBLE, data.storeName + CMD.LF, CMD.SIZE_NORMAL);
  if (data.storeAddress) p(data.storeAddress + CMD.LF);
  if (data.storePhone)   p('Tel: ' + data.storePhone + CMD.LF);
  if (data.storeEmail)   p(data.storeEmail + CMD.LF);

  if (data.headerMessage) {
    p(divider());
    for (const line of data.headerMessage.split('\n')) p(line + CMD.LF);
  }

  p(CMD.ALIGN_LEFT, divider());

  // Receipt number
  p(CMD.ALIGN_CENTER, CMD.BOLD_ON, 'RECEIPT: ' + data.receiptNumber + CMD.LF, CMD.BOLD_OFF, CMD.ALIGN_LEFT);

  // Meta
  p(padBetween('Date', formatDate(data.date)) + CMD.LF);
  p(padBetween('Cashier', data.cashierName) + CMD.LF);
  if (data.customerName) p(padBetween('Customer', data.customerName) + CMD.LF);

  p(divider());

  // Items
  for (const item of data.items) {
    const name = item.name.length > 28 ? item.name.slice(0, 28) + '…' : item.name;
    const tag  = item.isRepair ? ' [Repair]' : '';
    p(CMD.BOLD_ON, name + tag + CMD.LF, CMD.BOLD_OFF);
    p(padBetween('  ' + item.quantity + ' x ' + fmt(item.unitPrice), fmt(item.total)) + CMD.LF);
    if (item.discount && item.discount > 0) {
      p(padBetween('  Discount', '-' + fmt(item.discount)) + CMD.LF);
    }
  }

  p(divider());

  // Totals
  p(padBetween('Subtotal', fmt(data.subtotal)) + CMD.LF);
  if (data.discountAmount > 0) p(padBetween('Discount', '-' + fmt(data.discountAmount)) + CMD.LF);
  if (data.taxAmount > 0)      p(padBetween('Tax', fmt(data.taxAmount)) + CMD.LF);
  p(CMD.BOLD_ON, padBetween('TOTAL', fmt(data.totalAmount)) + CMD.LF, CMD.BOLD_OFF);

  p(divider());

  // Payment
  p(padBetween('Payment', PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod) + CMD.LF);
  if (data.cashReceived && data.cashReceived > 0) {
    p(padBetween('Cash Received', fmt(data.cashReceived)) + CMD.LF);
    p(padBetween('Change', fmt(data.change ?? 0)) + CMD.LF);
  }

  p(divider());

  // Footer
  p(CMD.ALIGN_CENTER);
  for (const line of (data.footerMessage ?? 'Thank you for your purchase!').split('\n')) {
    p(line + CMD.LF);
  }

  p(CMD.FEED, CMD.CUT);

  return parts.join('');
}

export function buildEscPos(data: ThermalReceiptData, copies: 1 | 2 = 1): string {
  if (copies >= 2) {
    return buildCopy(data, '--- CUSTOMER COPY ---') + buildCopy(data, '--- MERCHANT COPY ---');
  }
  return buildCopy(data);
}

// Star Line receipt builder — identical logic to buildCopy but uses STAR commands
function buildStarCopy(data: ThermalReceiptData, copyLabel?: string): string {
  const parts: string[] = [];
  const p = (...s: string[]) => parts.push(...s);

  // ESC R 3 = UK National Replacement Character Set: maps 0x23 (#) → £.
  p(STAR.INIT, '\x1B\x52\x03');

  if (copyLabel) {
    p(STAR.ALIGN_CENTER, STAR.BOLD_ON, copyLabel + STAR.LF, STAR.BOLD_OFF);
  }

  p(STAR.ALIGN_CENTER, STAR.SIZE_DOUBLE, data.storeName + STAR.LF, STAR.SIZE_NORMAL);
  if (data.storeAddress) p(data.storeAddress + STAR.LF);
  if (data.storePhone)   p('Tel: ' + data.storePhone + STAR.LF);
  if (data.storeEmail)   p(data.storeEmail + STAR.LF);

  if (data.headerMessage) {
    p('-'.repeat(LINE_WIDTH) + STAR.LF);
    for (const line of data.headerMessage.split('\n')) p(line + STAR.LF);
  }

  p(STAR.ALIGN_LEFT, '-'.repeat(LINE_WIDTH) + STAR.LF);

  p(STAR.ALIGN_CENTER, STAR.BOLD_ON, 'RECEIPT: ' + data.receiptNumber + STAR.LF, STAR.BOLD_OFF, STAR.ALIGN_LEFT);

  p(padBetween('Date', formatDate(data.date)) + STAR.LF);
  p(padBetween('Cashier', data.cashierName) + STAR.LF);
  if (data.customerName) p(padBetween('Customer', data.customerName) + STAR.LF);

  p('-'.repeat(LINE_WIDTH) + STAR.LF);

  for (const item of data.items) {
    const name = item.name.length > 28 ? item.name.slice(0, 28) + '…' : item.name;
    const tag  = item.isRepair ? ' [Repair]' : '';
    p(STAR.BOLD_ON, name + tag + STAR.LF, STAR.BOLD_OFF);
    p(padBetween('  ' + item.quantity + ' x ' + fmt(item.unitPrice), fmt(item.total)) + STAR.LF);
    if (item.discount && item.discount > 0) {
      p(padBetween('  Discount', '-' + fmt(item.discount)) + STAR.LF);
    }
  }

  p('-'.repeat(LINE_WIDTH) + STAR.LF);

  p(padBetween('Subtotal', fmt(data.subtotal)) + STAR.LF);
  if (data.discountAmount > 0) p(padBetween('Discount', '-' + fmt(data.discountAmount)) + STAR.LF);
  if (data.taxAmount > 0)      p(padBetween('Tax', fmt(data.taxAmount)) + STAR.LF);
  p(STAR.BOLD_ON, padBetween('TOTAL', fmt(data.totalAmount)) + STAR.LF, STAR.BOLD_OFF);

  p('-'.repeat(LINE_WIDTH) + STAR.LF);

  p(padBetween('Payment', PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod) + STAR.LF);
  if (data.cashReceived && data.cashReceived > 0) {
    p(padBetween('Cash Received', fmt(data.cashReceived)) + STAR.LF);
    p(padBetween('Change', fmt(data.change ?? 0)) + STAR.LF);
  }

  p('-'.repeat(LINE_WIDTH) + STAR.LF);

  p(STAR.ALIGN_CENTER);
  for (const line of (data.footerMessage ?? 'Thank you for your purchase!').split('\n')) {
    p(line + STAR.LF);
  }

  // BEL (0x07) kicks the DK port *before* the cutter fires — guaranteed to
  // reach the printer because it rides inside the same raw job as the receipt.
  p('\x07', STAR.FEED, STAR.CUT);

  return parts.join('');
}

export function buildStarLine(data: ThermalReceiptData, copies: 1 | 2 = 1): string {
  if (copies >= 2) {
    return buildStarCopy(data, '--- CUSTOMER COPY ---') + buildStarCopy(data, '--- MERCHANT COPY ---');
  }
  return buildStarCopy(data);
}
