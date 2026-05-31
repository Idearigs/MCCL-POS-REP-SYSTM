/**
 * Features Registry — single source of truth for the in-app help center.
 * Add a new entry here every time a feature is shipped.
 * Features added within 30 days of `dateAdded` automatically get a "New" badge.
 */

export type FeatureCategory =
  | 'Point of Sale'
  | 'Sales'
  | 'Customers'
  | 'Inventory'
  | 'Repairs'
  | 'Shifts'
  | 'Settings'
  | 'HR';

export interface FeatureGuideSection {
  title: string;
  content: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  keywords: string[];
  dateAdded: string; // ISO date string
  path?: string;
  icon: string; // lucide icon name
  shortGuide: string[]; // Quick 3-5 bullet steps
  fullGuide: FeatureGuideSection[];
}

const FEATURES: Feature[] = [
  // ─── POINT OF SALE ──────────────────────────────────────────────────────────
  {
    id: 'pos-keyboard-shortcuts',
    name: 'POS Keyboard Shortcuts',
    description: 'Full keyboard control of the POS window — search, checkout, hold, suspend, and more without touching the mouse.',
    category: 'Point of Sale',
    keywords: ['keyboard', 'shortcut', 'hotkey', 'F8', 'F9', 'F10', 'checkout', 'hold', 'suspend', 'fast', 'speed'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'Keyboard',
    shortGuide: [
      'Press F8 or / to instantly focus the product search bar',
      'Press F4 to open the customer picker',
      'Press F9 to Hold, F10 to Suspend the current cart',
      'Press Space or Ctrl+Enter to launch checkout (when outside a text field)',
      'Hold Alt for 2 seconds to see all shortcuts on screen',
    ],
    fullGuide: [
      {
        title: 'Search & Navigation',
        content: 'F8 or / focuses the product search bar from anywhere on the POS window and selects existing text so you can type immediately. The search works by product name, SKU, or barcode.',
      },
      {
        title: 'Customer Picker',
        content: 'F4 opens the Select Customer dialog. Start typing a name or phone number to filter the list. Click a customer to assign them to the current cart.',
      },
      {
        title: 'Hold & Suspend',
        content: 'F9 parks the current cart as "Hold" — useful when a customer needs a moment. F10 parks it as "Suspend" for longer pauses. Both are recalled from the parked transactions list (clock icon).',
      },
      {
        title: 'Checkout',
        content: 'Space bar or Ctrl+Enter opens the payment dialog instantly when your focus is not inside a text box. The cart must have at least one item.',
      },
      {
        title: 'Cart Item Controls',
        content: 'Click any cart item to select it (blue ring appears). Then: + or = to increase qty, - to decrease, Delete or Backspace to remove it. Ctrl+Shift+Delete clears the entire cart (with a confirm dialog).',
      },
      {
        title: 'Browser Protection',
        content: 'F5 and Ctrl+R are blocked when the cart has items — preventing accidental page refresh from wiping an in-progress transaction.',
      },
      {
        title: 'Full Shortcut Reference',
        content: 'Hold the Alt key for 2 seconds anywhere in the POS window. A shortcut overlay slides in showing every available hotkey. Release Alt to dismiss it.',
      },
    ],
  },
  {
    id: 'pos-barcode-scanner',
    name: 'Hardware Barcode Scanner Support',
    description: 'Plug in any USB or Bluetooth barcode scanner and it will instantly add products to the cart regardless of where your focus is.',
    category: 'Point of Sale',
    keywords: ['barcode', 'scanner', 'scan', 'hardware', 'USB', 'QR', 'inventory', 'auto'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'ScanLine',
    shortGuide: [
      'Plug in your USB or Bluetooth barcode scanner — no setup required',
      'Scan a product barcode from anywhere in the POS window',
      'The system detects rapid keystrokes and looks up the product automatically',
      'Found product is added straight to the Shopping Bag',
      'A toast confirms the product name if found; warns if not in inventory',
    ],
    fullGuide: [
      {
        title: 'How detection works',
        content: 'Hardware scanners fire characters very fast (under 20 ms apart) and end with an Enter key. The POS monitors keystroke timing and intercepts any rapid burst of 4+ characters followed by Enter, no matter which UI element is focused.',
      },
      {
        title: 'Product lookup order',
        content: 'The system first tries to find the product by barcode field, then by SKU. If found, it is added to the active cart tab. If out of stock or not found, a warning toast appears.',
      },
      {
        title: 'Manual QR codes for mobile',
        content: 'Click the purple camera button (🎥) next to the search bar. Two QR codes appear — one for the mobile Inventory add page and one for the mobile Repair add page. Staff can scan these on their phones to open the mobile forms instantly.',
      },
    ],
  },
  {
    id: 'pos-multi-cart',
    name: 'Multi-Cart Tabs',
    description: 'Run multiple simultaneous transactions in separate cart tabs — ideal for serving multiple customers at once.',
    category: 'Point of Sale',
    keywords: ['cart', 'tab', 'multiple', 'simultaneous', 'customer', 'queue', 'parallel'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'LayoutGrid',
    shortGuide: [
      'Click the + button in the Shopping Bag tab bar to open a new cart',
      'Each tab maintains its own items, customer, and discount independently',
      'Click any tab to switch — current cart is saved automatically',
      'The item count badge on each tab shows how many products are in it',
      'Close a tab by hovering it and clicking the × (keeps one tab minimum)',
    ],
    fullGuide: [
      {
        title: 'Creating a new cart',
        content: 'Click the + button at the end of the tab bar (top of the Shopping Bag panel). A new empty cart opens immediately. The tab is labelled "Cart 2", "Cart 3", etc.',
      },
      {
        title: 'Switching between carts',
        content: 'Click any tab to switch. Your current cart state (items, customer, discount) is automatically saved. The new tab restores its own state instantly.',
      },
      {
        title: 'Persistence across reloads',
        content: 'All cart tabs are stored in localStorage. If the page is refreshed, all tabs and their contents are restored.',
      },
      {
        title: 'Closing a tab',
        content: 'Hover over an inactive tab to reveal the × close button. The active tab cannot be closed if it is the only one. If the tab has items, they are discarded — confirm with your customer first.',
      },
    ],
  },
  {
    id: 'pos-line-item-modifier',
    name: 'Cart Item Line Modifier',
    description: 'Click any item in the Shopping Bag to open a popover with per-item discounts, staff commission tagging, and the product spec sheet.',
    category: 'Point of Sale',
    keywords: ['discount', 'line', 'item', 'modifier', 'commission', 'staff', 'spec', 'popover', 'percentage', 'fixed'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'Tag',
    shortGuide: [
      'Click any product row in the Shopping Bag',
      'A popover opens with three sections: Spec Sheet, Line Discount, Commission',
      'Choose % or fixed £ discount, enter the value, and click Apply',
      'The discounted price shows with a strikethrough of the original',
      'Assign a salesperson from the Commission dropdown for commission tracking',
    ],
    fullGuide: [
      {
        title: 'Spec Sheet',
        content: 'If the product has category, condition, material, purity, or weight recorded in inventory, they appear in the amber spec sheet section for quick physical verification at the counter.',
      },
      {
        title: 'Line-Level Discount',
        content: 'Select % (percentage of line total) or £ (fixed pound amount). Enter the value and click Apply. The cart total updates immediately. The original price appears with a strikethrough. Click the × button to remove the discount.',
      },
      {
        title: 'Staff Commission Tag',
        content: 'Select the salesperson responsible for this specific item. This is stored on the line item and appears in the sale detail view for commission reporting. Different items on the same sale can be tagged to different staff members.',
      },
    ],
  },
  {
    id: 'pos-operator-switch',
    name: 'Quick Operator Switch',
    description: 'Switch the active cashier name mid-shift with one click — without logging out of the POS or interrupting in-progress transactions.',
    category: 'Point of Sale',
    keywords: ['operator', 'cashier', 'switch', 'staff', 'login', 'PIN', 'user', 'change'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'Users',
    shortGuide: [
      'Click the staff name button in the POS top bar (shows current operator)',
      'The Switch Operator dialog opens with all active staff',
      'Click a name to switch — the current operator badge updates instantly',
      'The new operator\'s name is used for void logs and subsequent receipts',
      'No session logout required — the transaction continues uninterrupted',
    ],
    fullGuide: [
      {
        title: 'Where to find it',
        content: 'In the POS top bar, next to the Exit POS button, you will see a button showing the current operator name. Click it at any time — even mid-transaction.',
      },
      {
        title: 'Who appears in the list',
        content: 'All active users on your account appear. The currently active operator is highlighted with an "Active" badge. Click any other name to switch.',
      },
      {
        title: 'Impact on records',
        content: 'After switching, the new operator name appears in void audit logs and is set as the salesperson for new transactions. Sales completed before the switch retain the original cashier\'s name.',
      },
    ],
  },
  {
    id: 'pos-mobile-qr',
    name: 'Mobile Entry QR Codes',
    description: 'Display QR codes for the mobile inventory and repair add pages so staff can open them instantly on their phones.',
    category: 'Point of Sale',
    keywords: ['mobile', 'QR', 'phone', 'inventory', 'repair', 'add', 'quick', 'scan'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'Camera',
    shortGuide: [
      'Click the purple camera icon (🎥) next to the search bar in the POS',
      'Two QR codes appear: Add Inventory and Add Repair',
      'Scan either code on a phone or tablet',
      'The mobile form opens directly — no login needed if already authenticated',
      'Use mobile forms to add new stock or log a repair job on the go',
    ],
    fullGuide: [
      {
        title: 'Add Inventory QR',
        content: 'Opens /mobile/add-product — a simplified form for adding a new product to inventory. Useful when receiving stock at the counter without a full computer.',
      },
      {
        title: 'Add Repair QR',
        content: 'Opens /mobile/add-repair — a streamlined repair intake form. Staff at the service desk can log jobs on their phone while serving customers at the counter simultaneously.',
      },
    ],
  },
  {
    id: 'pos-void-log',
    name: 'Void / Removed Items Audit Log',
    description: 'Every product removed from the cart is logged with timestamp and operator name for discrepancy auditing.',
    category: 'Point of Sale',
    keywords: ['void', 'log', 'audit', 'removed', 'deleted', 'cart', 'item', 'discrepancy', 'track'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'FileText',
    shortGuide: [
      'Remove any product from the Shopping Bag (trash icon or Delete key)',
      'The item is automatically logged to the void audit log',
      'When entries exist, a "Log (N)" button appears in the cart header',
      'Click "Log (N)" to view the full removal history for this session',
      'Log includes timestamp, product name, SKU, price, qty, and operator name',
    ],
    fullGuide: [
      {
        title: 'Viewing the log',
        content: 'When at least one item has been removed from the cart, a "Log (N)" button appears in the Shopping Bag header. Clicking it opens a dialog listing all removed items for the current session.',
      },
      {
        title: 'What is recorded',
        content: 'Each entry records: timestamp, product name, SKU, unit price, quantity removed, and the active operator name at the time of removal.',
      },
      {
        title: 'Persistence',
        content: 'The log is stored in browser localStorage and persists across page reloads. It stores up to the last 100 removals. Click "Clear Log" in the dialog to reset it.',
      },
    ],
  },
  {
    id: 'pos-exit-guard',
    name: 'Accidental Exit Protection',
    description: 'The POS warns before browser refresh or navigation away when the cart has active items — preventing accidental data loss.',
    category: 'Point of Sale',
    keywords: ['exit', 'guard', 'protect', 'refresh', 'navigate', 'warn', 'cart', 'data loss'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'ShieldAlert',
    shortGuide: [
      'Add at least one item to the Shopping Bag',
      'Try pressing F5 or Ctrl+R — the page will NOT refresh (blocked)',
      'Try closing the browser tab — a confirmation prompt appears',
      'Try navigating to another page — a confirm dialog appears',
      'Confirm to leave (items will be lost) or stay to continue the sale',
    ],
    fullGuide: [
      {
        title: 'F5 / Ctrl+R blocking',
        content: 'When the cart has items, the keyboard refresh shortcuts are intercepted and blocked. This prevents accidentally wiping a transaction mid-sale.',
      },
      {
        title: 'Browser close / tab close',
        content: 'The browser\'s native beforeunload event fires and shows a "Leave site?" dialog. This works for closing the tab, closing the browser window, or navigating to an external URL.',
      },
      {
        title: 'In-app navigation',
        content: 'Clicking sidebar links or the browser back button triggers a confirmation prompt asking if you want to leave the POS. Choose "Stay in POS" to return, or "Leave" to navigate away (items are lost).',
      },
    ],
  },

  // ─── SALES ──────────────────────────────────────────────────────────────────
  {
    id: 'sales-detail-view',
    name: 'Advanced Transaction Detail View',
    description: 'Click the eye icon on any sale to see a full financial breakdown: profit margin, split payment allocation, VAT ledger, and item-level details.',
    category: 'Sales',
    keywords: ['detail', 'view', 'margin', 'profit', 'VAT', 'tax', 'payment', 'breakdown', 'split', 'receipt'],
    dateAdded: '2026-05-28',
    path: '/sales',
    icon: 'Eye',
    shortGuide: [
      'Go to Sales Management page',
      'Click the eye icon (👁) in the Actions column of any sale row',
      'Profit margin panel shows Revenue, Cost, Gross Profit, and Margin %',
      'Payment section shows each payment method with amount and card details',
      'VAT ledger shows Subtotal, Discount, VAT collected, and Total',
    ],
    fullGuide: [
      {
        title: 'Profit Margin Panel',
        content: 'If cost price data is recorded for products in inventory, the sale detail shows a green margin panel: Revenue, Cost, Gross Profit (£), and Margin (%). Each line item also shows its individual margin %.',
      },
      {
        title: 'Split Payment Breakdown',
        content: 'If a sale used multiple payment methods (e.g., £300 card + £124 cash), each payment appears as its own row with method, amount, card last 4 digits, and payment status.',
      },
      {
        title: 'VAT / Tax Ledger',
        content: 'The purple tax panel shows the full VAT breakdown: subtotal excluding VAT, discount applied, VAT amount collected. If no VAT was charged, a "Zero-rated / Tax-exempt" badge appears.',
      },
      {
        title: 'Salesperson & Cashier',
        content: 'Both the cashier (who processed the sale) and the salesperson (who made the sale, if different) are shown in the Transaction section.',
      },
    ],
  },
  {
    id: 'sales-void-gate',
    name: 'Void Transaction Audit Gate',
    description: 'Voiding a sale now requires a mandatory reason code and manager PIN. The sale is preserved with a VOIDED badge — never permanently deleted.',
    category: 'Sales',
    keywords: ['void', 'cancel', 'reason', 'PIN', 'manager', 'audit', 'trail', 'VOIDED', 'security'],
    dateAdded: '2026-05-28',
    path: '/sales',
    icon: 'ShieldAlert',
    shortGuide: [
      'Click the purple × button (Void) on a COMPLETED sale',
      'Select a mandatory reason code from the dropdown',
      'Enter a 4-digit manager authorization PIN',
      'Click "Confirm Void" — sale is marked VOIDED (not deleted)',
      'The sale remains visible in the list with a Cancelled status for audit trail',
    ],
    fullGuide: [
      {
        title: 'Reason codes',
        content: 'Select from: Cashier Error, Customer Changed Mind, Duplicate Transaction, Pricing Error, Fraud Suspected, Test Transaction, System/Technical Error, Manager Override, or Other. The reason is appended to the sale notes.',
      },
      {
        title: 'Manager PIN',
        content: 'A 4-digit PIN is required to authorize the void. This prevents cashiers from voiding transactions without management approval.',
      },
      {
        title: 'Audit trail',
        content: 'Unlike a delete, voided sales remain in the system with a CANCELLED status and the void reason in their notes. Filter by Status = Cancelled to view all voided transactions.',
      },
    ],
  },
  {
    id: 'sales-enhanced-refund',
    name: 'Enhanced Return & Exchange Wizard',
    description: 'Full refund workflow with store credit issuance, restocking fee calculation, item condition flagging, and line-item selection.',
    category: 'Sales',
    keywords: ['refund', 'return', 'exchange', 'store credit', 'restocking', 'fee', 'damaged', 'partial', 'line item'],
    dateAdded: '2026-05-28',
    path: '/sales',
    icon: 'RotateCcw',
    shortGuide: [
      'Click the orange ↩ button on any COMPLETED sale',
      'Choose Full Refund or select individual items for a Partial Refund',
      'Pick a Refund Destination: Original method or Store Credit / Gift Card',
      'Set the Item Condition: Back to Shelf, Damaged, or Defective',
      'Optionally apply a Restocking Fee (%) — net refund is calculated automatically',
    ],
    fullGuide: [
      {
        title: 'Partial / Line-Item Returns',
        content: 'Switch to "Partial Refund" to select only specific items. Check the items to return and set the quantity. The refund amount is calculated proportionally based on the original unit price.',
      },
      {
        title: 'Store Credit',
        content: 'Choose "Store Credit / Gift Card" as the refund destination. A credit note for the net refund amount is indicated in the sale notes. Integrate with your gift card system to issue the voucher.',
      },
      {
        title: 'Restocking Fee',
        content: 'Enter a percentage (e.g., 10%). The fee is deducted from the gross refund amount. The summary shows: Gross refund, Fee amount, and Net refund. Useful for custom/jewelry items with personalization costs.',
      },
      {
        title: 'Item Condition',
        content: 'Flag the returned item as: Back to Shelf (resalable), Damaged (needs repair), or Defective (cannot resell). This is recorded in the sale notes for inventory decisions.',
      },
    ],
  },
  {
    id: 'sales-filters',
    name: 'Advanced Sales Filters & Multi-Format Export',
    description: 'Filter sales by date range, payment method, status, cashier, customer type, and outlet. Export to CSV, XLSX, or PDF.',
    category: 'Sales',
    keywords: ['filter', 'export', 'CSV', 'XLSX', 'Excel', 'PDF', 'date', 'range', 'cashier', 'customer type', 'outlet'],
    dateAdded: '2026-05-28',
    path: '/sales',
    icon: 'Filter',
    shortGuide: [
      'Click "Filters" at the top right of the Sales table',
      'Set a custom date range using the From/To calendar pickers',
      'Filter by Payment Method, Sale Status, Cashier, or Customer Type',
      'Click "Export" → choose CSV, XLSX (Excel), or PDF',
      'Active filter count badge shows how many filters are applied',
    ],
    fullGuide: [
      {
        title: 'Date Range',
        content: 'Use the From / To calendar pickers for any custom range. Quick buttons (Today, This Week, This Month) are also available at the top.',
      },
      {
        title: 'Customer Type filter',
        content: 'Filter by "Registered Customer" (has a linked customer record) or "Walk-in / Anonymous" (no customer assigned). Useful for analyzing loyalty vs walk-in revenue.',
      },
      {
        title: 'XLSX Export',
        content: 'Click Export → "Export as XLSX" to download an Excel-compatible file. Columns include Sale #, Date, Customer, Items, Subtotal, Discount, Tax, Total, Refunded, Payment Method/Status, Sale Status, Cashier, and Salesperson.',
      },
    ],
  },

  // ─── SHIFTS ─────────────────────────────────────────────────────────────────
  {
    id: 'shifts-auto-close',
    name: 'Auto Cash Drawer & Shift Summary Print',
    description: 'When closing a shift, the cash drawer opens automatically and a full shift summary thermal receipt is printed.',
    category: 'Shifts',
    keywords: ['shift', 'close', 'end', 'cash drawer', 'print', 'receipt', 'thermal', 'summary', 'report'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'Printer',
    shortGuide: [
      'Click the floating shift button (clock icon) anywhere on screen',
      'Click "End Shift" and enter your closing float amount',
      'The cash drawer opens automatically for cash counting',
      'A thermal shift summary prints with total sales, revenue, and payment breakdown',
      'The shift is marked as closed and a new shift can be started',
    ],
    fullGuide: [
      {
        title: 'Closing float',
        content: 'Enter the total cash in the drawer at shift end. The system calculates the variance (expected vs actual). A large variance (>£50) triggers an additional warning.',
      },
      {
        title: 'Auto cash drawer',
        content: 'If a printer with a cash drawer is configured in Settings → Printer, the drawer opens automatically when the shift is closed. No manual trigger needed.',
      },
      {
        title: 'Shift summary receipt',
        content: 'A thermal receipt prints showing: shift number, cashier name, start/end time, opening/closing float, total sales count, total revenue, payment method breakdown, total discounts, total tax, and cash variance.',
      },
    ],
  },
  {
    id: 'shifts-overlay-actions',
    name: 'Floating Overlay Quick Actions',
    description: 'The floating shift button expands to reveal quick shortcuts: Add Customer, Add Inventory, Add Repair — opening the respective add forms instantly.',
    category: 'Shifts',
    keywords: ['overlay', 'floating', 'quick', 'action', 'add', 'customer', 'inventory', 'repair', 'shortcut'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'PlusCircle',
    shortGuide: [
      'Click the green floating clock button (visible on all pages)',
      'The overlay expands showing: Back to POS, Add Inventory, Add Customer, Add Repair, End Shift',
      'Click "Add Customer" → navigates to Customers page with the Add form open',
      'Click "Add Inventory" → navigates to Inventory page with the Add Item form open',
      'Click "Add Repair" → navigates to Repairs page with the New Repair form open',
    ],
    fullGuide: [
      {
        title: 'Draggable widget',
        content: 'The floating button can be dragged to any position on screen. Its position is saved to localStorage and restored on next visit.',
      },
      {
        title: 'Context-aware POS toggle',
        content: 'The top button shows "Back to POS" when browsing admin pages, or "Back to Admin" when in the POS window — letting you switch between modes without using the sidebar.',
      },
      {
        title: 'Quick add forms',
        content: 'The Add Customer, Add Inventory, and Add Repair buttons navigate to the relevant management page and automatically trigger the add form to open, saving you from clicking "Add New" manually.',
      },
    ],
  },

  // ─── CUSTOMERS ──────────────────────────────────────────────────────────────
  {
    id: 'customers-refund-stats',
    name: 'Customer Refund History Tab',
    description: 'View a customer\'s full refund history with product codes, receipt numbers, and total refunded amount from the Customer Detail panel.',
    category: 'Customers',
    keywords: ['customer', 'refund', 'history', 'tab', 'receipt', 'SKU', 'product', 'detail'],
    dateAdded: '2026-05-28',
    path: '/customers',
    icon: 'RotateCcw',
    shortGuide: [
      'Go to Customers page and click on any customer',
      'The Customer Detail panel opens on the right',
      'Click the "Refunds" tab (shows count badge if refunds exist)',
      'Summary cards show total refund count and total value refunded',
      'Table lists each refund with receipt number, date, items/SKU, and amount',
    ],
    fullGuide: [
      {
        title: 'Refunds tab',
        content: 'The Refunds tab appears as the fourth tab in the Customer Detail panel. The badge count shows the number of refunded sales for that customer.',
      },
      {
        title: 'Data shown',
        content: 'Each row shows: Receipt number (linked), transaction date, product names with SKU codes, and refunded amount. This helps identify customers with frequent returns.',
      },
    ],
  },

  // ─── INVENTORY ──────────────────────────────────────────────────────────────
  {
    id: 'inventory-mobile-add',
    name: 'Mobile Inventory Add Page',
    description: 'Add new products to inventory from a phone or tablet using the mobile-optimised form accessible via QR code.',
    category: 'Inventory',
    keywords: ['mobile', 'add', 'product', 'inventory', 'phone', 'tablet', 'QR', 'quick'],
    dateAdded: '2026-05-28',
    path: '/mobile/add-product',
    icon: 'Smartphone',
    shortGuide: [
      'Open the POS and click the purple camera icon next to the search',
      'Scan the "Add Inventory" QR code with your phone',
      'Fill in the product details on the mobile-optimised form',
      'Submit to add it directly to inventory',
      'The new product appears in the POS and Inventory page immediately',
    ],
    fullGuide: [
      {
        title: 'Accessing the mobile page',
        content: 'Navigate directly to /mobile/add-product or scan the QR code shown in the POS camera dialog. The page is accessible on any device and is designed for touch input.',
      },
      {
        title: 'What you can add',
        content: 'Product name, category, price, cost, SKU, condition, material, weight, supplier, quantity, and product images.',
      },
    ],
  },

  // ─── REPAIRS ────────────────────────────────────────────────────────────────
  {
    id: 'repairs-mobile-add',
    name: 'Mobile Repair Intake Page',
    description: 'Log a new repair job from a phone or tablet using the mobile repair intake form, accessible via QR code from the POS.',
    category: 'Repairs',
    keywords: ['mobile', 'repair', 'add', 'intake', 'phone', 'tablet', 'QR', 'job'],
    dateAdded: '2026-05-28',
    path: '/mobile/add-repair',
    icon: 'Wrench',
    shortGuide: [
      'Open the POS and click the purple camera icon next to the search',
      'Scan the "Add Repair" QR code with your phone',
      'Fill in customer name, item description, price estimate, and due date',
      'Submit to create the repair job — it appears in the Repairs page instantly',
      'Customer gets an automatic notification (if SMS is configured)',
    ],
    fullGuide: [
      {
        title: 'Accessing the form',
        content: 'Navigate to /mobile/add-repair or scan the QR code shown in the POS camera dialog. Optimised for touch input — large buttons and minimal scrolling.',
      },
      {
        title: 'Repair job details',
        content: 'Log: customer name/phone, item description, repair notes, estimated cost, and expected completion date. Images can also be attached.',
      },
      {
        title: 'Customer stays updated',
        content: 'The repair status can be updated from the Repair Jobs page. Customers receive SMS notifications (if configured in Settings → Repair Messages) at each stage.',
      },
    ],
  },
  {
    id: 'pos-crm-badge',
    name: 'CRM Badges on Customer Selection',
    description: 'When you select a customer in the POS, their open repairs and active layaway counts appear instantly as micro-badges.',
    category: 'Point of Sale',
    keywords: ['CRM', 'customer', 'repair', 'layaway', 'badge', 'open', 'count', 'outstanding'],
    dateAdded: '2026-05-28',
    path: '/pos',
    icon: 'UserCheck',
    shortGuide: [
      'In the POS, click "Select Customer (Optional)" or press F4',
      'Search and select a customer from the list',
      'Under their name, orange badges show open repair count',
      'Blue badges show active layaway/installment count',
      'Tap a badge to navigate to their details for context',
    ],
    fullGuide: [
      {
        title: 'What counts are shown',
        content: 'After selecting a customer, the system fetches: (1) total repair jobs in any status, (2) sales with INSTALLMENT payment status. Counts appear as small coloured badges under the customer name in the cart panel.',
      },
      {
        title: 'Why it matters',
        content: 'At the point of sale, a cashier can immediately see "3 Repairs" and remember to ask the customer about their pending jobs — improving service and potentially closing more transactions.',
      },
    ],
  },
];

export default FEATURES;

/** Returns features with an isNew flag if dateAdded is within last 30 days */
export function getFeaturesWithNewFlag(): (Feature & { isNew: boolean })[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return FEATURES.map((f) => ({
    ...f,
    isNew: new Date(f.dateAdded) >= thirtyDaysAgo,
  }));
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  'Point of Sale',
  'Sales',
  'Shifts',
  'Customers',
  'Inventory',
  'Repairs',
  'HR',
  'Settings',
];
