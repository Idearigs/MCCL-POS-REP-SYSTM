# Invoice Template Customization Guide

## Quick Customization Checklist

### 1. Update Store Information
**File:** `src/utils/invoiceGenerator.ts` (Line 32-41)

```typescript
const STORE_INFO = {
  name: 'Your Store Name Here',           // ← Change this
  address: 'Your Street Address',          // ← Change this
  city: 'Your City, Country',             // ← Change this
  postcode: 'Your Postcode',              // ← Change this
  phone: 'Your Phone Number',             // ← Change this
  email: 'your@email.com',                // ← Change this
  website: 'www.yourwebsite.com',         // ← Change this
  taxId: 'Your VAT/Tax Number'            // ← Change this
};
```

### 2. Add Your Logo

**Step 1:** Place your logo file in `public/` folder (e.g., `public/logo.png`)

**Step 2:** Add this code in `generateInvoicePDF()` after line 48:

```typescript
// Add logo
const logo = new Image();
logo.src = '/logo.png';  // Path to your logo

// Wait for logo to load, then add to PDF
doc.addImage(logo, 'PNG', 15, 15, 40, 20); // x, y, width, height
yPos = 45; // Adjust starting position after logo
```

### 3. Change Colors

**Table Header Color** (Line 172):
```typescript
headStyles: {
  fillColor: [41, 128, 185],  // RGB: Blue
  // Try: [34, 139, 34] for Green
  // Try: [220, 20, 60] for Red
  // Try: [255, 165, 0] for Orange
}
```

**Text Colors:**
- Black: `[0, 0, 0]`
- Dark Gray: `[50, 50, 50]`
- Navy: `[0, 31, 63]`
- Gold: `[212, 175, 55]`

### 4. Change Fonts

Available fonts in jsPDF:
- `helvetica` (default)
- `times`
- `courier`

Change font throughout:
```typescript
doc.setFont('times', 'normal');  // Times New Roman
doc.setFont('courier', 'bold');  // Courier Bold
```

### 5. Adjust Layout

**Page Margins:**
```typescript
const leftMargin = 15;   // Default is 15
const rightMargin = 15;  // Default is 15
```

**Font Sizes:**
```typescript
doc.setFontSize(24);  // Header title
doc.setFontSize(18);  // Section titles
doc.setFontSize(12);  // Subheadings
doc.setFontSize(10);  // Body text
doc.setFontSize(8);   // Footer text
```

---

## Option 2: Create Multiple Templates

You can create different templates for different purposes (e.g., retail, wholesale, refund).

### Example: Create a Wholesale Template

**File:** `src/utils/invoiceTemplates/wholesaleTemplate.ts`

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceData } from '../invoiceGenerator';

export const generateWholesaleInvoice = (data: InvoiceData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Wholesale-specific styling
  doc.setFillColor(34, 139, 34);  // Green theme

  // Your custom layout here...

  return doc;
};
```

Then use it in `PaymentPanel.tsx`:
```typescript
import { generateWholesaleInvoice } from '@/utils/invoiceTemplates/wholesaleTemplate';

// In payment handler:
if (customer?.type === 'wholesale') {
  const doc = generateWholesaleInvoice(invoiceData);
  doc.save(fileName);
} else {
  downloadInvoice(invoiceData);
}
```

---

## Option 3: Use HTML Template (Advanced)

Convert HTML/CSS to PDF using `html2pdf.js`:

**Install:**
```bash
npm install html2pdf.js
```

**Create HTML template:**
```typescript
const generateHTMLInvoice = (data: InvoiceData) => {
  const html = `
    <div style="font-family: Arial; padding: 20px;">
      <div style="text-align: center;">
        <img src="/logo.png" style="width: 150px;" />
        <h1>${data.companyName}</h1>
      </div>

      <div style="margin-top: 30px;">
        <h2>Invoice #${data.invoiceNumber}</h2>
        <p>Date: ${data.date}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #2980b9; color: white;">
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>£${item.price}</td>
              <td>£${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="text-align: right; margin-top: 30px;">
        <p><strong>Total: £${data.total.toFixed(2)}</strong></p>
      </div>
    </div>
  `;

  return html;
};

