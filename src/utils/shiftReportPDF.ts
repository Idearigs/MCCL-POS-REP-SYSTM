import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShiftReport } from '../services/shiftService';
import { format } from 'date-fns';

export const generateShiftReportPDF = (report: ShiftReport) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIFT REPORT', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(report.shift.shiftNumber, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Shift Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Shift Details', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const shiftDetails = [
    ['Cashier:', report.shift.user ? `${report.shift.user.firstName} ${report.shift.user.lastName}` : 'Unknown'],
    ['Start Time:', format(new Date(report.shift.startTime), 'MMM dd, yyyy HH:mm')],
    ['End Time:', report.shift.endTime ? format(new Date(report.shift.endTime), 'MMM dd, yyyy HH:mm') : 'N/A'],
    ['Duration:', report.shift.duration ? `${Math.floor(report.shift.duration / 60)}h ${report.shift.duration % 60}m` : 'N/A'],
    ['Status:', report.shift.status],
  ];

  shiftDetails.forEach(([label, value]) => {
    doc.text(label, 14, yPosition);
    doc.text(String(value), 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Float Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Float Summary', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const floatData = [
    ['Opening Float:', `£${report.shift.openingFloat.toFixed(2)}`],
    ['Cash Sales:', `£${report.metrics.cashSales.toFixed(2)}`],
    ['Expected Float:', `£${(report.shift.expectedFloat || 0).toFixed(2)}`],
    ['Actual Float:', `£${(report.shift.closingFloat || 0).toFixed(2)}`],
  ];

  floatData.forEach(([label, value]) => {
    doc.text(label, 14, yPosition);
    doc.text(value, 60, yPosition);
    yPosition += 6;
  });

  // Variance (highlighted)
  if (report.shift.variance !== undefined && report.shift.variance !== null) {
    doc.setFont('helvetica', 'bold');
    const varianceColor = report.shift.variance >= 0 ? [0, 128, 0] : [255, 0, 0];
    doc.setTextColor(...varianceColor);
    doc.text('Variance:', 14, yPosition);
    doc.text(
      `${report.shift.variance >= 0 ? '+' : ''}£${report.shift.variance.toFixed(2)}`,
      60,
      yPosition
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPosition += 8;
  }

  yPosition += 5;

  // Sales Metrics Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Metrics', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const metricsData = [
    ['Total Sales:', String(report.metrics.totalSales)],
    ['Total Revenue:', `£${report.metrics.totalRevenue.toFixed(2)}`],
    ['Average Sale Value:', `£${report.metrics.averageSaleValue.toFixed(2)}`],
    ['Items Sold:', String(report.metrics.itemsSold)],
    ['Cancelled Sales:', String(report.metrics.cancelledSales)],
    ['Total Discount:', `£${report.metrics.totalDiscount.toFixed(2)}`],
    ['Total Tax:', `£${report.metrics.totalTax.toFixed(2)}`],
  ];

  metricsData.forEach(([label, value]) => {
    doc.text(label, 14, yPosition);
    doc.text(value, 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Payment Breakdown Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Breakdown', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  Object.entries(report.metrics.paymentBreakdown).forEach(([method, amount]) => {
    doc.text(`${method.replace('_', ' ')}:`, 14, yPosition);
    doc.text(`£${amount.toFixed(2)}`, 60, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Sales Transactions Table
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Transactions', 14, yPosition);
  yPosition += 5;

  const salesTableData = report.sales.map((sale) => [
    sale.saleNumber,
    format(new Date(sale.createdAt), 'HH:mm'),
    sale.customers ? `${sale.customers.firstName} ${sale.customers.lastName}` : 'Walk-in',
    String(sale.sale_items.reduce((sum, item) => sum + item.quantity, 0)),
    sale.paymentMethod,
    `£${sale.totalAmount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Sale #', 'Time', 'Customer', 'Items', 'Payment', 'Amount']],
    body: salesTableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: {
      5: { halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Notes Section
  if (report.shift.openingNotes || report.shift.closingNotes) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (report.shift.openingNotes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Opening Notes:', 14, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      const splitOpeningNotes = doc.splitTextToSize(report.shift.openingNotes, pageWidth - 28);
      doc.text(splitOpeningNotes, 14, yPosition);
      yPosition += splitOpeningNotes.length * 5 + 3;
    }

    if (report.shift.closingNotes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Closing Notes:', 14, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      const splitClosingNotes = doc.splitTextToSize(report.shift.closingNotes, pageWidth - 28);
      doc.text(splitClosingNotes, 14, yPosition);
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadShiftReportPDF = (report: ShiftReport) => {
  const doc = generateShiftReportPDF(report);
  doc.save(`shift-report-${report.shift.shiftNumber}.pdf`);
};

export const previewShiftReportPDF = (report: ShiftReport) => {
  const doc = generateShiftReportPDF(report);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
