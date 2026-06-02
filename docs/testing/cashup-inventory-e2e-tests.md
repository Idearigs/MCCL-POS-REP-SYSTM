# E2E Test Cases — Inventory Valuation + End-of-Day Cash-Up

Covers the features merged to `develop`:
- **Inventory Valuation Breakdown** (PRs #16–#18)
- **Cash-Up Phase 1** — blind close + manager PIN (PR #19)
- **Cash-Up Phase 2** — manager Day-End dashboard (PR #20)
- **Cash-Up Phase 3** — Z-report + detailed journal (PR #21)

## Roles used
- **Owner/Manager** account — full visibility, can set PINs, sees Expected/Variance, can audit.
- **Staff (Cashier)** account — blind close; Expected/Variance hidden on the dashboard.

> Legend: **P** = precondition, **S** = steps, **E** = expected result.

---

## A. Inventory Valuation (`/inventory`)

| ID | Title | Steps & Expected |
|----|-------|------------------|
| INV-01 | Valuation panel renders | **S:** Open `/inventory`. **E:** Below the stat cards a "Inventory Valuation" panel shows 4 tiles — Cost Value, Retail Value (NRV), Potential Profit, Gross Margin — plus header "{N} products · {M} units in stock". |
| INV-02 | Top card relabelled | **E:** The 4th stat card reads **"Retail Value (NRV)"** (not "Total Value") and equals Σ(selling price × qty). |
| INV-03 | Figures are correct | **P:** Note a product's cost/sell/qty. **E:** Cost Value = Σ(cost×qty); Retail = Σ(sell×qty); Potential Profit = Retail − Cost; Gross Margin = Profit/Retail (shown as %). |
| INV-04 | Missing-cost warning | **P:** ≥1 active product has no cost price. **E:** Amber banner: "N of M products have no cost price set — profit and margin are overstated…". |
| INV-05 | By-category table | **E:** "By Category" table lists Units, Cost, Retail, Profit, Margin per category, sorted by retail value. |
| INV-06 | Negative margin colouring | **P:** A product priced below cost. **E:** Potential Profit / Gross Margin tiles and the category Profit cell render **red** when negative, green otherwise. |
| INV-07 | Feature listed | **S:** Settings → Features, search "valuation". **E:** "Inventory Valuation Breakdown" appears (Inventory category). |

---

## B. Cash-Up Phase 1 — Blind Close & Manager PIN

### Setup
| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU1-00 | Start a shift | **S:** As Staff, start a shift with an opening float (e.g. £100). **E:** Floating shift button shows the shift number. |
| CU1-01 | Ring sales | **S:** Make 1 CASH sale and 1 CARD sale via POS. **E:** Sales recorded against the shift. |

### Denomination matrix & blind close
| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU1-02 | Open close dialog | **S:** Floating button → End Shift. **E:** "Close Shift" dialog shows a GBP denomination grid (£50…1p), Card Z-Read, Gift Card, Layaway fields. **No "expected" or "variance" figure is shown.** |
| CU1-03 | Matrix auto-sums | **S:** Enter 2×£20, 1×£5, 3×£1. **E:** "Total Counted (Declared Cash)" = £48.00. Non-numeric input rejected. |
| CU1-04 | Balanced close (£0 variance) | **P:** Count exactly the expected cash (opening + cash sales). **S:** Submit. **E:** Shift closes with no reason/PIN prompt; cash drawer opens (if printer set); Z-report prints. |
| CU1-05 | Variance → reason required | **P:** Count an amount ≠ expected, within threshold (e.g. £2 off). **S:** Submit. **E:** Submit is blocked; a **Variance Reason** field appears ("your count differs — explain"); expected figure still NOT shown. Entering a reason + resubmit closes the shift. |
| CU1-06 | Variance > threshold → manager PIN | **P:** Count an amount over the threshold off (default £5). **S:** Submit with reason. **E:** A **Manager PIN** field appears ("exceeds the allowed threshold"). |
| CU1-07 | Invalid PIN rejected | **S:** Enter a wrong PIN, submit. **E:** Error "Invalid manager PIN."; shift stays open. |
| CU1-08 | Valid PIN closes | **S:** Enter a valid manager PIN, submit. **E:** Shift closes; override recorded (visible later in the audit modal as "Closed with a manager PIN override on …"). |
| CU1-09 | Card Z-Read captured | **S:** Enter a card terminal total at close. **E:** Stored as Card Actual; later shown in the dashboard accordion vs Card Expected. |
| CU1-10 | Non-revenue captured | **S:** Enter Gift Card Sales / Layaway Deposits at close. **E:** Stored and shown in the accordion + Z-report payment matrix. |

### Cash movements (pay-in / pay-out)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU1-11 | Pay-out | **S:** Floating button → Cash In/Out → Pay-Out, £10, reason "postage". **E:** Toast confirms; amount feeds the expected-cash formula (reduces expected). |
| CU1-12 | Pay-in | **S:** Cash In/Out → Pay-In, £5, reason "extra change". **E:** Toast confirms; increases expected cash. |
| CU1-13 | Active-shift guard | **P:** No active shift. **E:** Cash In/Out option not shown. |

### Manager PIN management
| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU1-14 | Set PIN (manager) | **S:** As Owner, Users page → a Manager/Owner card → **PIN** → enter 4–6 digits → Save. **E:** "Cash-up PIN set successfully". |
| CU1-15 | PIN only on managers | **E:** The **PIN** button appears only on OWNER/MANAGER cards, not on STAFF/READONLY. |
| CU1-16 | PIN validation | **S:** Enter "12" (too short). **E:** "PIN must be 4 to 6 digits". |
| CU1-17 | Clear PIN | **S:** Open PIN dialog → Clear PIN. **E:** "Cash-up PIN cleared"; that manager's PIN no longer authorises overrides. |
| CU1-18 | Staff cannot set PIN | **P:** Logged in as Staff. **E:** No access to set a PIN (button absent / endpoint 403). |

---

## C. Cash-Up Phase 2 — Manager Day-End Dashboard (`/cash-up`)

| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU2-01 | Master summary cards | **S:** As Manager, open Day End Report, set a date range covering closed shifts. **E:** Cards show Total Revenue, Total Tax, Total Discounts, Non-Cash Tenders, and **Total Variance** (manager only). |
| CU2-02 | Recent Shifts table | **E:** Table lists shifts with Opening, **Expected**, Declared, **Variance** columns + expand chevron. |
| CU2-03 | Role masking (cashier) | **P:** Log in as Staff/Readonly, open `/cash-up`. **E:** Expected & Variance columns and the Variance summary card are **hidden**. |
| CU2-04 | Variance badge → audit modal | **S:** As Manager, click a non-zero variance badge. **E:** Modal shows Expected/Declared/Variance, the **cashier's reason**, manager-override note (if any), and an audit-note textarea. |
| CU2-05 | Save audit note | **S:** Enter a resolution note → Save. **E:** Toast "Audit note saved"; badge marked ✓ (resolved); reloading shows the saved note + resolver/time. |
| CU2-06 | Expandable tender accordion | **S:** Click a shift's expand chevron. **E:** Inline panel shows Card Expected vs Actual, Gift Card, Layaway, Pay-Ins, Pay-Outs, Cash Refunds, Card Variance, and the cashier reason. |
| CU2-07 | Summary respects user filter | **S:** Pick a specific user in the filter. **E:** Summary + table recompute for that user only. |

---

## D. Cash-Up Phase 3 — Z-Report & Detailed Journal

| ID | Title | Steps & Expected |
|----|-------|------------------|
| CU3-01 | Settings → Cash-Up tab | **S:** Settings → Cash-Up. **E:** Fields: variance threshold (£), company registration number, register/till ID. Saving persists (reload keeps values). |
| CU3-02 | Threshold drives PIN gate | **P:** Set threshold to £2. **E:** A £3 variance close now triggers the manager-PIN gate (ties back to CU1-06). |
| CU3-03 | Z-report content | **S:** On the dashboard select a closed shift → **Z-Report**. **E:** Receipt shows legal headers (store address, phone, VAT, company reg, Register/Till ID), a **Float Audit** block (Opening / Expected / Declared / Variance), Sales Summary, Department subtotals, a **Payment Matrix listing Cash/Card/Gift Card/Layaway even at £0.00**, Cash Movements (Pay-Ins/Pay-Outs), and **dotted Cashier + Manager signature lines**. No per-line items. |
| CU3-04 | Detailed Journal | **S:** Select a closed shift → **Detailed Journal**. **E:** Separate receipt with a line-by-line chronological list (time, product, SKU, qty, amount, tender, customer) and a TOTAL row. |
| CU3-05 | Z-report uses settings | **P:** Set a company reg + till ID in CU3-01. **E:** Those values appear on the Z-report header. |
| CU3-06 | Feature listed | **S:** Settings → Features, search "cash". **E:** "End-of-Day Cash-Up & Z-Report" appears (Shifts category). |

---

## E. Regression / negative
| ID | Title | Steps & Expected |
|----|-------|------------------|
| REG-01 | Close own shift only | **E:** A user cannot close another user's shift (backend rejects). |
| REG-02 | Audit is manager-only | **E:** `PATCH /shifts/:id/audit` returns 403 for STAFF/READONLY. |
| REG-03 | No active shift | **E:** Starting a 2nd active shift is blocked ("already have an active shift"). |
| REG-04 | Existing flows intact | **E:** Normal POS sale + standard receipt printing still work unchanged. |

---

## Playwright execution notes

No Playwright project exists yet. For automated runs, parameterise by env:
- `E2E_BASE_URL` — staging frontend URL
- `E2E_MANAGER_EMAIL` / `E2E_MANAGER_PASSWORD`
- `E2E_STAFF_EMAIL` / `E2E_STAFF_PASSWORD`
- `E2E_TENANT_SLUG`

**Prerequisites for staging runs:** staging must be running the `develop` build of **both** the POS frontend and backend, and the `20260602101245_cashup_blind_close` migration must be applied to the staging DB (otherwise shift-close calls 500). CI only deploys on `main`, so `develop` must be deployed to the staging resources manually in Coolify.

Interactive verification is driven via the Playwright MCP browser tools against `E2E_BASE_URL` following the cases above.
