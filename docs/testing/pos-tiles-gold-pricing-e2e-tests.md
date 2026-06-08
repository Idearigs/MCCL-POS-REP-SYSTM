# E2E + Stress Test Plan — POS Custom Tiles, Gold-Weight Live Pricing, Non-Stock Checkout

Covers the features and fixes currently on `develop` (staging) awaiting verification
before a `develop → main` production release.

| # | Item | PR(s) | Where it lives |
|---|------|-------|----------------|
| F1 | **POS Custom Tile Maker** + drag-reorder | #29 | Settings → POS Tiles; POS "Shortcuts" |
| F2 | **Gold-weight live pricing engine** (GBP + daily cron) | #30 | backend `metals` + `inventory/gold-pricing` |
| F3 | **Gold Pricing management UI** + NRV + browser-key cleanup | #31 | Settings → Gold Pricing; Inventory NRV |
| F4 | **Non-stock checkout** — custom-tile coverage | #33 | POS checkout → `POST /sales` |
| B1 | Manual Entry / Appraisal checkout 404 (regression — already in prod via #32) | #32 / #33 | POS checkout |
| B2 | Cash-Up Override PIN indicator (regression — already in prod) | — | User Management |
| P1 | **Empty tile label rejected at API** — ⚠ not yet merged to develop | `fix/pos-tile-empty-label` | backend DTO |

## Roles used
- **Owner / Manager** — can open the new Settings tabs, create/edit/delete/reorder tiles, manage gold pricing.
- **Staff (Cashier)** — sees POS Shortcuts and can tap them, but **cannot** drag-reorder or reach the Settings tabs.

## Environment
- Staging frontend: `https://staging.truedesk.co.uk` · Staging API: `https://staging-api.truedesk.co.uk/api/v1`
- Use a **disposable staging tenant**; clean up every tile/product/shift created (see §Cleanup).
- Staging must **not** use live SMS/payment keys. Confirm gold rate comes from the backend, not the browser.

> Legend: **P** = precondition, **S** = steps, **E** = expected result.

---

## F1 — POS Custom Tile Maker (Settings → POS Tiles)

### Creation & management (Owner/Manager)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| TILE-01 | Tab visible to Owner/Manager only | **S:** As Owner, Settings → tab strip. **E:** "POS Tiles" tab present. As Staff, tab is absent and the route is not reachable. |
| TILE-02 | Create a tile | **S:** POS Tiles → Add → label "Ring Polish", sale name "Ring Polishing", default price £18, pick an icon + colour → Save. **E:** Toast confirms; tile appears in the Settings list with chosen icon/colour; live preview matched the saved look. |
| TILE-03 | Sale name defaults to label | **S:** Create a tile with a label but blank sale name. **E:** Sale name falls back to the label (cart line uses the label). |
| TILE-04 | Blank default price ⇒ prompt | **S:** Create a tile with no/zero default price. **E:** Saved; on the POS the price dialog opens with an empty/editable amount (like Watch Links). |
| TILE-05 | Edit a tile | **S:** Edit "Ring Polish" → price £20, change colour → Save. **E:** List + POS reflect the new price/colour after reload. |
| TILE-06 | Soft delete | **S:** Delete a tile. **E:** Removed from Settings list and from the POS Shortcuts; underlying record is `isActive=false` (not hard-deleted). |
| TILE-07 | Icon/colour registry resolves | **S:** Use each offered icon/colour. **E:** Each renders both in Settings and POS; an unknown key falls back to Tag/blue (no crash). |

### POS render, tap-to-cart, drag-reorder
| ID | Title | Steps & Expected |
|----|-------|------------------|
| TILE-08 | Tile appears in POS | **P:** TILE-02 done. **S:** Open POS. **E:** A "Shortcuts" section shows the custom tile with its icon/colour/label. |
| TILE-09 | Tap → price dialog prefilled | **S:** Tap "Ring Polish". **E:** Service-price dialog opens prefilled £18 (editable), header uses the tile colour/gradient. |
| TILE-10 | Add to cart under sale name | **S:** Confirm £18. **E:** Cart line reads "Ring Polishing" (sale name) at £18; quantity/line behaves like the Battery Replace line. |
| TILE-11 | Complete sale | **S:** Pay (cash & card, separately). **E:** Sale completes 201; receipt/line shows the sale name. *(ties into F4 — see TILE-19.)* |
| TILE-12 | Drag-reorder persists (Owner/Manager) | **S:** Drag a tile to a new position; reload POS. **E:** New order persists (saved via `PATCH /pos-tiles/reorder`). |
| TILE-13 | Cashier cannot reorder | **S:** As Staff, attempt to drag a tile. **E:** Tiles are not draggable; order is read-only. |
| TILE-14 | Multi-tile order integrity | **P:** ≥5 tiles. **S:** Reorder several, reload. **E:** Order matches `sortOrder`; ties broken by `createdAt` (no flicker/duplication). |

### Validation (API-level)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| TILE-15 | Over-length label rejected | **S:** `POST /pos-tiles` label > 40 chars. **E:** 400. |
| TILE-16 | Negative price rejected | **S:** `POST /pos-tiles` defaultPrice = -1. **E:** 400. |
| TILE-17 | Cross-tenant isolation | **P:** Tile created on tenant A. **S:** As tenant B, `GET /pos-tiles`. **E:** Tenant A's tile is **not** returned; reorder/patch of A's id from B is rejected/no-op (no 500). |
| TILE-18 | **Empty label rejected** (P1) | **S:** `POST /pos-tiles` with `label: ""` or whitespace. **E:** **400** (requires `fix/pos-tile-empty-label` — currently FAILS on develop, returns 201). |

---

## F4 / B1 — Non-stock checkout (custom tile, Manual Entry, Appraisal)

| ID | Title | Steps & Expected |
|----|-------|------------------|
| TILE-19 | Custom-tile sale completes | **S:** Add a custom tile to cart → checkout. **E:** `POST /sales` → **201** (line tagged `CUSTOM TILE: <name>`, treated as non-stock, no product lookup, no `sale_items` FK write). Was the latent 404. |
| NS-01 | Manual Entry sale | **S:** POS → Manual Entry tile → name + price → checkout. **E:** 201 (note `MANUAL ENTRY: <name>`). *(Already live in prod — regression check.)* |
| NS-02 | Appraisal sale | **S:** POS → Appraisal flow → checkout. **E:** 201 (note `APPRAISAL: <name>`). *(Already live in prod — regression check.)* |
| NS-03 | Gift card still works | **S:** Add gift card → pay by card. **E:** 201 (note `GIFT CARD: <name>`). Regression for PR #25/#26. |
| NS-04 | Repair service still works | **S:** Battery Replace tile → checkout. **E:** 201 (note `REPAIR SERVICE: <name>`). |
| NS-05 | Real product unaffected | **S:** Sell a real stocked product. **E:** 201; stock decrements; `sale_items` row written (markers do NOT short-circuit real products). |
| NS-06 | Mixed cart | **S:** Cart with 1 real product + 1 custom tile + 1 manual entry → one checkout. **E:** 201; only the real product decrements stock; non-stock lines recorded by note. |

---

## F2 / F3 — Gold-weight live pricing + NRV

### Live rate in GBP (backend + security)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| GOLD-01 | GBP rate endpoint | **S:** `GET /metals/gold?currency=GBP`. **E:** Returns a GBP £/g (`price_gram_24k`), cached; `currency=USD` still works. |
| GOLD-02 | No API key in browser bundle | **S:** Open POS / dashboard / LiveGoldRate; inspect network + bundle. **E:** **Zero** requests to `goldapi.io` from the browser; rate fetched from backend `/metals/...`; no hardcoded key or `0.79` forex in shipped JS. |
| GOLD-03 | Circuit-breaker / last-known cache | **P:** Upstream gold API unavailable. **E:** Backend serves last-known cached rate; UI does not crash or show a hardcoded fallback. |

### Carat parsing & valuation
| ID | Title | Steps & Expected |
|----|-------|------------------|
| GOLD-04 | Carat from "22K" purity | **P:** Gold product, weight 5g, purity "22K". **E:** Candidate parses carat 22; value ≈ `5 × 22/24 × £/g`. |
| GOLD-05 | Carat from materials JSON | **P:** Product with `materials` carat = 18. **E:** Parses 18. |
| GOLD-06 | Hallmark 750 → 18ct | **P:** purity "750". **E:** Parsed as `750/1000 × 24 = 18`. |
| GOLD-07 | No carat ⇒ disabled/null | **P:** Gold weight but no carat/purity. **E:** Listed as candidate but cannot be priced (reported/skipped, not crashed). |
| GOLD-08 | Silver/platinum excluded | **P:** A silver item with weight. **E:** Not a gold candidate; untouched by a run. |
| GOLD-09 | Margin applied if set | **P:** `goldMarginPercent` = 10. **E:** value = `weight × carat/24 × £/g × 1.10`. Default 0 ⇒ pure market value. |
| GOLD-10 | round2 | **E:** Computed prices rounded to 2 decimals (no long floats). |

### Management UI (Settings → Gold Pricing)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| GOLD-11 | Tab Owner/Manager only | **S:** As Owner, Settings → Gold Pricing. **E:** Tab present; absent for Staff. |
| GOLD-12 | Candidate table | **E:** Table lists every gold-weight product with name, weight, carat, current price, **Live gold value (NRV)**, enabled toggle, and a "last updated" indicator; header shows live £/g. |
| GOLD-13 | Enable + Recalculate now | **S:** Enable a 5g/22k item → Recalculate now. **E:** Its `sellingPrice` updates to ≈ formula; `lastGoldPricedAt` set; toast confirms. |
| GOLD-14 | Select all / Clear all | **S:** Select all → confirm; Clear all. **E:** Bulk enable/disable persists via `PATCH .../bulk`. |
| GOLD-15 | Exclude is honoured | **P:** Item B disabled. **S:** Recalculate / run. **E:** Item B's price is **untouched**; only enabled items change. |
| GOLD-16 | Inventory NRV reflects update | **S:** After GOLD-13, open `/inventory`. **E:** "Retail Value (NRV)" panel reflects the new selling price (flows automatically). |
| GOLD-17 | Daily cron re-prices | **P:** ≥1 enabled gold item. **S:** Trigger the scheduled `runForTenant` path (or `POST /inventory/gold-pricing/run`). **E:** Enabled items re-priced for every tenant; disabled/non-gold skipped. |
| GOLD-18 | Add-product surfaces weight + carat | **S:** Add/Edit product form. **E:** Weight and carat/purity are clearly enterable; a gold item saved here appears as a Gold Pricing candidate. |

---

## B2 — Cash-Up Override PIN (regression)
| ID | Title | Steps & Expected |
|----|-------|------------------|
| PIN-01 | Indicator shows when set | **S:** User Management → set a Cash-Up PIN for a Manager. **E:** Button shows green **`PIN ✓`**; dialog shows "stored securely in the database". |
| PIN-02 | Survives cache clear | **S:** Clear browser cache, reload Users. **E:** `PIN ✓` still shown (driven by `hasCashUpPin` from API, not browser state). |
| PIN-03 | Hash never leaked | **S:** Inspect `GET /users` + `/me` responses. **E:** No `cashUpPin` hash in any payload; only the `hasCashUpPin` boolean. |

---

## Stress / concurrency
| ID | Title | Steps & Expected |
|----|-------|------------------|
| STR-01 | Bulk tile create | **S:** Create 20 tiles. **E:** All render; POS Shortcuts paginates/scrolls without layout break. |
| STR-02 | Concurrent tile create | **S:** Fire 10 `POST /pos-tiles` in parallel. **E:** No 500s; all created. (Known: `sortOrder` may collide on a parallel burst — reorder self-heals, display ties broken by `createdAt`. Acceptable.) |
| STR-03 | Rapid reorder | **S:** Reorder tiles repeatedly/quickly, reload. **E:** Final order persists; no lost/duplicated tiles. |
| STR-04 | Reorder unknown id | **S:** `PATCH /pos-tiles/reorder` including a foreign/nonexistent id. **E:** Scoped `updateMany` ignores it; **no 500**. |
| STR-05 | Gold run at scale | **S:** Enable 100+ gold items → run. **E:** Single £/g fetch reused for the whole batch; completes without per-item rate calls or timeout. |
| STR-06 | Busy-day POS mix | **S:** ~20 sales mixing real products, custom tiles, manual entry, gift cards, cash & card. **E:** All 201; stock only moves for real products; cash-up totals reconcile. |

---

## Cleanup (after each pass)
- Delete all test tiles (soft-delete) and any test products.
- Disable gold pricing on test items / reset margin if changed.
- Close/void any open test shift; void £0.01 / test sales.
- Confirm no live keys were exercised on staging.

---

## Results log
_Record date, tester, build SHA, and pass/fail per ID here as the pass is executed._

| Date | Build (develop SHA) | IDs run | Result | Notes |
|------|---------------------|---------|--------|-------|
| | | | | |
