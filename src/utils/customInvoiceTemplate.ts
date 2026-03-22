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

// ====== CUSTOMIZE YOUR STORE INFO HERE ======
const CUSTOM_STORE_INFO = {
  name: 'YOUR STORE NAME',
  tagline: 'Fine Jewelry & Timepieces',
  address: '123 Main Street',
  city: 'London, UK',
  postcode: 'SW1A 1AA',
  phone: '+44 20 1234 5678',
  email: 'info@yourstore.com',
  website: 'www.yourstore.com',
  taxId: 'GB123456789',
  // Add logo path (put logo in public folder)
  logoPath: '/logo.png',  // Optional: set to null if no logo
  logoWidth: 50,
  logoHeight: 25
};

// ====== CUSTOMIZE COLORS HERE (RGB) ======
const COLORS = {
  primary: [0, 31, 63],        // Navy Blue (for headers)
  secondary: [212, 175, 55],    // Gold (for accents)
  text: [50, 50, 50],          // Dark Gray
  lightBg: [245, 245, 245],    // Light Gray Background
  border: [200, 200, 200]      // Light Border
};

/**
 * Generate a custom styled invoice PDF
 *
 * To use this template:
 * 1. Update CUSTOM_STORE_INFO above
 * 2. Customize COLORS if desired
 * 3. Import and use in PaymentPanel.tsx:
 *    import { generateCustomInvoice } from '@/utils/customInvoiceTemplate';
 *    generateCustomInvoice(invoiceData).save(filename);
 */
export const generateCustomInvoice = (data: InvoiceData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 20;

  // ========== HEADER WITH LOGO (Optional) ==========
  if (CUSTOM_STORE_INFO.logoPath) {
    try {
      // Note: In production, you'd load the logo properly
      // For now, this is a placeholder for where logo would go
      doc.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
      doc.rect(15, yPos - 5, CUSTOM_STORE_INFO.logoWidth, CUSTOM_STORE_INFO.logoHeight, 'F');

      // Text placeholder if logo fails
      doc.setFontSize(8);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text('LOGO', 25, yPos + 8);

      yPos += CUSTOM_STORE_INFO.logoHeight + 5;
    } catch (e) {
      // Logo failed, continue without it
    }
  }

  // ========== COMPANY NAME & INFO ==========
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text(CUSTOM_STORE_INFO.name, pageWidth / 2, yPos, { align: 'center' });

  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.text(CUSTOM_STORE_INFO.tagline, pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(
    `${CUSTOM_STORE_INFO.address} | ${CUSTOM_STORE_INFO.city}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 4;
  doc.text(
    `Tel: ${CUSTOM_STORE_INFO.phone} | Email: ${CUSTOM_STORE_INFO.email}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 4;
  doc.text(
    `VAT No: ${CUSTOM_STORE_INFO.taxId}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 10;

  // ========== DECORATIVE LINE ==========
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setLineWidth(1);
  doc.line(15, yPos, pageWidth - 15, yPos);

  yPos += 12;

  // ========== INVOICE TITLE ==========
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;

  // ========== INVOICE INFO BOX ==========
  doc.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
  doc.roundedRect(15, yPos - 5, 90, 22, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text('Invoice Number:', 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.invoiceNumber || 'N/A'), 55, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.date || new Date().toLocaleDateString()), 55, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment:', 18, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.paymentMethod || 'N/A'), 55, yPos);

  yPos += 12;

  // ========== CUSTOMER INFO BOX ==========
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text('BILL TO:', 15, yPos);

  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(String(data.customerName || 'Guest Customer'), 15, yPos);

  if (data.customerPhone) {
    yPos += 5;
    doc.setFontSize(9);
    doc.text(String(`Phone: ${data.customerPhone}`), 15, yPos);
  }

  if (data.customerEmail) {
    yPos += 4;
    doc.text(String(`Email: ${data.customerEmail}`), 15, yPos);
  }

  if (data.customerAddress) {
    yPos += 4;
    doc.text(String(`Address: ${data.customerAddress}`), 15, yPos);
  }

  yPos += 12;

  // ========== ITEMS TABLE ==========
  const tableData = data.items.map(item => {
    const itemDiscount = item.discount || 0;
    const itemSubtotal = item.price * item.quantity;
    const itemTotal = itemSubtotal * (1 - itemDiscount / 100);

    const details = [];
    if (item.karat) details.push(item.karat);
    if (item.weight) details.push(item.weight);
    const detailsStr = details.length > 0 ? details.join(', ') : '-';

    return [
      item.name,
      item.sku || '-',
      detailsStr,
      item.quantity.toString(),
      `£${item.price.toFixed(2)}`,
      itemDiscount > 0 ? `${itemDiscount}%` : '-',
      `£${itemTotal.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'SKU', 'Details', 'Qty', 'Price', 'Disc', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    bodyStyles: {
      textColor: COLORS.text,
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: COLORS.lightBg
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40;
  yPos = finalY + 10;

  // ========== TOTALS SECTION ==========
  const totalsX = pageWidth - 65;
  const totalsWidth = 50;

  // Background box for totals
  doc.setFillColor(COLORS.lightBg[0], COLORS.lightBg[1], COLORS.lightBg[2]);
  doc.roundedRect(totalsX - 5, yPos - 5, totalsWidth, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`£${data.subtotal.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

  yPos += 6;
  doc.text('VAT (20%):', totalsX, yPos);
  doc.text(`£${data.tax.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

  yPos += 8;

  // Total with gold accent
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setLineWidth(0.8);
  doc.line(totalsX, yPos - 2, totalsX + 40, yPos - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text('TOTAL:', totalsX, yPos + 4);
  doc.text(`£${data.total.toFixed(2)}`, totalsX + 40, yPos + 4, { align: 'right' });

  yPos += 12;

  // Cash payment details
  if (data.cashReceived && data.cashReceived > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

    doc.text('Cash Received:', totalsX, yPos);
    doc.text(`£${data.cashReceived.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });

    yPos += 5;

    if (data.change && data.change > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Change:', totalsX, yPos);
      doc.text(`£${data.change.toFixed(2)}`, totalsX + 40, yPos, { align: 'right' });
    }
  }

  // ========== FOOTER ==========
  yPos = pageHeight - 35;

  // Decorative line
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);

  yPos += 8;

  // Thank you message
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

  yPos += 6;

  // Footer notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(
    'All sales are final. Please retain this invoice for your records.',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 4;
  doc.setFont('helvetica', 'italic');
  doc.text(
    `For inquiries: ${CUSTOM_STORE_INFO.email} | ${CUSTOM_STORE_INFO.website}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download custom invoice as PDF
 */
export const downloadCustomInvoice = (data: InvoiceData, filename?: string) => {
  const doc = generateCustomInvoice(data);
  const fileName = filename || `Invoice_${data.invoiceNumber}_${data.date}.pdf`;
  doc.save(fileName);
};

/**
 * Preview custom invoice in new window
 */
export const previewCustomInvoice = (data: InvoiceData) => {
  const doc = generateCustomInvoice(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};
