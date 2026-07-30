# Inventory System — Engineering Proposal

**Project:** The Boma Café
**Scope:** Alcoholic drinks & beverages inventory management
**Status:** Proposal — pending approval before implementation
**Date:** 2026-07-28

---

## 1. Executive Summary

Replace the current manual, paper-based stock process with a digital inventory system that attaches to the existing `bar_items` table. The system tracks stock in the natural unit staff already use — **bottles** and **tots/shots** — and automatically converts between them using per-product bottle-size and pour-size rules. An Excel import workflow lets managers upload supplier spreadsheets or physical-count sheets; the system matches products, previews changes, and applies them with full audit history. A reconciliation engine compares expected stock (opening + purchases − sales) against physical counts, pinpointing variance down to the tot.

No POS integration in V1. Staff enter manual sales, spillage, comps, and breakages through a simple touch-friendly form. Future versions connect directly to the POS or order system for automatic deduction.

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology | Justification |
|---|---|---|
| Database | PostgreSQL via Supabase | Already in use. RLS for multi-role access. |
| Backend | Next.js API routes | Already in use, fits existing patterns. |
| Storage | Supabase Storage | Already in use for images. Store Excel imports as files. |
| Background | Existing background_jobs worker | Already in use for PDF generation, re-usable for large imports or nightly reconciliation. |

### 2.2 Integration Points

| Existing Module | Integration |
|---|---|
| `bar_items` table | Inventory products are linked 1:1 to `bar_items` via `bar_item_id`. A new `inventory_products` table stores the bottle/tot conversion config alongside the bar item. |
| Admin Sidebar | New nav group "Inventory" with pages: Dashboard, Products, Stock Count, Import, Adjustments, Reports. |
| Admin auth / `requireAdmin()` | Reused as-is. Inventory pages require admin role. |
| Supabase admin client (`getAdminClient()`) | Reused for all DB and storage operations. |
| Background worker pattern | Optional — used for processing large Excel files asynchronously with email notification on completion. |

### 2.3 Page Structure

```
/admin/inventory/
├── page.tsx              (dashboard — current stock, alerts, quick-actions)
├── products/
│   ├── page.tsx           (list all inventory products with conversion config)
│   └── [id]/page.tsx      (single product view — stock history, adjustments)
├── stock/
│   ├── page.tsx           (current stock view in bottles+tots)
│   ├── count/
│   │   └── page.tsx       (initiate a physical stock count)
│   └── adjust/
│       └── page.tsx        (manual adjustment — spillage, comp, breakage, etc.)
├── import/
│   └── page.tsx            (Excel upload, preview, approve, rollback)
├── reconciliation/
│   └── page.tsx            (expected vs actual, variance report)
└── reports/
    └── page.tsx            (daily, weekly, monthly reports)
```

### 2.4 Navigation Addition (Sidebar)

Add after the Menu group:

```typescript
{
  label: 'Inventory',
  items: [
    { label: 'Dashboard',   icon: '📦', href: '/admin/inventory' },
    { label: 'Products',    icon: '🏷️', href: '/admin/inventory/products' },
    { label: 'Stock Count', icon: '📋', href: '/admin/inventory/stock/count' },
    { label: 'Adjustments', icon: '✏️', href: '/admin/inventory/stock/adjust' },
    { label: 'Import',      icon: '📤', href: '/admin/inventory/import' },
    { label: 'Reports',     icon: '📊', href: '/admin/inventory/reports' },
  ],
}
```

---

## 3. Database Design

### 3.1 New Tables

