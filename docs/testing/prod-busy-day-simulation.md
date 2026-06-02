# Production Busy-Day Simulation Plan

**Target:** production POS (pos.truedesk.* ) · **Account:** test tenant `testb` (manager/owner login).
**Goal:** exercise every module end-to-end as a realistic busy retail day, then close out with the End-of-Day cash-up + Z-report. Validates the just-shipped release (PRs #12–#23) on production.

> ⚠️ Creates real data in production under the test tenant. Driven via Playwright MCP (GUI).

## Execution order (dependencies first)

### 0. Login & baseline
- Log in with the test account.
- Note current dashboard figures (sales, inventory value, customers) for before/after.
- If a shift is already ACTIVE → close it first (denomination count) so we start clean.

### 1. Staff / User Management (do first — needed for assignment)
- Add **2 new users**: one `STAFF` (cashier), one `MANAGER`.
- Verify they appear in the Users list with correct role badges.
- (If time) set a cash-up PIN on the new manager.

### 2. Inventory — add & manage
- **Add 3–4 products** across categories (e.g. a ring, a necklace, a watch) with cost + selling price + qty, so the valuation has real cost data (not £0).
- **Manage**: edit one product (price/stock), adjust stock on another.
- Verify the **Inventory Valuation** panel updates (Cost vs Retail vs Profit/Margin, by-category, and the missing-cost warning count drops as costs are set).

### 3. Open the trading day — start shift
- Start a new shift with an opening float (e.g. £150).

### 4. Sales — busy run (varied tender)
- Ring **6–10 sales** through POS mixing:
  - CASH sales (several)
  - CARD sales (several)
  - a GIFT CARD redemption sale (after step 5)
  - at least one with a **customer** attached (quick-add a customer)
  - a multi-item sale
- (If supported) one **refund/void** to exercise that path.

### 5. Gift Cards
- **Sell** a gift card (adds non-revenue cash / card tender).
- **Redeem** it on a sale (ties into step 4).
- Verify gift-card balance/status updates.

### 6. Repairs — create & manage
- **Create 2–3 repair jobs** (customer, item, fault, quote) — incl. a quick-add new-customer repair.
- **Manage**: move a job through statuses (e.g. Received → In Progress → Ready for Collection), add a note/assignment.
- Verify status labels render correctly (the #13 fix) and the job appears on the Repairs board.

### 7. Petty Cash
- Record **2 expenses** (e.g. postage, cleaning supplies) → approve them.
- Verify they post and (per the cash formula) reduce expected cash at close.

### 8. Till cash movements (during shift)
- One **Pay-Out** (e.g. supplier COD) and one **Pay-In** (extra change) via the floating shift button.

### 9. HR Management
- Open HRMS: view employees; **add an employee** (or view the self-service portal / timesheets) depending on what's enabled.
- Sanity-check the HR dashboard loads and an employee record can be created/viewed.

### 10. End of Day — cash-up & Z-report
- Open the floating button → **End Shift**.
- **Denomination count** (blind) → declare cash.
- Enter the **card terminal Z-Read** total, plus any **gift-card / layaway** cash.
- Trigger the **variance reason** path (count ≠ expected) and, if over threshold, the **manager-PIN** gate.
- Confirm close → **Z-report prints** with: legal headers, float-audit block (Opening/Expected/Declared/Variance), sales summary, **department subtotals**, payment matrix (Cash/Card/Gift/Layaway incl £0), cash movements, signature lines.
- On the **Day-End dashboard**: verify the consolidated master totals, the shift in Recent Shifts, the variance badge, the tender accordion, and (optionally) **Detailed Journal** print.

### 11. Wrap-up
- Capture final dashboard figures vs baseline (revenue, inventory value, customers, repairs).
- Report per-module PASS/FAIL with screenshots + any bugs found.

## Coverage checklist
- [ ] User management (add staff + manager)
- [ ] Inventory add + manage + valuation
- [ ] Shift start
- [ ] Sales (cash / card / mixed / customer-attached / multi-item)
- [ ] Gift cards (sell + redeem)
- [ ] Repairs (create + status management)
- [ ] Petty cash (expense + approve)
- [ ] Till pay-in / pay-out
- [ ] HR management
- [ ] End-of-day cash-up (denomination, variance reason, manager PIN)
- [ ] Z-report print correctness (incl. departments)
- [ ] Day-End dashboard (master totals, audit, accordion, journal)
