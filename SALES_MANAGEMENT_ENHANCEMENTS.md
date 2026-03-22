# Sales Management Module - Enhancement Implementation

## Current Implementation Status

### ✅ **Already Implemented Features**

#### 1. Basic Sales Interface (POS Screen)
- **Location**: `src/pages/PointOfSale.tsx`
- Fast, intuitive interface for cashiers ✓
- Add products by name or SKU ✓
- Product search and filtering ✓
- Display item details (name, price, quantity, total) ✓
- Auto-calculation of subtotal and total ✓
- Customer selection ✓
- Cart management ✓

#### 2. Payment Handling
- **Location**: `src/components/pos/PaymentPanel.tsx`
- Multiple payment methods (Cash, Card, Bank Transfer) ✓
- Split payments supported ✓
- Payment processing ✓
- Receipt generation ✓

#### 3. Invoice & Receipt Management
- **Location**: `src/utils/invoiceGenerator.ts`
- Auto-generate unique invoice numbers ✓
- Print receipts (PDF download) ✓
- Company branding on receipts ✓
- Receipt customization ✓

#### 4. Sales Reports & Viewing
- **Location**: `src/pages/SalesPage.tsx`
- View all sales transactions ✓
- Filter by payment method, status, date range ✓
- Sales statistics (today, week, month) ✓
- View sale details ✓

#### 5. Basic Refund Management
- **Location**: `src/components/sales/RefundSaleDialog.tsx`
- Process refunds ✓
- Refund reasons ✓
- Full or partial refunds ✓

---

## 🔧 **Features to Implement**

### **Priority 1: Critical POS Features**

#### 1. Hold & Resume Bills ⚠️ *STARTED*
**Status**: Component created (HeldBillsDialog.tsx)

**What's Needed**:
```typescript
// Add to PointOfSale.tsx:
- "Hold Bill" button in POS interface
- Save current cart as DRAFT sale
- "View Held Bills" button
- Load held bill data back to cart
- Delete held bills
```

**Implementation Steps**:
1. ✅ Created `HeldBillsDialog.tsx` component
2. ⬜ Add "Hold Bill" functionality to POS
3. ⬜ Add resume bill functionality to restore cart
4. ⬜ Update PaymentPanel to support saving as DRAFT

**Backend Support**: Already exists (DRAFT status in sales)

---

#### 2. Line-Item Discounts
**Status**: NOT IMPLEMENTED

**Requirements**:
- Apply discount to individual cart items (% or fixed amount)
- Show original price vs discounted price
- Manager approval for discounts > threshold (e.g., 10%)
- Discount reason tracking

**Implementation Needed**:
```typescript
// Add to CartItem.tsx:
interface CartItemProps {
  // ... existing props
  onApplyDiscount: (itemId: string, discount: number, type: 'percent' | 'fixed') => void;
}

// Add discount UI:
<Button variant="ghost" size="sm" onClick={() => setShowDiscountDialog(true)}>
  <Tag className="h-4 w-4" /> Discount
</Button>

// Discount Dialog with:
- Discount type selector (% or £)
- Discount amount input
- Reason field
- Manager approval if > threshold
```

**Backend Changes Needed**:
```typescript
// Add to sale_items table:
discount: Decimal // Already exists
discountType: String? // Add this: 'PERCENT' | 'FIXED'
discountReason: String?
discountApprovedBy: String? // For manager approval
```

---

#### 3. Void Transaction with Reasons
**Status**: NOT IMPLEMENTED (Delete exists but no void)

**Requirements**:
- Void completed sales (not delete)
- Mandatory reason for voiding
- Manager approval required
- Void transaction appears in audit trail
- Stock reversal on void

**Implementation**:
```typescript
// Add VOID status to SaleStatus enum in backend
enum SaleStatus {
  DRAFT
  COMPLETED
  CANCELLED
  REFUNDED
  VOIDED // NEW
}

// Add void transaction endpoint:
POST /api/v1/sales/:id/void
{
  reason: string;
  approvedBy?: string; // If manager approval needed
}

// Frontend: VoidSaleDialog.tsx
- Reason dropdown (e.g., "Customer changed mind", "Pricing error", "Duplicate entry")
- Custom reason text area
- Manager PIN/password if > threshold amount
- Confirmation dialog
```

---

### **Priority 2: Enhanced Features**

#### 4. Sales Return & Exchange Management
**Status**: PARTIAL (Refund exists, but no returns/exchanges)

**What's Missing**:
- **Return without receipt**: Search by customer phone/email
- **Exchange products**: Return item A, select item B, pay difference
- **Store credit**: Issue credit note instead of refund
- **Return reasons**: Track why items are returned
- **Restocking**: Auto-adjust inventory on return