```sql
-- Core product inventory record, linked to existing bar_items
CREATE TABLE inventory_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_item_id   UUID NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,  -- 1:1 link
  is_active     BOOLEAN DEFAULT true,      -- soft-deactivate without losing history

  -- Conversion rules (per-product, never hardcoded)
  bottle_size_ml     NUMERIC(10,2) NOT NULL,    -- e.g. 750, 1000, 1500
  pour_size_ml       NUMERIC(10,2) NOT NULL,    -- e.g. 25, 30, 50
  tots_per_bottle    NUMERIC(10,2) GENERATED ALWAYS AS (bottle_size_ml / pour_size_ml) STORED,

  -- Current stock snapshot (denormalized for fast reads, recalculated from transactions)
  current_bottles    NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_tots       NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_tot_total  NUMERIC(10,2) GENERATED ALWAYS AS (current_bottles * tots_per_bottle + current_tots) STORED,

  -- Reorder thresholds
  reorder_threshold_bottles NUMERIC(10,2) DEFAULT 3,
  reorder_threshold_tots    NUMERIC(10,2) DEFAULT 0,

  -- Cost tracking (for valuation)
  cost_per_bottle    NUMERIC(10,2),     -- latest purchase price, nullable
  supplier_code      TEXT,               -- the product code used in supplier spreadsheets
  supplier_name      TEXT,               -- default supplier for this product

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(bar_item_id)
);
```

```sql
-- Every stock movement, adjustment, count, purchase, sale, spillage, etc.
CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN (
    'opening', 'purchase', 'sale', 'breakage', 'comp', 'spillage', 'staff',
    'adjustment', 'transfer_out', 'transfer_in', 'return', 'waste',
    'physical_count', 'import'
  )),
  -- Bottle change (positive = increase, negative = decrease)
  bottle_change     NUMERIC(10,2) NOT NULL DEFAULT 0,
  tot_change        NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Running snapshot AFTER this transaction
  bottle_balance    NUMERIC(10,2) NOT NULL,
  tot_balance       NUMERIC(10,2) NOT NULL,

  reference         TEXT,               -- e.g. invoice number, staff name, order ID
  notes             TEXT,
  performed_by      UUID REFERENCES staff(id),   -- who did it (nullable for system)
  import_batch_id   UUID REFERENCES import_batches(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_trans_product ON inventory_transactions(product_id, created_at DESC);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type, created_at DESC);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(created_at);
```

```sql
-- Physical stock count sessions
CREATE TABLE stock_counts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  notes          TEXT,
  performed_by   UUID REFERENCES staff(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- Individual product readings during a stock count
CREATE TABLE stock_count_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id  UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES inventory_products(id),

  physical_bottles NUMERIC(10,2) NOT NULL,
  physical_tots    NUMERIC(10,2) NOT NULL,
  expected_bottles NUMERIC(10,2),
  expected_tots    NUMERIC(10,2),

  variance_bottles NUMERIC(10,2) GENERATED ALWAYS AS (physical_bottles - expected_bottles) STORED,
  variance_tots    NUMERIC(10,2) GENERATED ALWAYS AS (physical_tots - expected_tots) STORED,

  variance_reason  TEXT,

  UNIQUE(stock_count_id, product_id)
);
```

```sql
-- Excel import batch tracking
CREATE TABLE import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type     TEXT NOT NULL CHECK (import_type IN ('supplier_delivery', 'physical_count', 'adjustment')),
  file_name       TEXT NOT NULL,          -- original filename
  storage_path    TEXT NOT NULL,          -- Supabase storage path of uploaded file
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'previewed', 'approved', 'applied', 'rolled_back', 'failed')),
  row_count       INTEGER,
  matched_count   INTEGER,
  unknown_count   INTEGER,
  error_count     INTEGER,
  errors          JSONB,                  -- per-row errors
  applied_by      UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  applied_at      TIMESTAMPTZ
);
```

### 3.2 Existing Tables Modified

Add columns to `bar_items`:
```sql
ALTER TABLE bar_items
  ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN DEFAULT false;
```

No other existing tables are modified.

---

## 4. Bottle/Tot Conversion Engine

### 4.1 Core Math