// Convert to PDF
import html2pdf from 'html2pdf.js';

const element = document.createElement('div');
element.innerHTML = generateHTMLInvoice(invoiceData);

html2pdf()
  .from(element)
  .save(`Invoice_${invoiceData.invoiceNumber}.pdf`);
```

---

## Pre-made Template Styles

### Style 1: Modern Minimal
```typescript
// Clean, simple design with lots of white space
headStyles: {
  fillColor: [240, 240, 240],  // Light gray
  textColor: [0, 0, 0],         // Black text
  fontStyle: 'normal',
  lineWidth: 0.5,
  lineColor: [200, 200, 200]
}
```

### Style 2: Luxury/Premium
```typescript
// Gold and black theme
headStyles: {
  fillColor: [212, 175, 55],   // Gold
  textColor: [0, 0, 0],         // Black
  fontStyle: 'bold'
}
```

### Style 3: Professional Corporate
```typescript
// Navy blue theme
headStyles: {
  fillColor: [0, 31, 63],      // Navy
  textColor: [255, 255, 255],   // White
  fontStyle: 'bold'
}
```

---

## Common Customizations

### Add Watermark
```typescript
doc.setTextColor(200, 200, 200);
doc.setFontSize(60);
doc.text('PAID', pageWidth / 2, pageHeight / 2, {
  align: 'center',
  angle: 45
});
doc.setTextColor(0, 0, 0);  // Reset to black
```

### Add Footer Text
```typescript
doc.setFontSize(8);
doc.text('Terms & Conditions Apply', pageWidth / 2, pageHeight - 10, {
  align: 'center'
});
```

### Add QR Code (for payment/verification)
```bash
npm install qrcode
```

```typescript
import QRCode from 'qrcode';

const qrCode = await QRCode.toDataURL(`INV-${data.invoiceNumber}`);
doc.addImage(qrCode, 'PNG', pageWidth - 50, 20, 30, 30);
```

### Add Barcode
```bash
npm install jsbarcode
```

```typescript
import JsBarcode from 'jsbarcode';

const canvas = document.createElement('canvas');
JsBarcode(canvas, data.invoiceNumber, { format: 'CODE128' });
const barcodeImage = canvas.toDataURL();
doc.addImage(barcodeImage, 'PNG', 15, pageHeight - 30, 80, 20);
```

---

## File Structure for Multiple Templates

```
src/
└── utils/
    ├── invoiceGenerator.ts              # Main generator
    ├── invoiceTemplates/
    │   ├── standardTemplate.ts          # Default template
    │   ├── wholesaleTemplate.ts         # Wholesale template
    │   ├── refundTemplate.ts            # Refund template
    │   ├── receiptTemplate.ts           # Small receipt format
    │   └── luxuryTemplate.ts            # Premium design
    └── invoiceConfig.ts                 # Shared configuration
```

---

## Testing Your Template

**Quick test in browser console:**
```typescript
import { previewInvoice } from '@/utils/invoiceGenerator';

const testData = {
  invoiceNumber: 'TEST-001',
  date: new Date().toLocaleDateString('en-GB'),
  customerName: 'Test Customer',
  items: [{
    id: '1',
    name: 'Test Product',
    price: 100,
    quantity: 1,
    sku: 'TEST-001'
  }],
  subtotal: 100,
  tax: 20,
  total: 120,
  paymentMethod: 'Card'
};

previewInvoice(testData);  // Opens in new tab
```

---

## Tips

1. **Use PDF viewers** to test - Different PDF viewers may render differently
2. **Keep it simple** - Complex designs may not render well in PDF
3. **Test printing** - Make sure the invoice prints correctly on A4 paper
4. **Mobile-friendly** - Ensure it's readable on small screens
5. **Accessibility** - Use sufficient color contrast

---

## Need Help?

- jsPDF docs: https://raw.githack.com/MrRio/jsPDF/master/docs/
- jsPDF AutoTable: https://github.com/simonbengtsson/jsPDF-AutoTable
- HTML to PDF: https://github.com/eKoopmans/html2pdf.js