**Implementation**:
```typescript
// Create: ReturnExchangeDialog.tsx
Components needed:
1. Return product selector (from original sale)
2. Return reason dropdown
3. Exchange product selector (optional)
4. Refund method selector:
   - Original payment method
   - Store credit
   - Cash
5. Manager approval for returns > X days old
```

**Backend Additions**:
```typescript
// New table: return_transactions
model return_transactions {
  id String @id
  saleId String
  returnNumber String @unique
  returnType ReturnType // REFUND, EXCHANGE, STORE_CREDIT
  reason String
  returnedItems Json // Array of {productId, quantity, amount}
  exchangeItems Json? // For exchanges
  refundAmount Decimal
  refundMethod PaymentMethod
  storeCreditIssued Decimal?
  approvedBy String?
  createdAt DateTime
  sale sales @relation(fields: [saleId], references: [id])
}
```

---

#### 5. Manager Approval System
**Status**: NOT IMPLEMENTED

**Requirements**:
- Approval for:
  - Discounts > threshold (e.g., 10%)
  - Voids > threshold amount (e.g., £50)
  - Returns after X days (e.g., 30 days)
  - Price overrides
- Manager PIN or password authentication
- Approval audit trail

**Implementation**:
```typescript
// Create: ManagerApprovalDialog.tsx
- Action description
- Amount/item details
- Approval threshold display
- Manager PIN input (4-6 digits)
- Reason field
- Approve/Deny buttons

// Add to backend:
model approval_requests {
  id String @id
  requestType String // DISCOUNT, VOID, RETURN, PRICE_OVERRIDE
  requestedBy String
  approvedBy String?
  requestData Json // Details of what needs approval
  reason String?
  status ApprovalStatus // PENDING, APPROVED, DENIED
  createdAt DateTime
  approvedAt DateTime?
}
```

---

#### 6. Enhanced Sales Reports
**Status**: BASIC (needs enhancement)

**Missing Reports**:
- Product-wise sales performance
- User-wise sales report
- Register-wise report (if multi-register)
- Hourly sales breakdown
- Payment method breakdown
- Profit margin report
- Refund and discount summary
- Category-wise sales

**Implementation**:
```typescript
// Create: SalesReportsPage.tsx
Tabs:
1. Summary Report
   - Date range selector
   - Total sales, refunds, net revenue
   - Payment method breakdown
   - Top selling products

2. Product Performance
   - Products sold (quantity)
   - Revenue per product
   - Profit margin
   - Category breakdown

3. Staff Performance
   - Sales per user
   - Average transaction value
   - Refunds processed
   - Discounts given

4. Detailed Transactions
   - Filterable transaction list
   - Export to CSV/Excel
   - Print report

// Backend endpoints needed:
GET /api/v1/sales/reports/summary?startDate&endDate
GET /api/v1/sales/reports/products?startDate&endDate
GET /api/v1/sales/reports/staff?startDate&endDate
GET /api/v1/sales/reports/payment-methods?startDate&endDate
```

---

### **Priority 3: Nice-to-Have Features**

#### 7. Customer-Specific Pricing
- Apply customer group discounts automatically
- VIP pricing tiers
- Loyalty points redemption

#### 8. Product Variants Support
- Size/color selection during checkout
- Variant pricing

#### 9. Quick Keys / Shortcuts
- F1-F12 keyboard shortcuts for common actions
- Quick product search by code
- Hot keys for payment methods

#### 10. Receipt Email
- Email receipt to customer
- SMS receipt option

---

## 📊 **Implementation Priority Order**

### Phase 1: Critical POS Enhancements (Week 1-2)
1. ✅ Hold & Resume Bills (component created)
2. ⬜ Line-Item Discounts
3. ⬜ Void Transactions

### Phase 2: Returns & Approvals (Week 3-4)
4. ⬜ Sales Return/Exchange Management
5. ⬜ Manager Approval System

### Phase 3: Reporting & Analytics (Week 5-6)
6. ⬜ Enhanced Sales Reports
7. ⬜ Export capabilities

### Phase 4: Advanced Features (Week 7+)
8. ⬜ Customer-specific pricing
9. ⬜ Product variants
10. ⬜ Email/SMS receipts

---

## 🛠️ **Quick Implementation Guide**

### To Complete Hold & Resume Bills:

1. **Update PointOfSale.tsx**:
```typescript
// Add state for held bills
const [showHeldBills, setShowHeldBills] = useState(false);

// Add Hold Bill button
<Button onClick={handleHoldBill} variant="outline">
  <Clock className="h-4 w-4 mr-2" />
  Hold Bill
</Button>

// Add View Held Bills button
<Button onClick={() => setShowHeldBills(true)}>
  View Held Bills ({heldBillCount})
</Button>

// Implement handleHoldBill
const handleHoldBill = async () => {
  // Save current cart as DRAFT sale
  await salesService.createSale({
    status: 'DRAFT',
    items: cartItems,
    customerId: selectedCustomer?.id,
    // ... other fields
  });

  // Clear cart
  setCartItems([]);

  toast({ title: 'Bill Held', description: 'Bill saved successfully' });
};

// Implement handleResumeBill
const handleResumeBill = async (billId: string) => {
  const sale = await salesService.getSaleById(billId);

  // Load sale data back to cart
  setCartItems(sale.items);
  setSelectedCustomer(sale.customer);
  // ... restore other fields

  // Optionally delete the draft
  await salesService.deleteSale(billId);
};
```

2. **Import HeldBillsDialog**:
```typescript
import HeldBillsDialog from '@/components/pos/HeldBillsDialog';

// Add to JSX
<HeldBillsDialog
  open={showHeldBills}
  onOpenChange={setShowHeldBills}
  onResume={handleResumeBill}
/>
```

---

## 📝 **Database Schema Updates Needed**

### For Line-Item Discounts:
```sql
ALTER TABLE sale_items
ADD COLUMN discount_type VARCHAR(10), -- 'PERCENT' or 'FIXED'
ADD COLUMN discount_reason TEXT,
ADD COLUMN discount_approved_by VARCHAR(255);
```

### For Void Transactions:
```sql
ALTER TABLE sales
ADD COLUMN void_reason TEXT,
ADD COLUMN voided_by VARCHAR(255),
ADD COLUMN voided_at TIMESTAMP;

-- Add VOIDED to SaleStatus enum
```

### For Return Transactions:
```sql
CREATE TABLE return_transactions (
  id VARCHAR(255) PRIMARY KEY,
  sale_id VARCHAR(255) NOT NULL,
  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_type VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  returned_items JSON NOT NULL,
  exchange_items JSON,
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_method VARCHAR(50),
  store_credit_issued DECIMAL(10,2),
  approved_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);
```

### For Manager Approvals:
```sql
CREATE TABLE approval_requests (
  id VARCHAR(255) PRIMARY KEY,
  request_type VARCHAR(50) NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255),
  request_data JSON NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP
);
```

---

## ✅ **Testing Checklist**

### Hold & Resume Bills:
- [ ] Hold a bill with multiple items
- [ ] Hold multiple bills simultaneously
- [ ] Resume a held bill and complete transaction
- [ ] Delete a held bill
- [ ] Hold bill with customer info
- [ ] Resume bill restores customer info

### Line-Item Discounts:
- [ ] Apply percentage discount to item
- [ ] Apply fixed amount discount to item
- [ ] Discount cannot exceed item price
- [ ] Manager approval triggered for large discounts
- [ ] Discount reflected in total calculation
- [ ] Discount shown on receipt

### Void Transactions:
- [ ] Void a completed sale with reason
- [ ] Manager approval required for void
- [ ] Stock quantity restored on void
- [ ] Voided sale appears in reports
- [ ] Voided sale cannot be voided again
- [ ] Audit trail shows void action

---

## 📚 **Additional Resources**

### Components to Create:
- ✅ `HeldBillsDialog.tsx`
- ⬜ `LineItemDiscountDialog.tsx`
- ⬜ `VoidTransactionDialog.tsx`
- ⬜ `ReturnExchangeDialog.tsx`
- ⬜ `ManagerApprovalDialog.tsx`
- ⬜ `SalesReportsPage.tsx`

### Backend Services to Create/Update:
- ⬜ Void sale endpoint
- ⬜ Return transaction endpoint
- ⬜ Manager approval endpoint
- ⬜ Enhanced reports endpoints

---

## 🎯 **Success Criteria**

The Sales Management Module will be considered complete when:

1. ✅ POS can hold and resume multiple bills
2. ✅ Staff can apply line-item discounts with proper approval
3. ✅ Transactions can be voided with reasons and manager approval
4. ✅ Full return/exchange workflow implemented
5. ✅ Manager approval system in place for sensitive operations
6. ✅ Comprehensive sales reports available
7. ✅ All actions logged for audit trail
8. ✅ Stock automatically adjusts for returns/voids
9. ✅ Receipt generation includes all discount/void details
10. ✅ Permission-based access to sensitive features

---

## 🚀 **Next Steps**

1. Review this document with the team
2. Prioritize features based on business needs
3. Complete Phase 1 (Hold/Resume, Discounts, Voids)
4. Test thoroughly before moving to Phase 2
5. Gather user feedback and iterate

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Status**: Implementation in Progress
