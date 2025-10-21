# Invoice Generation System

## Overview

The POS system now automatically generates PDF invoices when a payment is completed. The invoice includes all standard details such as:

- Store/Company information
- Invoice number (transaction ID)
- Date
- Customer information
- Itemized list of products with SKU, details (karat, weight), quantity, price, discount, and totals
- Subtotal, VAT (20%), and grand total
- Payment method
- Cash received and change (for cash payments)

## Features

### Automatic Invoice Generation

When a customer completes a payment:
1. The invoice PDF is automatically generated
2. The PDF is downloaded to the user's default downloads folder
3. File naming format: `Invoice_[TransactionID]_[Date].pdf`

### Invoice Functions

Three utility functions are available in `src/utils/invoiceGenerator.ts`:

```typescript
// 1. Download invoice as PDF file
downloadInvoice(invoiceData, filename?);

// 2. Preview invoice in new browser tab
previewInvoice(invoiceData);

// 3. Get invoice as Blob (for API upload, email, etc.)
getInvoiceBlob(invoiceData);
```

## Customization

### Store Information

To update store/company information, edit the `STORE_INFO` constant in `src/utils/invoiceGenerator.ts`:

```typescript
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
```

### Invoice Template

The current template is a simple professional layout with:
- Header with company info
- Invoice number and date
- Customer billing information
- Itemized table of products
- Totals section
- Footer with thank you message

To create a custom template:
1. Create a new file (e.g., `src/utils/customInvoiceTemplate.ts`)
2. Copy the structure from `invoiceGenerator.ts`
3. Modify the layout, colors, fonts, and styling as needed
4. Update the import in `PaymentPanel.tsx` to use your custom template

### Colors and Styling

Current styling:
- Header font: Helvetica Bold, 24pt
- Body font: Helvetica, 10pt
- Table header color: RGB(41, 128, 185) - Blue
- Theme: Striped rows

To change colors, modify these lines in `generateInvoicePDF()`:

```typescript
// Table header color
headStyles: {
  fillColor: [41, 128, 185], // RGB values
  textColor: 255,
  fontStyle: 'bold',
  halign: 'center'
}
```

## Integration with Backend

### Future Enhancements

To save invoices to the backend:

```typescript
// 1. Get invoice as Blob
const blob = getInvoiceBlob(invoiceData);

// 2. Create FormData
const formData = new FormData();
formData.append('invoice', blob, `Invoice_${invoiceData.invoiceNumber}.pdf`);

// 3. Upload to backend
await fetch('/api/v1/invoices', {
  method: 'POST',
  body: formData
});
```

### Email Invoices

To email invoices automatically:

```typescript
// In PaymentPanel.tsx, after generating invoice
const blob = getInvoiceBlob(invoiceData);

// Send to backend endpoint that handles email
await fetch('/api/v1/invoices/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerEmail: customer.email,
    invoiceData: invoiceData
  })
});
```

## Troubleshooting

### PDF not downloading

Check browser console for errors. Common issues:
- Pop-up blocker preventing download
- Insufficient permissions
- Invalid invoice data

### Missing customer information

Some customer fields are optional:
- If customer is not selected, shows "Guest Customer"
- Phone, email, and address are only shown if available

### Styling issues

If fonts or layout appear incorrect:
- jsPDF has limited font support (Helvetica, Times, Courier)
- For custom fonts, see jsPDF documentation on adding custom fonts
- Test in different browsers (Chrome, Firefox, Safari)

## Testing

To test invoice generation without completing a payment:

```typescript
import { previewInvoice } from '@/utils/invoiceGenerator';

// Create test data
const testInvoice = {
  invoiceNumber: 'TEST-001',
  date: new Date().toLocaleDateString('en-GB'),
  customerName: 'Test Customer',
  customerPhone: '+44 7700 900000',
  customerEmail: 'test@example.com',
  items: [
    {
      id: '1',
      name: 'Gold Ring',
      sku: 'GLD-001',
      karat: '18K',
      weight: '5g',
      price: 500,
      quantity: 1,
      discount: 0
    }
  ],
  subtotal: 500,
  tax: 100,
  total: 600,
  paymentMethod: 'Card'
};

// Preview in browser
previewInvoice(testInvoice);
```

## File Structure

```
src/
├── utils/
│   ├── invoiceGenerator.ts     # Main invoice generation logic
│   └── INVOICE_README.md        # This documentation
├── types/
│   └── jspdf-autotable.d.ts    # TypeScript declarations
└── components/
    └── pos/
        └── PaymentPanel.tsx     # Integration point
```

## Dependencies

- `jspdf`: PDF generation library
- `jspdf-autotable`: Table plugin for jsPDF

Installed via: `npm install jspdf jspdf-autotable`

## License & Credits

- jsPDF: MIT License
- Invoice template: Custom design for MCCL POS System