```
tots_per_bottle = bottle_size_ml / pour_size_ml   (computed, stored as GENERATED column)

Current stock is always stored as:
  - bottles (whole or fractional)
  - leftover tots (always < tots_per_bottle)

After selling N tots:
  total_tots = current_bottles * tots_per_bottle + current_tots
  if total_tots >= N:
      total_tots -= N
      new_bottles = floor(total_tots / tots_per_bottle)
      new_tots    = total_tots % tots_per_bottle
  else:
      error — insufficient stock
```

### 4.2 Example

Product: Jameson 750ml, pour 25ml, tots_per_bottle = 30.

| Action | Tots Sold | Bottles Before | Tots Before | Calculation | Bottles After | Tots After |
|---|---|---|---|---|---|---|
| Opening | — | 20 | 0 | — | 20 | 0 |
| Sell tots | 10 | 20 | 0 | 20×30+0=600; 600-10=590; 590/30=19.67 | 19 | 20 |
| Sell tots | 20 | 19 | 20 | 19×30+20=590; 590-20=570; 570/30=19 | 19 | 0 |
| Sell tots | 6 | 19 | 0 | 19×30+0=570; 570-6=564; 564/30=18.8 | 18 | 24 |
| Open bottle | — | 18 | 24 | 18×30+24=564; +30 tots = 594; 594/30=19.8 | 19 | 24 |

### 4.3 Key Principle

A "bottle" is never partially opened in the stock display. If 19 bottles and 20 tots remain, a bartender sees **19 bottles + 20 tots**, not **19.67 bottles**. The system automatically rolls over accumulated tots into a full bottle through either a purchase transaction (+1 bottle, 0 tots) or a physical count correction.

---

## 5. Inventory Workflow

### 5.1 Daily Process

1. **Opening** — At start of day/shift, the system creates an opening stock snapshot based on closing stock from previous day.
2. **During service** — Staff record:
   - Tots sold (manual entry or future POS integration)
   - Bottles sold (for bottle-service customers)
   - Breakages (broken bottle: −1 bottle)
   - Spillage (spilled tots: −N tots)
   - Comp drinks (given away: −N tots)
   - Staff drinks (staff consumption: −N tots)
3. **Supplier delivery** — Manager records incoming stock via:
   - Excel import (preferred)
   - Manual entry (single item or quick-add)
4. **Closing / Physical count** — Manager or staff do a physical count. Entered via:
   - Excel import
   - Touch-friendly count form (bottles + tots per product)
5. **Reconciliation** — System compares expected stock (opening + purchases − sales − waste) against actual physical count.
6. **Investigation** — If variance exceeds threshold (default: 5%), the manager records a reason.

### 5.2 Transaction Types

| Type | Bottles | Tots | When Used |
|---|---|---|---|
| opening | +N | +N | System-generated at start of tracking period |
| purchase | +N | 0 | Supplier delivery, bottles received |
| sale | 0 | −N | Customer purchases (tots) |
| sale_bottle | −N | 0 | Customer purchases (full bottle) |
| breakage | −N | 0 | Bottle dropped/broken |
| spillage | 0 | −N | Drink spilled during preparation |
| comp | 0 | −N | Complimentary drink given |
| staff | 0 | −N | Staff consumption |
| waste | 0 | −N | Excess poured out (e.g. end-of-night) |
| adjustment | ±N | ±N | Manual correction for any reason |
| transfer_out | −N | −N | Moved to another bar/storage |
| transfer_in | +N | +N | Received from another bar/storage |
| physical_count | ±N | ±N | Correction applied after stock count |
| return | +N | 0 | Returned to supplier |

---

## 6. Excel Import Workflow

### 6.1 Supported Spreadsheet Formats

#### Format A — Supplier Delivery
| Column | Example | Notes |
|---|---|---|
| Product Name | Jameson 750ml | Matched against `bar_items.name` + `inventory_products.supplier_code` |
| Supplier Code | JMS-750 | Used for exact matching (if available) |
| Bottle Size | 750ml | Validated against `inventory_products.bottle_size_ml` |
| Quantity | 20 | Number of bottles received |
| Cost per Bottle | R180 | Optional, updates `inventory_products.cost_per_bottle` |
| Total Cost | R3,600 | Calculated if cost per bottle omitted |
| Notes | Delivery #4821 | Optional reference |

