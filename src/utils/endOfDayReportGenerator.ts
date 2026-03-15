import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export interface EndOfDayReportData {
  // Shop Details
  shopName: string;
  shopAddress: string[];
  shopEmail: string;

  // Report Meta
  tillNo: string;
  operator: string;
  operatorId: string;
  dateFrom: string;
  dateTo: string;

  // Payment Types
  payments: {
    creditCard: { count: number; amount: number };
    debitCard: { count: number; amount: number };
    cash: { count: number; amount: number };
    voucher: { count: number; amount: number };
    other: { count: number; amount: number };
  };

  // Cash in Till
  cashDetails: {
    floatAmount: number;
    totalCash: number;
    returns: number;
    staffing: number;
    payout: { count: number; amount: number };
    payIn: { count: number; amount: number };
    cashLift: { count: number; amount: number };
    cashback: { count: number; amount: number };
    accountPay: { count: number; amount: number };
    tillDifference: number;
  };

  // Department Sales
  departments: Array<{
    name: string;
    itemCount: number;
    refundAmount: number;
    salesAmount: number;
  }>;

  // VAT Breakdown
  vatBreakdown: Array<{
    rate: string;
    vatAmount: number;
    totalAmount: number;
  }>;

  // Exceptions
  exceptions: {
    totalSales: { count: number; amount: number };
    xReading: number;
    noSale: number;
    promotions: { count: number; amount: number };
    voids: { count: number; items: number; amount: number };
  };

  // Void Details
  voidDetails: Array<{
    product: string;
    items: number;
    amount: number;
  }>;

  // Sales Discounts
  discounts: Array<{
    time: string;
    total: number;
    discount: number;
  }>;
  discountTotal: number;

  // Hourly Sales
  hourlySales: Array<{
    hour: string;
    items: number;
    refund: number;
    sales: number;
  }>;

  // Additional sections
  promotionDetails: Array<{
    promotion: string;
    count: number;
    discount: number;
  }>;

  staffingDetails: Array<{
    product: string;
    items: number;
    amount: number;
  }>;

  deliveryDetails: Array<{
    customer: string;
    items: number;
    sales: number;
  }>;

  accountPayments: Array<{
    account: string;
    name: string;
    balance: number;
    amount: number;
  }>;
}

