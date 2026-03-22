import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  karat?: string;
  weight?: string;
  discount?: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
}

// Company/Store information - can be updated later from settings
const STORE_INFO = {
  name: 'MCCL Jewelry Store',
  address: '123 Main Street',
  city: 'London, UK',
  postcode: 'SW1A 1AA',
  phone: '+44 20 1234 5678',
  email: 'info@mccljewelry.com',
  website: 'www.mccljewelry.com',
  taxId: 'GB123456789'
};

export const generateInvoicePDF = (data: InvoiceData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  // ===== HEADER SECTION =====
  // Company Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(STORE_INFO.name, pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(STORE_INFO.address, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.text(STORE_INFO.city, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.text(`Phone: ${STORE_INFO.phone} | Email: ${STORE_INFO.email}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;
  doc.text(`VAT No: ${STORE_INFO.taxId}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);

  yPos += 10;

  // ===== INVOICE TITLE AND INFO =====
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES INVOICE', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;

  // Invoice details (left side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.invoiceNumber || 'N/A'), 55, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.date || new Date().toLocaleDateString()), 55, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.paymentMethod || 'N/A'), 55, yPos);

  yPos += 10;

  // ===== CUSTOMER INFORMATION =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Bill To:', 15, yPos);

  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.customerName || 'Guest Customer'), 15, yPos);

  if (data.customerPhone) {
    yPos += 5;
    doc.text(String(`Phone: ${data.customerPhone}`), 15, yPos);
  }

  if (data.customerEmail) {
    yPos += 5;
    doc.text(String(`Email: ${data.customerEmail}`), 15, yPos);
  }

  if (data.customerAddress) {
    yPos += 5;
    doc.text(String(`Address: ${data.customerAddress}`), 15, yPos);
  }

  yPos += 12;

  // ===== ITEMS TABLE =====
  const tableColumns = [
    { header: 'Item', dataKey: 'item' },
    { header: 'SKU', dataKey: 'sku' },
    { header: 'Details', dataKey: 'details' },
    { header: 'Qty', dataKey: 'qty' },
    { header: 'Price', dataKey: 'price' },
    { header: 'Disc %', dataKey: 'discount' },
    { header: 'Total', dataKey: 'total' }
  ];

  const tableData = data.items.map(item => {
    const itemDiscount = item.discount || 0;
    const itemSubtotal = item.price * item.quantity;
    const itemTotal = itemSubtotal * (1 - itemDiscount / 100);

    // Build details string
    const details = [];
    if (item.karat) details.push(item.karat);
    if (item.weight) details.push(item.weight);
    const detailsStr = details.length > 0 ? details.join(', ') : '-';

    return {
      item: item.name,
      sku: item.sku || '-',
      details: detailsStr,
      qty: item.quantity.toString(),
      price: `£${item.price.toFixed(2)}`,
      discount: itemDiscount > 0 ? `${itemDiscount}%` : '-',
      total: `£${itemTotal.toFixed(2)}`
    };
  });

  autoTable(doc, {
    startY: yPos,
    head: [tableColumns.map(col => col.header)],
    body: tableData.map(row => Object.values(row)),
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: 50
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Item
      1: { cellWidth: 25 }, // SKU
      2: { cellWidth: 30 }, // Details
      3: { cellWidth: 15, halign: 'center' }, // Qty
      4: { cellWidth: 25, halign: 'right' }, // Price
      5: { cellWidth: 18, halign: 'center' }, // Discount
      6: { cellWidth: 25, halign: 'right' } // Total
    },
    margin: { left: 15, right: 15 }
  });

  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;
  yPos = finalY + 10;

  // ===== TOTALS SECTION =====
  const totalsX = pageWidth - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Subtotal
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`£${data.subtotal.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

  yPos += 6;

  // Tax
  doc.text('VAT (20%):', totalsX, yPos);
  doc.text(`£${data.tax.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

  yPos += 8;

  // Total line
  doc.setLineWidth(0.5);
  doc.line(totalsX, yPos - 2, pageWidth - 15, yPos - 2);

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, yPos + 4);
  doc.text(`£${data.total.toFixed(2)}`, totalsX + 40, yPos + 4, { align: 'right' });

  yPos += 12;

  // Cash payment details (if applicable)
  if (data.cashReceived && data.cashReceived > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text('Cash Received:', totalsX, yPos);
    doc.text(`£${data.cashReceived.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

    yPos += 6;

    if (data.change && data.change > 0) {
      doc.text('Change:', totalsX, yPos);
      doc.text(`£${data.change.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });
    }
  }

  // ===== FOOTER SECTION =====
  yPos = pageHeight - 30;

  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);

  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

  yPos += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('All sales are final. Please retain this invoice for your records.', pageWidth / 2, yPos, { align: 'center' });

  yPos += 4;
  doc.text('For inquiries, please contact us at ' + STORE_INFO.email, pageWidth / 2, yPos, { align: 'center' });

  return doc;
};

/**
 * Generate and download invoice as PDF
 */
export const downloadInvoice = (data: InvoiceData, filename?: string) => {
  const doc = generateInvoicePDF(data);
  const fileName = filename || `Invoice_${data.invoiceNumber}_${data.date}.pdf`;
  doc.save(fileName);
};

/**
 * Generate invoice and return as blob
 */
export const getInvoiceBlob = (data: InvoiceData): Blob => {
  const doc = generateInvoicePDF(data);
  return doc.output('blob');
};

/**
 * Generate invoice and open in new window
 */
export const previewInvoice = (data: InvoiceData) => {
  const doc = generateInvoicePDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