#### Format B — Physical Stock Count
| Column | Example | Notes |
|---|---|---|
| Product Name | Jameson 750ml | Fuzzy-matched against `bar_items.name` |
| Full Bottles | 19 | Count of unopened bottles |
| Partial Tots | 20 | Count of tots remaining in open bottle |
| Location | Main Bar | Optional — for future multi-bar support |

#### Format C — Combined (Supplier delivers and counts simultaneously)
Both Format A and B columns can be present. System detects type by which columns are filled.

### 6.2 Matching Algorithm

When an Excel file is uploaded:

1. **Exact match** — Try `supplier_code` first (most reliable). If found, link directly.
2. **Name match** — Normalize both names (lowercase, remove special chars, strip common suffixes like "ml", "750ml", "bottle"). Try exact match on normalized name.
3. **Fuzzy match** — Levenshtein distance / trigram similarity on normalized name. Threshold: 0.8.
4. **Auto-suggest** — For names with similarity 0.6–0.8, present suggestions to the manager.
5. **Unknown** — Names with similarity < 0.6 go to the "Unknown Products" list.

### 6.3 Import UI Flow

```
[Upload Excel] → [Parse & Validate] → [Review Preview] → [Approve] → [Apply] → [Success/Rollback]
                        │                    │
                   ┌────┴────┐          ┌────┴────┐
                   │ Errors  │          │ Changes │
                   │ Warnings│          │ Preview │
                   └─────────┘          └─────────┘
```

**Preview screen shows per-row:**
- ✅ Matched — green check, shows product name + current stock → new stock
- ⚠️ Fuzzy — yellow warning, shows suggested match with confirm/reject button
- ❓ Unknown — red highlight, shows "Unknown product" badge
- ❌ Error — red with error message (invalid quantity, negative value, etc.)

**After approval:**
- All matched rows are applied as `inventory_transactions` (type: `purchase` or `physical_count`)
- Unknown products are SKIPPED (not silently dropped — manager sees a summary)
- An `import_batches` record is created for audit trail
- If any row fails during application, the ENTIRE batch rolls back

### 6.4 Rollback

Every import batch records a snapshot of affected product stock levels BEFORE the import. If a rollback is requested within 24 hours, the system restores those snapshots. Rollback is shown as a reversal transaction in the audit log so it's never invisible.

---

## 7. Reconciliation Engine

This is the most valuable feature for management.

### 7.1 Expected Stock Calculation

```
expected_bottles = opening_bottles + purchase_bottles - sale_bottles - breakage_bottles - transfer_out_bottles + transfer_in_bottles
expected_tots    = opening_tots + purchase_tots - sale_tots - spillage_tots - comp_tots - staff_tots - waste_tots + transfer_in_tots - transfer_out_tots
```

### 7.2 Variance Calculation

```
variance_bottles = physical_bottles - expected_bottles
variance_tots    = physical_tots - expected_tots

variance_value   = (variance_bottles * cost_per_bottle) + (variance_tots * (cost_per_bottle / tots_per_bottle))
variance_pct     = variance_tot_total / expected_tot_total * 100
```

### 7.3 Reconciliation Dashboard

| Product | Expected | Physical | Variance | Value | Status |
|---|---|---|---|---|---|
| Jameson 750ml | 19 btls + 10 tots | 19 btls + 6 tots | −4 tots | −R24.00 | ⚠️ |
| Black Label | 12 btls + 0 tots | 12 btls + 0 tots | 0 | R0.00 | ✅ |
| Smirnoff 1L | 8 btls + 12 tots | 7 btls + 18 tots | −24 tots | −R72.00 | 🔴 |

### 7.4 Automated Variance Triage

