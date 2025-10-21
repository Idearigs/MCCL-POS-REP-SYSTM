import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InventoryReportItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryName?: string;
  supplier?: string;
  supplierName?: string;
  material?: string;
  purity?: string;
  weight?: number;
  price: number;
  cost: number;
  quantity: number;
  threshold: number;
  description?: string;
  location?: string;
  dateAdded?: string;
  lastRestocked?: string;
}

export interface InventoryReportData {
  items: InventoryReportItem[];
  generatedDate: string;
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

// Store information
const STORE_INFO = {
  name: 'MCCL Jewelry Store',
  address: '123 Main Street',
  city: 'London, UK',
  phone: '+44 20 1234 5678',
  email: 'info@mccljewelry.com'
};

/**
 * Generate a comprehensive professional inventory report PDF
 */
export const generateInventoryReportPDF = (data: InventoryReportData): jsPDF => {
  const doc = new jsPDF('landscape'); // Landscape for more columns
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = 15;

  // ========== HEADER ==========
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(STORE_INFO.name, pageWidth / 2, yPos, { align: 'center' });

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${STORE_INFO.address}, ${STORE_INFO.city}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 5;
  doc.text(
    `Phone: ${STORE_INFO.phone} | Email: ${STORE_INFO.email}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 10;

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);

  yPos += 10;

  // ========== TITLE ==========
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTORY REPORT', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${data.generatedDate}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 12;

  // ========== SUMMARY STATS ==========
  const statsStartY = yPos;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Left column stats
  doc.text('Total Items:', 15, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.totalItems), 45, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Value:', 70, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`£${data.totalValue.toFixed(2)}`, 100, yPos);

  // Right column stats
  doc.setFont('helvetica', 'bold');
  doc.text('Low Stock:', pageWidth - 100, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.lowStockItems), pageWidth - 75, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Out of Stock:', pageWidth - 60, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.outOfStockItems), pageWidth - 30, yPos);

  yPos += 10;

  // ========== ITEMS TABLE ==========
  const tableData = data.items.map(item => {
    const stockStatus = item.quantity <= 0
      ? 'Out of Stock'
      : item.quantity <= item.threshold
        ? 'Low Stock'
        : 'In Stock';

    return [
      item.name || 'N/A',
      item.sku || 'N/A',
      item.categoryName || item.category || 'N/A',
      item.supplierName || item.supplier || 'N/A',
      item.material || '-',
      item.purity || '-',
      item.weight ? `${item.weight}g` : '-',
      `£${item.price.toFixed(2)}`,
      `£${item.cost.toFixed(2)}`,
      item.quantity.toString(),
      stockStatus,
      item.location || '-'
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Product Name',
      'SKU',
      'Category',
      'Supplier',
      'Material',
      'Purity',
      'Weight',
      'Price',
      'Cost',
      'Qty',
      'Status',
      'Location'
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      fontSize: 7
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Product Name
      1: { cellWidth: 25 }, // SKU
      2: { cellWidth: 20 }, // Category
      3: { cellWidth: 20 }, // Supplier
      4: { cellWidth: 18 }, // Material
      5: { cellWidth: 15 }, // Purity
      6: { cellWidth: 15 }, // Weight
      7: { cellWidth: 18, halign: 'right' }, // Price
      8: { cellWidth: 18, halign: 'right' }, // Cost
      9: { cellWidth: 12, halign: 'center' }, // Qty
      10: { cellWidth: 20, halign: 'center' }, // Status
      11: { cellWidth: 20 } // Location
    },
    margin: { left: 10, right: 10 },
    didParseCell: function(data) {
      // Color code stock status
      if (data.column.index === 10 && data.section === 'body') {
        const status = data.cell.text[0];
        if (status === 'Out of Stock') {
          data.cell.styles.textColor = [220, 53, 69]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Low Stock') {
          data.cell.styles.textColor = [255, 193, 7]; // Yellow/Orange
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [40, 167, 69]; // Green
        }
      }
    }
  });

  // ========== FOOTER ==========
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 60;

  // Page number
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Page 1 of ${pageCount}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Generated by
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Generated by MCCL POS System',
    pageWidth - 10,
    pageHeight - 10,
    { align: 'right' }
  );

  return doc;
};

/**
 * Generate and download inventory report as PDF
 */
export const downloadInventoryReport = (data: InventoryReportData, filename?: string) => {
  const doc = generateInventoryReportPDF(data);
  const fileName = filename || `Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};

/**
 * Preview inventory report in new window
 */
export const previewInventoryReport = (data: InventoryReportData) => {
  const doc = generateInventoryReportPDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

/**
 * Generate inventory report and return as blob
 */
export const getInventoryReportBlob = (data: InventoryReportData): Blob => {
  const doc = generateInventoryReportPDF(data);
  return doc.output('blob');
};