// Generate the report as a text-based receipt
export const generateEndOfDayReportText = (data: EndOfDayReportData): string => {
  const lines: string[] = [];
  const width = 41; // Character width for the receipt

  // Helper functions
  const centerText = (text: string) => {
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  };

  const divider = () => '-'.repeat(width);

  const leftRight = (left: string, right: string) => {
    const spaces = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, spaces)) + right;
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Shop Header
  lines.push('Shop');
  data.shopAddress.forEach(line => lines.push(line));
  lines.push(data.shopEmail);
  lines.push('');

  // Title
  lines.push(leftRight(`Till No ${data.tillNo}`, 'Shift End Report'));
  lines.push(leftRight('Operator:', data.operatorId));
  lines.push(leftRight('From:', data.dateFrom));
  lines.push(leftRight('To:', data.dateTo));
  lines.push(divider());
  lines.push('');

  // Payment Types
  lines.push(leftRight('Type', leftRight('No', 'Amount')));
  lines.push(leftRight('Credit Card', leftRight(
    data.payments.creditCard.count.toString(),
    formatCurrency(data.payments.creditCard.amount)
  )));
  lines.push(leftRight('Debit Card', leftRight(
    data.payments.debitCard.count.toString(),
    formatCurrency(data.payments.debitCard.amount)
  )));
  lines.push(leftRight('Cash', leftRight(
    data.payments.cash.count.toString(),
    formatCurrency(data.payments.cash.amount)
  )));
  lines.push(leftRight('Voucher', leftRight(
    data.payments.voucher.count.toString(),
    formatCurrency(data.payments.voucher.amount)
  )));
  if (data.payments.other.amount > 0) {
    lines.push(leftRight('Other', leftRight(
      data.payments.other.count.toString(),
      formatCurrency(data.payments.other.amount)
    )));
  }
  lines.push(leftRight('Cashback', formatCurrency(data.cashDetails.cashback.amount)));
  lines.push(divider());

  const totalPayments =
    data.payments.creditCard.amount +
    data.payments.debitCard.amount +
    data.payments.cash.amount +
    data.payments.voucher.amount +
    data.payments.other.amount;
  lines.push(leftRight('Total', formatCurrency(totalPayments)));
  lines.push(divider());
  lines.push('');

  // Cash in the Till
  lines.push('Cash in the Till');
  lines.push(leftRight('Float Amount', formatCurrency(data.cashDetails.floatAmount)));
  lines.push('');
  lines.push(leftRight('Total', formatCurrency(data.cashDetails.totalCash)));
  lines.push(leftRight('Returns', formatCurrency(data.cashDetails.returns)));
  lines.push(leftRight('Staffing', formatCurrency(data.cashDetails.staffing)));
  lines.push(leftRight('Payout', leftRight(
    data.cashDetails.payout.count.toString(),
    formatCurrency(-data.cashDetails.payout.amount)
  )));
  lines.push(leftRight('Pay In', leftRight(
    data.cashDetails.payIn.count.toString(),
    formatCurrency(data.cashDetails.payIn.amount)
  )));
  lines.push(leftRight('Cash Lift', leftRight(
    data.cashDetails.cashLift.count.toString(),
    formatCurrency(-data.cashDetails.cashLift.amount)
  )));
  lines.push(leftRight('Cashback', leftRight(
    data.cashDetails.cashback.count.toString(),
    formatCurrency(-data.cashDetails.cashback.amount)
  )));
  lines.push(leftRight('Account Pay', leftRight(
    data.cashDetails.accountPay.count.toString(),
    formatCurrency(data.cashDetails.accountPay.amount)
  )));
  lines.push('');
  lines.push(leftRight('Till Difference', formatCurrency(data.cashDetails.tillDifference)));
  lines.push(divider());
  lines.push('');

  // Department Sales
  lines.push(leftRight('Department', leftRight('Item', leftRight('Refund', 'Sales'))));
  data.departments.forEach(dept => {
    const deptName = dept.name.length > 20 ? dept.name.substring(0, 17) + '...' : dept.name;
    lines.push(leftRight(deptName, leftRight(
      dept.itemCount.toString(),
      leftRight(formatCurrency(dept.refundAmount), formatCurrency(dept.salesAmount))
    )));
  });
  lines.push(divider());
  lines.push(leftRight('Sub Total 1', formatCurrency(totalPayments)));
  lines.push('');
  lines.push(divider());
  lines.push(leftRight('Total', formatCurrency(totalPayments)));
  lines.push(divider());
  lines.push('');

  // VAT Breakdown
  lines.push(leftRight('VAT Code', leftRight('Rate', leftRight('VAT', 'Amount'))));
  data.vatBreakdown.forEach(vat => {
    lines.push(leftRight('', leftRight(vat.rate, leftRight(
      formatCurrency(vat.vatAmount),
      formatCurrency(vat.totalAmount)
    ))));
  });
  lines.push(divider());
  const totalVAT = data.vatBreakdown.reduce((sum, v) => sum + v.vatAmount, 0);
  const totalWithVAT = data.vatBreakdown.reduce((sum, v) => sum + v.totalAmount, 0);
  lines.push(leftRight('VAT Total', leftRight(
    formatCurrency(totalVAT),
    formatCurrency(totalWithVAT)
  )));
  lines.push(divider());
  lines.push('');

  // Exceptions
  lines.push(leftRight('Exceptions', leftRight('No', leftRight('Items', 'Amount'))));
  lines.push(leftRight('Tot Sales', leftRight(
    data.exceptions.totalSales.count.toString(),
    formatCurrency(data.exceptions.totalSales.amount)
  )));
  lines.push(leftRight('No Of XReading', data.exceptions.xReading.toString()));
  lines.push(leftRight('No Of NoSale', data.exceptions.noSale.toString()));
  lines.push(leftRight('Promotions', leftRight(
    data.exceptions.promotions.count.toString(),
    formatCurrency(data.exceptions.promotions.amount)
  )));
  lines.push(leftRight('No Of Void', leftRight(
    data.exceptions.voids.count.toString(),
    leftRight(data.exceptions.voids.items.toString(), formatCurrency(data.exceptions.voids.amount))
  )));
  lines.push(divider());
  lines.push('');

  // Void Details
  if (data.voidDetails.length > 0) {
    lines.push('Void Details');
    lines.push(leftRight('Product', leftRight('Item', 'Amount')));
    data.voidDetails.forEach(item => {
      const productName = item.product.length > 20 ? item.product.substring(0, 17) + '...' : item.product;
      lines.push(leftRight(productName, leftRight(
        item.items.toString(),
        formatCurrency(item.amount)
      )));
    });
    lines.push(divider());
    lines.push('');
  }

  // Sales Discount Details
  if (data.discounts.length > 0) {
    lines.push('Sales Discount Details');
    lines.push(leftRight('Time', leftRight('Total', 'Discount')));
    data.discounts.forEach(disc => {
      lines.push(leftRight(disc.time, leftRight(
        formatCurrency(disc.total),
        formatCurrency(disc.discount)
      )));
    });
    lines.push(divider());
    lines.push(leftRight('Discount Total', formatCurrency(data.discountTotal)));
    lines.push(divider());
    lines.push('');
  }

  // Hourly Sales Details
  if (data.hourlySales.length > 0) {
    lines.push('Hourly Sales Details');
    lines.push(leftRight('Sale Hour', leftRight('Items', leftRight('Refund', 'Sales'))));
    data.hourlySales.forEach(hour => {
      lines.push(leftRight(hour.hour, leftRight(
        hour.items.toString(),
        leftRight(formatCurrency(hour.refund), formatCurrency(hour.sales))
      )));
    });
    lines.push(divider());
    lines.push('');
  }

  // Payout
  lines.push('Payout' + ' '.repeat(width - 6 - 6) + 'Amount');
  lines.push(divider());

  // Promotion Details
  if (data.promotionDetails.length > 0) {
    lines.push('Promotion Details');
    lines.push(leftRight('Promotion', leftRight('Count', 'Discount')));
    data.promotionDetails.forEach(promo => {
      const promoName = promo.promotion.length > 20 ? promo.promotion.substring(0, 17) + '...' : promo.promotion;
      lines.push(leftRight(promoName, leftRight(
        promo.count.toString(),
        formatCurrency(promo.discount)
      )));
    });
    lines.push(divider());
  }

  // Staffing Details
  if (data.staffingDetails.length > 0) {
    lines.push('Staffing Details');
    lines.push(leftRight('Product', leftRight('Item', 'Amount')));
    data.staffingDetails.forEach(item => {
      const productName = item.product.length > 20 ? item.product.substring(0, 17) + '...' : item.product;
      lines.push(leftRight(productName, leftRight(
        item.items.toString(),
        formatCurrency(item.amount)
      )));
    });
    lines.push(divider());
  }

  // Delivery Details
  if (data.deliveryDetails.length > 0) {
    lines.push('Delivery Details');
    lines.push(leftRight('Customer', leftRight('Items', 'Sales')));
    data.deliveryDetails.forEach(delivery => {
      const customerName = delivery.customer.length > 20 ? delivery.customer.substring(0, 17) + '...' : delivery.customer;
      lines.push(leftRight(customerName, leftRight(
        delivery.items.toString(),
        formatCurrency(delivery.sales)
      )));
    });
    lines.push(divider());
  }

  // Take Away Details (placeholder)
  lines.push('Take Away Details');
  lines.push(leftRight('Customer', leftRight('Items', 'Sales')));
  lines.push(divider());

  // Sales By Sub Department
  lines.push('Sales By Sub Department');
  lines.push(leftRight('Name', leftRight('Count', 'Amount')));
  lines.push(divider());

  // Account Payment Details
  if (data.accountPayments.length > 0) {
    lines.push('Account Payment Detail');
    lines.push(leftRight('Acc', leftRight('Name', leftRight('Balance', 'Amount'))));
    data.accountPayments.forEach(acc => {
      const name = acc.name.length > 15 ? acc.name.substring(0, 12) + '...' : acc.name;
      lines.push(leftRight(acc.account, leftRight(
        name,
        leftRight(formatCurrency(acc.balance), formatCurrency(acc.amount))
      )));
    });
    lines.push(divider());
  }

  // Footer
  lines.push('');
  lines.push('*'.repeat(width));
  lines.push(centerText('Powered By MCCL POS System'));

  return lines.join('\n');
};

// Download the report as a text file
export const downloadEndOfDayReport = (data: EndOfDayReportData, filename?: string) => {
  const reportText = generateEndOfDayReportText(data);
  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `shift_end_report_${data.tillNo}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Print the report
export const printEndOfDayReport = (data: EndOfDayReportData) => {
  const reportText = generateEndOfDayReportText(data);
  const printWindow = window.open('', '', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write('<html><head><title>Shift End Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: "Courier New", monospace; font-size: 12px; white-space: pre; padding: 20px; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(reportText);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
};

// Send report via email (placeholder - would need backend implementation)
export const emailEndOfDayReport = async (data: EndOfDayReportData, recipientEmail: string) => {
  const reportText = generateEndOfDayReportText(data);

  // This would need to be implemented on the backend
  // For now, we'll just copy to clipboard or download
  try {
    await navigator.clipboard.writeText(reportText);
    return { success: true, message: 'Report copied to clipboard. You can paste it into your email.' };
  } catch (error) {
    // Fallback to download
    downloadEndOfDayReport(data);
    return { success: true, message: 'Report downloaded. You can attach it to your email.' };
  }
};