| Variance | Possible Cause | Alert |
|---|---|---|
| Negative (missing stock) | Over-pouring, theft, unrecorded comp, spillage | 🔴 High |
| Positive (extra stock) | Under-pouring, incorrect count, supplier over-delivery | 🟡 Medium |
| Repeated on same product | Training issue, systematic over-pour | 🔴 High |
| Random across products | Counting error | 🟢 Low |

---

## 8. Alert System

### 8.1 Alert Types

| Alert | Trigger | Severity |
|---|---|---|
| Low stock | `current_bottles <= reorder_threshold_bottles` | 🟡 |
| Out of stock | `current_bottles == 0 && current_tots == 0` | 🔴 |
| High variance | variance > 5% | 🔴 |
| Repeated breakages | ≥2 breakage transactions on same product within 7 days | 🟡 |
| Repeated wastage | ≥3 wastage transactions on same product within 7 days | 🟡 |
| Products not counted | Product not updated in a stock count for >14 days | 🟡 |
| Suspicious adjustment | Manual adjustment >10% of current stock | 🔴 |
| Fast mover | Product sold >50% of stock within 7 days | 🟢 |
| Slow mover | Product unsold for >30 days with >10 bottles | 🟢 |
| Dead stock | No sales, no adjustments for >90 days | 🟢 |
| Negative stock | `current_tot_total < 0` (should never happen) | 🔴 |

### 8.2 Delivery

- Alerts appear on the Inventory Dashboard as cards.
- A bell icon in the admin header shows unread alert count.
- Optional: email/SMS alert to manager for critical alerts (🔴 only).

---

## 9. Dashboard Design

### 9.1 Summary Cards (Top Row)

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Stock Value  │ │ Low Stock   │ │ Today's     │ │ Variance    │ │ Products    │
│ R124,500.00  │ │ 7 products  │ │ Sales       │ │ Rate 3.2%   │ │ 84 tracked  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### 9.2 Alert Cards (Second Row)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔴 Out of Stock: Smirnoff 1L, Jack Daniels 750ml — Reorder now     │
│ 🟡 Low Stock: Jameson (4 btls), Black Label (6 btls)               │
│ 🟢 Fast Mover: Captain Morgan (sold 60% in 7 days)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 Quick Actions (Third Row)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📤 Import│ │ 📋 Count │ │ ✏️ Adjust │ │ 📊 Recon │ │ 📦 Order │
│ Excel    │ │ Stock    │ │ Stock    │ │ ciliation│ │ Report   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 9.4 Product Table (Main Area)

Sortable, filterable, searchable table with:

| Product | Category | Stock (B+T) | Value | Sold Today | Low? | Last Count |
|---|---|---|---|---|---|---|
| Jameson 750ml | Whisky | 19 B + 20 T | R3,420 | 10 tots | 🟡 | 2026-07-27 |

### 9.5 Recent Activity (Right Sidebar)

```
Recent Activity
───────────────
📤 Imported delivery #4821 (12 products) — 2h ago
✏️ Adjusted Smirnoff −4 tots (spillage) — 3h ago
📋 Stock count completed (84/84 products) — yesterday
⚠️ Variance: Jameson −6 tots (2.1%) — yesterday
```

---

## 10. Reports

### 10.1 Report Types

| Report | Frequency | Content |
|---|---|---|
| Daily Stock Report | Daily | Opening, purchases, sales, closing for all products |
| Weekly Variance Report | Weekly | Expected vs actual, variance %, top 5 variances |
| Monthly Summary | Monthly | Stock movement, total costs, total variance value |
| Pour Cost Report | Monthly | Cost of goods sold vs revenue by product |
| Staff Adjustment Report | Weekly | Who made what adjustments, with timestamps |
| Supplier Delivery Log | Per delivery | What was received, by whom, cost |
| Fast/Flow Movers | Weekly | Ranking by turnover rate |
| Dead Stock | Monthly | Products with zero movement |
| Inventory Valuation | On demand | Current stock × cost per bottle |
| Top-Selling Drinks | Weekly/Monthly | By volume (tots) and by revenue |
| Loss Report | Weekly | Breakages, spillage, comp, waste totals |
| Reconciliation Audit | Per count | Full variance breakdown with reasons |

### 10.2 Export Formats

- PDF (for printing/sharing)
- CSV/Excel (for further analysis)

---

## 11. User Permissions

| Permission | Manager | Assistant Manager | Bartender | Owner |
|---|---|---|---|---|
| View inventory dashboard | ✅ | ✅ | ❌ | ✅ |
| View products | ✅ | ✅ | ✅ | ✅ |
| Record sales (tots) | ✅ | ✅ | ✅ | ❌ |
| Record breakages | ✅ | ✅ | ✅ | ❌ |
| Record spillage | ✅ | ✅ | ✅ | ❌ |
| Record comp drinks | ✅ | ✅ | ⚠️ (limited) | ❌ |
| Record staff drinks | ✅ | ✅ | ✅ | ❌ |
| Adjust stock | ✅ | ✅ | ❌ | ✅ |
| Import Excel | ✅ | ⚠️ (preview only) | ❌ | ✅ |
| Approve import | ✅ | ❌ | ❌ | ✅ |
| Rollback import | ✅ | ❌ | ❌ | ✅ |
| Configure products | ✅ | ❌ | ❌ | ✅ |
| View reports | ✅ | ✅ | ❌ | ✅ |
| Export reports | ✅ | ✅ | ❌ | ✅ |
| Delete history | ❌ | ❌ | ❌ | ❌ |

Note: Permissions are enforced via the existing `staff` table roles. No new auth system needed.

---

## 12. Future Scalability

The schema is designed so that adding these features requires no structural changes:

| Future Feature | How Schema Supports It |
|---|---|
| **Multiple bars** | Add `location_id` to `inventory_transactions`, `stock_counts`, `inventory_products` |
| **Multiple branches** | Same `location_id` approach, scoped by branch |
| **Multiple storage rooms** | Same approach — `location_id` can reference bar, cellar, walk-in, etc. |
| **Purchase orders** | An `inventory_purchase_orders` table linking to `inventory_transactions.purchase` |
| **Supplier invoices** | Add `invoice_url` to `import_batches`, link to purchase transactions |
| **Barcode scanning** | Add `barcode` column to `inventory_products` |
| **QR code scanning** | Same — barcode column can hold EAN, UPC, or QR |
| **Mobile stock counting** | API routes already serve JSON; build a mobile-optimized form or use the existing touch-friendly pattern |
| **Offline mode** | IndexedDB cache of products + pending transactions; sync when online |
| **POS integration** | Replace manual sales with auto-generated transactions from POS order items |
| **Kitchen inventory** | Use the same schema — just different product types (food ingredients) |

---

## 13. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Managers don't use the system | Medium | High | Invest in UX, tablet-friendly, quick entry. Excel import reduces friction. |
| Conversion math confusion | Low | High | Display stock in bottles+tots everywhere. Never show fractions of bottles. Preview before applying. |
| Import matches wrong products | Medium | Medium | Preview screen with fuzzy match confirmation. Rollback available for 24 hours. |
| Excel file format variations | High | Medium | Accept multiple format variants. Provide a downloadable template. Show clear parse errors. |
| Staff resistance to recording waste/comp | High | Medium | Make it a single tap. Show staff "this protects you from being blamed for missing stock." |
| Over-reliance on manual entry | Medium | Medium | Phase 1 will be manual; Phase 2 adds POS integration. The alert system flags products with unexpected variances. |

---

## 14. Recommended Improvements (Beyond Requirements)

1. **Pour cost % per drink** — For each product, show: `(cost of tots sold / revenue from those tots) × 100`. Industry target is 18–24%. Products above 30% flag for attention.

2. **Bottle tag system** — When a new bottle is opened, a tag with date/time/bartender is assigned. This links specific bottles to specific shifts, enabling traceability for quality or loss issues.

3. **Auto-reorder suggestions** — Compare current stock + average daily consumption + supplier lead time. Generate a suggested purchase order quantity.

4. **Waste heatmap** — Visualise which days/times/shifts have the most spillage or breakage. Patterns reveal training needs or schedule issues.

5. **Slow-mover discount suggestion** — Flag products with >3 months unsold stock to prompt a promotion or menu change.

6. **"Happy hour" consumption tracking** — Compare pour sizes during happy hour vs regular service. Detect if staff are over-pouring during busy periods.

7. **Email digest** — Daily 8 AM email to manager: stock value, low-stock alerts, yesterday's variance summary, today's expected deliveries.

8. **Variance reason library** — Predefined dropdown reasons for variance (over-pour, spill, unrecorded comp, theft suspected, counting error, etc.). Tracks which reasons are used most often to spot systemic issues.

9. **Pour cost by bartender** — If each transaction is linked to the staff member who poured it, identify training opportunities.

10. **Predicted stock-out date** — For each product, based on average daily consumption, predict the date when stock will reach zero.

---

## 15. Implementation Phases

### Phase 1 — Core (V1)

**Goal:** Working inventory system with manual entry and Excel import.

**Scope:**
- `inventory_products`, `inventory_transactions`, `stock_counts`, `stock_count_items`, `import_batches` tables
- Product configuration page (set bottle size, pour size, threshold)
- Stock viewing page (current stock in bottles + tots)
- Manual transaction entry (sale, breakage, spillage, comp, staff)
- Excel import (supplier delivery + physical count)
- Reconciliation engine (expected vs actual)
- Basic dashboard (stock value, low stock alerts)
- Admin sidebar integration

**Estimated complexity:** Medium (5-7 days full-time for a single developer)

**Dependencies:** Existing `bar_items` table, `getAdminClient()`, admin auth middleware.

### Phase 2 — Reports & Alerts

**Goal:** Full reporting and intelligent alerts.

**Scope:**
- All report types (daily, weekly, monthly, pour cost, variance)
- Alert system with severity levels
- Reorder threshold notifications
- Email digests
- Report export (PDF, CSV)

**Estimated complexity:** Low-Medium (3-4 days)

### Phase 3 — Automation

**Goal:** Reduce manual entry.

**Scope:**
- POS integration (auto-deduct stock from orders)
- Supplier purchase order generation
- Barcode scanning support
- Opening/closing stock automation
- Mobile-optimized stock count form
- Predicted stock-out dates

**Estimated complexity:** Medium-High (5-7 days)

### Phase 4 — Multi-Venue & Scale

**Goal:** Multi-bar, multi-branch, multi-supplier.

**Scope:**
- `location_id` filtering
- Branch-level dashboards
- Cross-branch transfers
- Centralized purchase orders
- Supplier performance reports
- Offline sync

**Estimated complexity:** High (7-10 days)

---

## 16. Summary

| Aspect | V1 (Now) | V2 | V3 | V4 |
|---|---|---|---|---|
| Bottle/tot tracking | ✅ | ✅ | ✅ | ✅ |
| Excel import | ✅ | ✅ | ✅ | ✅ |
| Manual adjustments | ✅ | ✅ | ✅ | ✅ |
| Reconciliation | ✅ | ✅ | ✅ | ✅ |
| Dashboard | Basic | Full | Full | Full |
| Reports | — | ✅ | ✅ | ✅ |
| Alerts | Basic | Full | Full | Full |
| POS integration | — | — | ✅ | ✅ |
| Multi-venue | — | — | — | ✅ |
| Difficulty | Medium | Low-Med | Med-High | High |
| Timeline | 1 week | 4 days | 1 week | 1.5 weeks |

**Recommendation:** Build Phase 1 (core inventory + reconciliation) first. Managers get immediate value from the daily reconciliation screen showing expected vs physical stock. Everything else builds on that foundation.
