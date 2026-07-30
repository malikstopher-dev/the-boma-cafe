# Inventory Engine — V3.1 Final Architecture Review

**Project:** The Boma Café
**Status:** Addendum to V3 proposal. Core design unchanged.
**Purpose:** Document architectural decisions missing from V3 — UOM strategy, concurrency, recovery, performance, API, sequences, soft delete, recipes.

---

## 0. Updated Principle on Existing Table Changes

**Old principle:** "No existing table changes."

**Revised principle:** "No breaking changes to existing tables. Small additive foreign keys are acceptable where they provide long-term integration and remain fully backward compatible."

A nullable FK column added to an existing table is not a regression if:
- The column defaults to NULL
- No existing query, view, or trigger references it
- No NOT NULL constraint is added
- No existing behaviour depends on it being absent

Example of acceptable change:
```sql
ALTER TABLE bar_items ADD COLUMN inventory_product_id UUID REFERENCES inventory_products(id);
```
This is backward compatible: existing rows get NULL, existing queries ignore it, existing menu items work identically. New menu items can optionally link to inventory for automatic deduction.

---

## 1. Unit of Measure (UOM) Strategy

### 1.1 Principle

The engine stores stock in a **single base unit** per product. This base unit is defined when the product is created and never changes. All transactions record quantity in the base unit. All stock balances are aggregated in the base unit.

Display is a separate concern. The UI can convert to any display unit for human readability.

### 1.2 UOM Types

| Type | Example | Behaviour |
|---|---|---|
| **Discrete** | bottle, can, case, crate, keg, carton, piece, each | Integer only. Cannot be partially consumed in the physical count. |
| **Continuous** | millilitre, gram, litre, kilogram, tot, shot, glass, ounce | Decimal. Can be partially consumed. |

### 1.3 Conversion Chain

Every product has a **primary display unit** (what staff see and count) and a **base storage unit** (what the ledger uses).

```
Product: Jameson Whiskey 750ml
  Display unit:  bottle
  Storage unit:  tot (25ml)

  Conversions:
    1 bottle  = 30 tots    (750ml ÷ 25ml)
    1 case    = 6 bottles   (for bulk ordering)
    1 tot     = 1 tot       (base unit)

Product: Castle Lite
  Display unit:  case (12 bottles)
  Storage unit:  bottle (330ml)

  Conversions:
    1 case     = 12 bottles
    1 bottle   = 1 bottle   (base unit)
    1 crate    = 24 bottles

Product: Milk 2L
  Display unit:  litre
  Storage unit:  millilitre

  Conversions:
    1 litre     = 1000ml
    1 carton    = 2000ml

Product: Sugar (bulk)
  Display unit:  kilogram
  Storage unit:  gram

  Conversions:
    1 kg        = 1000g
    1 bag       = 25000g
```

### 1.4 UOM Table Design

```sql
-- Unit of measure registry
CREATE TABLE inventory_uoms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- "tot", "bottle", "case", "millilitre"
  symbol      TEXT,                    -- "t", "btl", "cs", "ml"
  category    TEXT NOT NULL DEFAULT 'discrete'
              CHECK (category IN ('discrete', 'continuous')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- Conversion rates between UOMs
-- Allows branching conversion trees: case → bottle → tot
CREATE TABLE inventory_uom_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id       UUID NOT NULL REFERENCES inventory_uoms(id),
  to_uom_id         UUID NOT NULL REFERENCES inventory_uoms(id),
  factor            NUMERIC(20,6) NOT NULL,  -- multiply from_uom by this to get to_uom
  product_type      TEXT,                     -- nullable: general conversion vs product-specific
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_uom_id, to_uom_id, COALESCE(product_type, ''))
);

-- Each product defines its hierarchy
CREATE TABLE inventory_product_uoms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  uom_id            UUID NOT NULL REFERENCES inventory_uoms(id),
  is_base           BOOLEAN DEFAULT false,    -- exactly one base UOM per product
  is_display        BOOLEAN DEFAULT false,    -- exactly one display UOM per product
  conversion_factor NUMERIC(20,6) NOT NULL,   -- quantity of this UOM = 1 of base UOM
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, uom_id)
);
```

### 1.5 Storage Convention

All rows in `inventory_transactions` store `quantity` in the product's **base UOM**. The `uom_id` column on the transaction records which UOM was used at input time (for audit), but the quantity is always normalised.

```
Example: Purchase of 2 cases of Castle Lite

inventory_product_uoms for Castle Lite:
  case   → is_display = true,  conversion_factor = 12  (1 case = 12 bottles)
  bottle → is_base = true,     conversion_factor = 1   (1 bottle = 1 base unit)

Input:  quantity = 2, uom_id = case
Ledger: quantity = 24, uom_id = bottle (normalised)
```

### 1.6 Display Conversion

The UI always converts from base UOM to display UOM for human readability:

```javascript
function formatStock(baseQuantity, displayUom, displayConversionFactor) {
  const displayValue = baseQuantity / displayConversionFactor;
  return `${displayValue} ${displayUom.symbol}`;
}
```

### 1.7 What This Enables

| Product Type | Display UOM | Base UOM | Conversion |
|---|---|---|---|
| Whiskey | bottle | tot | 1 bottle = 30 tots |
| Beer (draught) | keg | glass | 1 keg = 88 glasses |
| Beer (bottled) | case | bottle | 1 case = 12 bottles |
| Wine | bottle | glass | 1 bottle = 5 glasses |
| Soft drinks | crate | can | 1 crate = 24 cans |
| Milk | carton | ml | 1 carton = 2000ml |
| Sugar | bag | gram | 1 bag = 25000g |
| Coffee beans | kg | gram | 1 kg = 1000g |
| Cleaning detergent | bottle | ml | 1 bottle = 5000ml |
| Glassware | case | piece | 1 case = 24 pieces |

---

## 2. Cocktail / Recipe Engine (Future — Design Only)

### 2.1 Concept

A cocktail recipe defines **one or more inventory products** that are consumed when a specific menu item is sold. When the POS order includes a Mojito, the engine automatically deducts all ingredients at once.

### 2.2 Data Model (Future)

```sql
-- A recipe links to a bar_item (menu item)
CREATE TABLE bar_recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,              -- "Mojito"
  bar_item_id       UUID REFERENCES bar_items(id),  -- optional: links to menu
  yield_quantity    NUMERIC(10,2) DEFAULT 1,    -- how many drinks this recipe makes
  yield_uom         TEXT DEFAULT 'drinks',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Individual ingredient deductions
CREATE TABLE bar_recipe_ingredients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         UUID NOT NULL REFERENCES bar_recipes(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  quantity          NUMERIC(12,4) NOT NULL,      -- amount consumed in product's base UOM
  uom_id            UUID NOT NULL REFERENCES inventory_uoms(id),
  notes             TEXT,                         -- "muddle fresh", "top with soda"
  UNIQUE(recipe_id, product_id)
);
```

### 2.3 Example: Mojito

```
Recipe: Mojito (yield: 1 drink)

Ingredient                      | Product            | Qty | UOM
White rum                       | Bacardi 1L        | 40  | ml  (or ~1.6 tots at 25ml)
Fresh mint                      | Mint bunch        | 5   | leaves
Fresh lime                      | Lime              | 0.5 | piece
Sugar syrup                     | Simple syrup 1L   | 15  | ml
Soda water                      | Soda water 330ml  | 60  | ml
Ice                             | Ice (bulk)        | 200 | g

Total deduction per sale: ~2.4 inventory products consumed
```

### 2.4 Execution Engine (Future)

When a POS order fires:
1. Look up `bar_item` from order line
2. Find recipe via `bar_recipes.bar_item_id`
3. For each ingredient in `bar_recipe_ingredients`:
   - Create `inventory_transaction` with `transaction_type = 'sale'`
   - Quantity = ingredient.quantity (in base UOM)
   - Reference the POS order as `reference_type = 'pos_order'`
   - Set `performed_by = 'system'`
4. Commit as a single DB transaction (all-or-nothing)

### 2.5 Partial Recipe Matching

Not every ingredient must be tracked. If mint and lime are not in inventory yet, the recipe still works — it only deducts products that exist in `inventory_products`. Unmatched ingredients produce a log entry but don't block the sale.

---

## 3. Soft Delete Strategy

### 3.1 Principle

**Inventory history is immutable.** No transaction is ever deleted. No product with transaction history is ever hard-deleted. The system only supports archival (soft delete) and restoration.

### 3.2 Rules

| Scenario | Behaviour |
|---|---|
| Product with **zero** transactions | Hard-deleted immediately (no history to preserve) |
| Product with **any** transactions | Soft-deleted: `is_active = false` |
| Product linked to menu items | Soft-deleted: menu items remain functional but show "inventory inactive" |
| Supplier with linked purchase orders | Soft-deleted: `is_active = false` |
| Location with linked transactions | Soft-deleted: `is_active = false` |
| Import batch | Permanent: never deletable |
| Stock count | Permanent: never deletable |
| Transaction | **Never deletable.** Period. |

### 3.3 Implementation

```sql
-- Every soft-deletable table has is_active + deleted_at
ALTER TABLE inventory_products
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE inventory_suppliers
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE inventory_locations
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE inventory_categories
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN deleted_at TIMESTAMPTZ;
```

### 3.4 Archive & Restore Flow

```
Archive:
  1. User taps "Archive Product"
  2. System checks: any transactions? If yes:
     - Sets is_active = false
     - Sets deleted_at = NOW()
     - Product disappears from active lists, dashboards, counts
     - Product STILL appears in transaction history (linked by FK)
     - Product STILL appears in import mappings (for audit)
  3. Confirmation shown: "Jameson 750ml archived. 142 transactions preserved."

Restore:
  1. User navigates to "Archived Products" view
  2. Taps "Restore"
  3. System sets is_active = true, deleted_at = NULL
  4. Product reappears in all active views
  5. Stock balance is exactly as it was when archived (ledger doesn't change)

Preventing deletion:
  - API route: DELETE /api/inventory/products/:id
  - Before delete: SELECT COUNT(*) FROM inventory_transactions WHERE product_id = $id
  - If count > 0: return 409 Conflict with message:
    "Cannot delete Jameson 750ml — it has 142 transactions. Archive it instead."
  - UI: Archive button is primary. Delete button only appears for products with zero history.
```

### 3.5 Audit Trail for Soft Deletes

```sql
CREATE TABLE inventory_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name        TEXT NOT NULL,
  record_id         UUID NOT NULL,
  action            TEXT NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored', 'hard_deleted')),
  changes           JSONB,                  -- old_value → new_value
  performed_by      UUID REFERENCES staff(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

Every soft delete and restore writes to this log. Hard deletes (products with zero history) also write to this log before the row is removed.

---

## 4. Concurrency Protection

### 4.1 The Problem

```
Time  | Manager A (Import)             | Manager B (Stock Count)        | Bartender (Wastage)
------|--------------------------------|--------------------------------|---------------------
T1    | BEGIN                          |                                |
T2    |                                | BEGIN                          |
T3    |                                |                                | BEGIN
T4    | Read balance: 19B+10T          |                                |
T5    |                                | Read balance: 19B+10T          |
T6    |                                |                                | Read balance: 19B+10T
T7    | Add +10B purchase              |                                |
T8    |                                | Set physical: 29B+10T          |
T9    |                                |                                | Record −2T spillage
T10   | COMMIT (balance: 29B+10T)      |                                |
T11   |                                | COMMIT (balance: 29B+10T)      |
      |                                |   ⚠️ Count didn't include the  |
      |                                |      new stock in expected      |
T12   |                                |                                | COMMIT (balance: 29B+8T)
```

The stock count at T8 only sees the old balance (19B+10T) because Manager A's transaction is uncommitted. The count "undoes" the purchase.

### 4.2 Solution Strategy

The transaction-ledger model makes this much simpler than a snapshot model because **there is no single "current balance" row to race on**. Each transaction is an append-only INSERT. There is no UPDATE to conflict on.

However, the **running_balance** column (denormalised for fast reads) does need protection.

#### 4.2.1 Optimistic Locking (for stock count approval)

```sql
-- When starting a stock count:
-- 1. Record the current running_balance as the "expected" value
-- 2. Store the last_transaction_id at that moment

-- When approving the count:
UPDATE inventory_stock_counts
SET status = 'approved',
    snapshot_last_tx_id = (SELECT MAX(id) FROM inventory_transactions WHERE product_id = $product_id)
WHERE id = $count_id;

-- When applying count corrections, INSERT transactions with a CHECK constraint:
-- "running_balance must equal previous running_balance + quantity"
-- If another transaction was inserted between read and write, the running_balance won't match,
-- and the INSERT fails → retry.
```

**Simpler approach — no running_balance at all:**

Skip the `running_balance` column entirely in V1. Current balance is always `SUM(quantity)`. This eliminates the race condition because INSERTs are append-only and don't conflict.

If performance requires a denormalised balance, use a **fast-path refresh** that sums only transactions since last balance:

```sql
-- Refresh one product's balance
current_balance = previous_balance + SUM(quantity since last refresh)
-- This is idempotent and handles concurrent inserts correctly
-- because SUM is additive and commutative
```

#### 4.2.2 Transaction Isolation Level

Use PostgreSQL's default `READ COMMITTED` isolation. This ensures:
- Every INSERT sees the latest committed state for `running_balance` computation
- Two concurrent INSERTs for the same product both succeed (SUM is additive)
- No deadlocks (INSERTs don't conflict with each other)

Serialisable isolation is NOT needed for the ledger model because there is no read-modify-write cycle on a shared row.

#### 4.2.3 Import/Count Approval Locking

For the **approval step** (where multiple adjustments are applied atomically):

```sql
-- Wrap the entire import application in a SINGLE PostgreSQL transaction
BEGIN;
  -- All INSERTs happen inside one transaction
  -- If any fails, all roll back
COMMIT;
```

PostgreSQL's transactional guarantees ensure that either all import rows apply or none do. No partial imports.

#### 4.2.4 Advisory Locks (for rare heavy operations)

For operations that MUST not overlap (e.g. materialized view refresh):

```sql
SELECT pg_advisory_xact_lock(hashtext('inventory_balance_refresh'));
REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_product_balances;
```

This prevents two concurrent refreshes while allowing normal transaction INSERTs to proceed.

#### 4.2.5 Conflict Resolution

| Scenario | Resolution |
|---|---|
| Two imports apply simultaneously | Both succeed. Ledger adds both sets of quantities. Order doesn't matter. |
| Stock count and import overlap | Count sees stock INCLUDING the import (if committed) or EXCLUDING it (if not). Either is correct — the count captures physical reality. |
| Stock count and wastage overlap | Same as above. The wastage is either in or out of the expected calculation. Next day's reconciliation catches any discrepancy. |
| Materialized view refresh during write | `CONCURRENTLY` mode allows reads during refresh. Stale data is tolerated for <1 second. |

### 4.3 Recommendation for V1

**Skip the `running_balance` column entirely.** Compute current balance via `SUM(quantity)` with proper indexes. This eliminates all write-side concurrency concerns. The performance trade-off is acceptable for V1 scale (<5,000 products, <50,000 transactions).

---

## 5. Backup & Recovery

### 5.1 Built-In Recovery Mechanisms

The transaction-ledger model provides **natural recovery** that snapshot-based models cannot match.

| Scenario | Recovery Method |
|---|---|
| **Accidental import** | Tap [Rollback] on import batch page (available 24h). Creates reversal transactions. |
| **Failed import** | Import shows `status = 'failed'`. No transactions were created. User retries. |
| **Corrupted import batch** | Same as failed import. Rollback reversal transactions undo any partial application. |
| **Accidental product archive** | Navigate to Archived Products → Tap [Restore]. |
| **Accidental transaction** | Record a compensating transaction with notes: "Reverses transaction X." |
| **Data corruption (application bug)** | See section 5.2. |
| **Data corruption (database-level)** | See section 5.3. |
| **Accidental deletion (with history)** | Not possible — API blocks deletion of products with history. |
| **Accidental deletion (no history)** | Recover from daily database backup. |

### 5.2 Application-Level Recovery

Because the transaction ledger is append-only and immutable, recovery from an application bug is straightforward:

```
1. Identify the buggy transactions:
   SELECT * FROM inventory_transactions
   WHERE created_at BETWEEN $bug_start AND $bug_end;

2. For each buggy transaction, create a reversal:
   INSERT INTO inventory_transactions (
     product_id, location_id, transaction_type,
     quantity, notes, performed_by
   ) VALUES (
     $product_id, $location_id, 'adjustment',
     -$buggy_quantity,  -- reverse it
     'Automatic reversal of buggy transaction {id}',
     $admin_user
   );

3. Verify the balance is restored:
   SELECT SUM(quantity) FROM inventory_transactions
   WHERE product_id = $product_id;
```

This is safe because a reversal is itself a transaction — it appears in the audit trail, has a performed_by, and can itself be reversed if needed.

### 5.3 Database-Level Backup Strategy

| Backup Type | Frequency | Retention | Recovery Point |
|---|---|---|---|
| **Daily full backup** (pg_dump) | Every 24 hours | 30 days | Lose up to 24 hours |
| **WAL archiving** (continuous) | Real-time | 7 days | Lose up to 1 minute |
| **Monthly snapshot** | Every 30 days | 12 months | Emergency recovery |

Restore procedure:
1. Stop application (maintenance mode)
2. Restore latest full backup
3. Replay WAL to desired point in time
4. Verify transaction count matches expected
5. Resume application

### 5.4 Exports for External Backup

The transaction ledger should be exportable to CSV at any time:

```
Endpoint: GET /api/inventory/transactions/export
Parameters: start_date, end_date, product_id (optional), location_id (optional)
Output: CSV file with ALL transaction columns

Recommended: Scheduled weekly export emailed to manager
  "Inventory Transaction Ledger — 19 Jul – 26 Jul 2026"
  "1,247 transactions · 84 products · R124,500.00 inventory value"
```

### 5.5 Disaster Recovery Runbook

```
SCENARIO: Accidental duplicate import

1. Manager notices stock is 10 bottles too high
2. Opens Import History → finds the duplicate batch
3. Taps [Rollback Import]
4. System creates reversal transactions:
   - Jameson 750ml: −10 bottles
   - Smirnoff 1L: −5 bottles
   - etc.
5. Stock returns to pre-import state
6. Import batch shows "Rolled Back" status
7. Audit log records: "Admin 'John' rolled back import IMP-042 (duplicate)"

Total time: 30 seconds. No data loss.
```

---

## 6. Performance Targets

### 6.1 Target Scale

| Metric | V1 Target | Future Target |
|---|---|---|
| Products | 500 | 5,000 |
| Locations | 3 | 50 |
| Suppliers | 15 | 200 |
| Daily transactions | 200 | 5,000 |
| Total transactions | 50,000 | 500,000 |
| Import rows per file | 200 | 10,000 |
| Concurrent users | 5 | 50 |

### 6.2 Response Time Targets

| Operation | Target | Measured At |
|---|---|---|
| Dashboard load | < 2 seconds | API response time |
| Product list (paginated) | < 1 second | API response time |
| Single product detail with history | < 500 ms | API response time |
| Stock balance lookup (single product) | < 100 ms | Database query time |
| Stock balance lookup (all products, dashboard) | < 1 second | Database query time |
| Transaction INSERT | < 50 ms | Database write time |
| Import preview (200 rows) | < 3 seconds | End-to-end (parse + match + render) |
| Import apply (200 rows) | < 2 seconds | Database write (single transaction) |
| Stock count save (84 products) | < 1 second | Database write (single transaction) |
| Reconciliation report | < 3 seconds | Database query + calculation |
| Materialized view refresh | < 2 seconds | Database maintenance operation |

### 6.3 Design Decisions Driven by Performance Targets

| Target | Design Decision |
|---|---|
| Dashboard < 2s with 500K transactions | Materialized view for balances. Avoid SUM across all products on every dashboard load. |
| Stock lookup < 100ms | Index on `(product_id, created_at DESC)` covering `quantity`. |
| Import apply < 2s for 200 rows | Single PostgreSQL transaction. No per-row API calls. |
| Dashboard < 2s | Cache dashboard aggregates for 60 seconds. Real-time = expensive; 60s stale is acceptable for inventory. |
| Reconciliation < 3s | Pre-calculate expected balances at stock count start time. Don't re-scan entire transaction history. |

### 6.4 Index Strategy

```sql
-- Core query: "Get current balance for product X at location Y"
-- SELECT SUM(quantity) FROM inventory_transactions
-- WHERE product_id = $1 AND location_id = $2;
CREATE INDEX idx_tx_balance_lookup
  ON inventory_transactions(product_id, location_id, quantity);
-- This is a covering index: the query never touches the table.

-- Query: "Get transaction history for product X"
-- SELECT * FROM inventory_transactions WHERE product_id = $1 ORDER BY created_at DESC;
CREATE INDEX idx_tx_product_history
  ON inventory_transactions(product_id, created_at DESC);

-- Query: "Get count of transactions per type per day"
CREATE INDEX idx_tx_type_date
  ON inventory_transactions(transaction_type, created_at);

-- Query: "Find transactions by reference"
CREATE INDEX idx_tx_reference
  ON inventory_transactions(reference_type, reference_id);
```

### 6.5 Materialized View Refresh Strategy

For V1 scale (<50K transactions), `SUM` on every read is acceptable. Add the materialized view only when performance monitoring shows it's needed.

When added, refresh strategy:

| Trigger | Method | Latency |
|---|---|---|
| After every transaction INSERT | `REFRESH MATERIALIZED VIEW CONCURRENTLY` | <2 seconds |
| Or: every 60 seconds (cron) | `REFRESH MATERIALIZED VIEW CONCURRENTLY` | Up to 60s stale |
| Or: on-demand | Only when dashboard loads | Dashboard load + 2s |

**Recommendation for V1:** No materialized view. Start with direct `SUM` queries. Add materialized view in Phase 2 if needed.

### 6.6 Pagination Strategy

All list endpoints use **cursor-based pagination** (keyset pagination), not offset-based:

```sql
-- Good: cursor-based (stable, fast, works with real-time inserts)
SELECT * FROM inventory_transactions
WHERE product_id = $1 AND created_at < $cursor
ORDER BY created_at DESC
LIMIT 50;

-- Bad: offset-based (breaks when new rows are inserted, expensive at high offsets)
SELECT * FROM inventory_transactions
WHERE product_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET $page * 50;
```

---

## 7. API Specification (Endpoints Only)

### 7.1 Products

```
GET    /api/inventory/products                  → List products (paginated, filterable)
GET    /api/inventory/products/search?q=        → Search products by name/SKU/barcode
GET    /api/inventory/products/:id              → Product detail with current balance
POST   /api/inventory/products                   → Create product (with UOM config)
PATCH  /api/inventory/products/:id              → Update product
DELETE /api/inventory/products/:id              → Soft-delete (or hard-delete if no history)
POST   /api/inventory/products/:id/restore      → Restore archived product
GET    /api/inventory/products/:id/transactions → Product transaction history (paginated)
GET    /api/inventory/products/:id/balance      → Current balance (by location)

GET    /api/inventory/products/archived         → List archived products
GET    /api/inventory/products/export           → Export product list as CSV
```

### 7.2 Transactions

```
GET    /api/inventory/transactions               → List transactions (paginated, filterable)
POST   /api/inventory/transactions               → Record a single transaction
POST   /api/inventory/transactions/batch         → Record multiple transactions (atomic)
GET    /api/inventory/transactions/:id           → Transaction detail
GET    /api/inventory/transactions/types         → List valid transaction types
GET    /api/inventory/transactions/export        → Export transaction ledger as CSV
```

### 7.3 Stock Counts

```
GET    /api/inventory/stock-counts               → List stock count sessions
POST   /api/inventory/stock-counts               → Create new stock count session
GET    /api/inventory/stock-counts/:id           → Count session detail (all items)
PATCH  /api/inventory/stock-counts/:id           → Update count session metadata
POST   /api/inventory/stock-counts/:id/items     → Save count items (batch)
PATCH  /api/inventory/stock-counts/:id/items/:itemId → Update single count item
POST   /api/inventory/stock-counts/:id/submit    → Submit count for review
POST   /api/inventory/stock-counts/:id/approve   → Approve count (applies adjustments)
POST   /api/inventory/stock-counts/:id/cancel    → Cancel count session
GET    /api/inventory/stock-counts/:id/reconciliation → Reconciliation report for this count
```

### 7.4 Imports

```
GET    /api/inventory/imports                    → List import batches
POST   /api/inventory/imports/upload             → Upload Excel file (multipart)
GET    /api/inventory/imports/:id                → Import detail with per-row status
POST   /api/inventory/imports/:id/preview        → Parse and return preview (no apply)
POST   /api/inventory/imports/:id/approve        → Approve and apply import
POST   /api/inventory/imports/:id/rollback       → Rollback import (within 24h)
GET    /api/inventory/imports/:id/download       → Download original uploaded file

GET    /api/inventory/import-mappings            → List saved import mappings
POST   /api/inventory/import-mappings            → Create import mapping
DELETE /api/inventory/import-mappings/:id        → Delete import mapping
```

### 7.5 Suppliers

```
GET    /api/inventory/suppliers                  → List suppliers
POST   /api/inventory/suppliers                  → Create supplier
GET    /api/inventory/suppliers/:id              → Supplier detail with product list
PATCH  /api/inventory/suppliers/:id              → Update supplier
DELETE /api/inventory/suppliers/:id              → Soft-delete
POST   /api/inventory/suppliers/:id/restore      → Restore archived supplier
GET    /api/inventory/suppliers/:id/performance  → Supplier performance metrics
GET    /api/inventory/suppliers/:id/products     → Products from this supplier
```

### 7.6 Locations

```
GET    /api/inventory/locations                  → List locations
POST   /api/inventory/locations                  → Create location
GET    /api/inventory/locations/:id              → Location detail
PATCH  /api/inventory/locations/:id              → Update location
DELETE /api/inventory/locations/:id              → Soft-delete
POST   /api/inventory/locations/:id/restore      → Restore archived location
GET    /api/inventory/locations/:id/stock        → Stock summary for this location
```

### 7.7 Purchase Orders (Future)

```
GET    /api/inventory/purchase-orders            → List POs
POST   /api/inventory/purchase-orders            → Create PO
GET    /api/inventory/purchase-orders/:id        → PO detail
PATCH  /api/inventory/purchase-orders/:id        → Update PO
POST   /api/inventory/purchase-orders/:id/submit → Submit to supplier
POST   /api/inventory/purchase-orders/:id/cancel → Cancel PO
POST   /api/inventory/purchase-orders/:id/receive → Record partial/full receipt
GET    /api/inventory/purchase-orders/suggested  → Get suggested PO from low-stock
GET    /api/inventory/purchase-orders/export     → Export POs as CSV
```

### 7.8 Dashboards & Reports

```
GET    /api/inventory/dashboard                  → Dashboard aggregates (KPIs, alerts, recent)
GET    /api/inventory/dashboard/alerts           → Active alerts list
GET    /api/inventory/dashboard/kpis             → KPI numbers only (fast)

GET    /api/inventory/reports/daily              → Daily stock report
GET    /api/inventory/reports/variance           → Variance report
GET    /api/inventory/reports/waste              → Waste/breakage report
GET    /api/inventory/reports/fast-movers        → Fast movers ranking
GET    /api/inventory/reports/slow-movers        → Slow movers ranking
GET    /api/inventory/reports/valuation          → Inventory valuation
GET    /api/inventory/reports/booking/:bookingId → Booking consumption report
```

### 7.9 UOMs & Categories

```
GET    /api/inventory/uoms                       → List units of measure
POST   /api/inventory/uoms                       → Create UOM
GET    /api/inventory/uoms/:id                   → UOM detail
DELETE /api/inventory/uoms/:id                   → Delete (only if unused)
GET    /api/inventory/uoms/conversions           → List conversion rules
POST   /api/inventory/uoms/conversions           → Create conversion rule

GET    /api/inventory/categories                 → List categories (tree)
POST   /api/inventory/categories                 → Create category
PATCH  /api/inventory/categories/:id             → Update category
DELETE /api/inventory/categories/:id             → Soft-delete
```

### 7.10 Menu Integration

```
GET    /api/inventory/menu-items                 → List bar_items with inventory links
POST   /api/inventory/menu-items/:id/link        → Link menu item to inventory product
DELETE /api/inventory/menu-items/:id/link        → Unlink menu item from inventory
GET    /api/inventory/menu-items/unlinked        → Menu items without inventory links
```

---

## 8. Sequence Diagrams

### 8.1 Supplier Delivery (Excel Import)

```
  Staff/Manager            Inventory System             Database
      │                          │                         │
      │  1. Upload Excel         │                         │
      │ ───────────────────────► │                         │
      │                          │  2. Store file in       │
      │                          │     Supabase Storage    │
      │                          │ ──────────────────────► │
      │                          │  3. Save import_batch   │
      │                          │     (status: pending)   │
      │                          │ ──────────────────────► │
      │                          │                         │
      │  4. Return preview       │                         │
      │ ◄─────────────────────── │                         │
      │                          │                         │
      │  5. Review rows          │                         │
      │     - matched: 10        │                         │
      │     - unknown: 1         │                         │
      │     - errors: 0          │                         │
      │                          │                         │
      │  6. Choose action for    │                         │
      │     unknown product      │                         │
      │     "Create New Product" │                         │
      │                          │                         │
      │  7. Tap [Apply Import]   │                         │
      │ ───────────────────────► │                         │
      │                          │  8. BEGIN transaction   │
      │                          │ ──────────────────────► │
      │                          │  9. Create new product  │
      │                          │     (if applicable)     │
      │                          │ ──────────────────────► │
      │                          │ 10. INSERT transactions │
      │                          │     (type: purchase)    │
      │                          │     for each row        │
      │                          │ ──────────────────────► │
      │                          │ 11. Save import mapping │
      │                          │     (for future match)  │
      │                          │ ──────────────────────► │
      │                          │ 12. Update batch status │
      │                          │     (status: applied)   │
      │                          │ ──────────────────────► │
      │                          │ 13. COMMIT              │
      │                          │ ──────────────────────► │
      │                          │                         │
      │ 14. Success confirmation  │                         │
      │ ◄─────────────────────── │                         │
      │                          │                         │
      │  (If rollback needed later:)                       │
      │                          │                         │
      │ 15. Tap [Rollback Import]│                         │
      │ ───────────────────────► │                         │
      │                          │ 16. BEGIN transaction   │
      │                          │ ──────────────────────► │
      │                          │ 17. INSERT reversal     │
      │                          │     transactions for    │
      │                          │     each original row   │
      │                          │ ──────────────────────► │
      │                          │ 18. Update batch status │
      │                          │     (status: rolled_back)│
      │                          │ ──────────────────────► │
      │                          │ 19. COMMIT              │
      │                          │ ──────────────────────► │
      │ 20. Rollback confirmed   │                         │
      │ ◄─────────────────────── │                         │
```

### 8.2 Physical Stock Count

```
  Staff/Manager            Inventory System             Database
      │                          │                         │
      │  1. Tap [New Stock Count]│                         │
      │ ───────────────────────► │                         │
      │                          │  2. Create count session│
      │                          │     (status: in_progress)│
      │                          │ ──────────────────────► │
      │                          │  3. Load product list   │
      │                          │     + expected balances │
      │                          │ ◄────────────────────── │
      │                          │                         │
      │  4. Show card UI         │                         │
      │ ◄─────────────────────── │                         │
      │                          │                         │
      │  ┌─── Count Loop ───────────────────────────┐     │
      │  │                                           │     │
      │  │  5. Adjust bottles (tap +/-)              │     │
      │  │  6. Adjust tots (tap +/-)                  │     │
      │  │  7. Swipe to next product                 │     │
      │  │  8. Auto-save individual card              │     │
      │  │ ────────────────────────────────────────────► │   │
      │  └───────────────────────────────────────────┘     │
      │                          │                         │
      │  9. Tap [Submit Count]   │                         │
      │ ───────────────────────► │                         │
      │                          │ 10. Validate all items  │
      │                          │ 11. Calculate variances │
      │                          │     per product         │
      │                          │ 12. Save all count items│
      │                          │ ──────────────────────► │
      │                          │                         │
      │ 13. Show summary         │                         │
      │     - 84/84 counted      │                         │
      │     - 3 variances > 5%   │                         │
      │ ◄─────────────────────── │                         │
      │                          │                         │
      │ 14. Tap [Approve Count]  │                         │
      │ ───────────────────────► │                         │
      │                          │ 15. BEGIN transaction   │
      │                          │ ──────────────────────► │
      │                          │ 16. For each product    │
      │                          │     with variance:      │
      │                          │     INSERT transaction  │
      │                          │     (type: physical_count│
      │                          │      quantity: variance)│
      │                          │ ──────────────────────► │
      │                          │ 17. Update count status │
      │                          │     (status: completed) │
      │                          │ ──────────────────────► │
      │                          │ 18. COMMIT              │
      │                          │ ──────────────────────► │
      │                          │                         │
      │ 19. "Count approved.     │                         │
      │     4 adjustments applied.│                         │
      │     Variance: −22 tots." │                         │
      │ ◄─────────────────────── │                         │
      │                          │                         │
      │ 20. (Optional) Add        │                         │
      │     variance reasons      │                         │
      │ ───────────────────────► │ 21. Save reasons        │
      │                          │ ──────────────────────► │
```

### 8.3 Purchase Order Flow (Future)

```
  Manager              Inventory System           Supplier            Database
    │                        │                       │                   │
    │  1. View dashboard     │                       │                   │
    │ ◄──── low stock ────── │                       │                   │
    │  2. Tap [Generate PO]  │                       │                   │
    │ ─────────────────────► │                       │                   │
    │                        │  3. Calculate needed  │                   │
    │                        │     quantities        │                   │
    │                        │     (PAR - current +  │                   │
    │                        │      lead_time_buffer)│                   │
    │                        │ ◄─────────────────── │                   │
    │  4. Show suggested PO  │                       │                   │
    │ ◄───────────────────── │                       │                   │
    │  5. Adjust quantities  │                       │                   │
    │  6. Tap [Send to Supplier]                    │                   │
    │ ─────────────────────► │                       │                   │
    │                        │  7. Create PO (sent)  │                   │
    │                        │ ────────────────────────────────────────► │
    │                        │  8. Generate PDF      │                   │
    │                        │ ────────────────────────────────────────► │
    │  9. PDF ready          │                       │                   │
    │ ◄───────────────────── │                       │                   │
    │ 10. Email PDF          │                       │                   │
    │ ──────────────────────────────────────────────►│                   │
    │                        │                       │                   │
    │  (later: supplier delivers)                     │                   │
    │                        │                       │                   │
    │ 11. Upload delivery    │                       │                   │
    │     Excel sheet        │                       │                   │
    │ ─────────────────────► │                       │                   │
    │                        │ 12. Detect linked PO  │                   │
    │                        │ 13. Match products    │                   │
    │                        │ 14. Show ordered vs   │                   │
    │                        │     received          │                   │
    │ 15. Preview            │                       │                   │
    │ ◄───────────────────── │                       │                   │
    │ 16. Adjust for partial │                       │                   │
    │     delivery           │                       │                   │
    │ 17. Tap [Apply]        │                       │                   │
    │ ─────────────────────► │                       │                   │
    │                        │ 18. INSERT purchase   │                   │
    │                        │     transactions      │                   │
    │                        │ ────────────────────────────────────────► │
    │                        │ 19. Update PO status  │                   │
    │                        │     (received/partial)│                   │
    │                        │ ────────────────────────────────────────► │
    │ 20. "PO closed. Stock  │                       │                   │
    │     updated."          │                       │                   │
    │ ◄───────────────────── │                       │                   │
```

### 8.4 Failed Import Recovery

```
  Manager              Inventory System             Database
    │                          │                         │
    │  1. Upload Excel         │                         │
    │ ───────────────────────► │                         │
    │                          │  2. Save file           │
    │                          │  3. Create import_batch │
    │                          │     (status: pending)   │
    │                          │  4. Parse Excel         │
    │                          │     → FAIL: Row 47     │
    │                          │     invalid quantity    │
    │                          │  5. Update batch status │
    │                          │     (status: failed)    │
    │                          │  6. Save error details  │
    │                          │ ──────────────────────► │
    │  7. Show error:          │                         │
    │     "Row 47: Quantity    │                         │
    │      must be a number.   │                         │
    │      No changes applied."│                         │
    │ ◄─────────────────────── │                         │
    │                          │                         │
    │  8. Manager fixes Excel  │                         │
    │  9. Re-uploads           │                         │
    │ ───────────────────────► │                         │
    │                          │ 10. Fresh parse         │
    │                          │     → SUCCESS           │
    │                          │ 11. Preview shown       │
    │                          │ ... (continues normal   │
    │                            import flow from here)   │
```

---

## 9. Summary: What Changed in V3.1

| Topic | V3 | V3.1 |
|---|---|---|
| Existing tables | "No changes" | "No breaking changes" — additive FKs are acceptable |
| UOM strategy | Not specified | Full UOM hierarchy (discrete/continuous, base/display, conversion chains) |
| Recipes | Not mentioned | Future design with ingredient deduction engine |
| Soft delete | Not specified | Immutable history, archive vs delete rules, restoration flow, audit log |
| Concurrency | Not specified | Transaction isolation, optimistic locking, advisory locks, conflict resolution matrix |
| Backup/recovery | Not specified | Natural recovery via reversals, pg_dump + WAL strategy, disaster runbook example |
| Performance | Not specified | Target metrics, index strategy, pagination strategy, materialized view refresh timing |
| API spec | Not specified | 60+ endpoints across 10 resource groups |
| Sequence diagrams | Not specified | 4 diagrams: delivery import, stock count, purchase order, failed import |
| Intelligence | V1/V2/V3 phases | Unchanged — carried forward |
| Core engine | Generic inventory | Unchanged — carried forward |
| Transaction ledger | Single truth source | Unchanged — carried forward |

---

## 10. Implementation Readiness Checklist

Before V1 implementation begins:

- [x] Core architecture documented (V3)
- [x] Database schema designed (V3)
- [x] Transaction-ledger model defined (V3)
- [x] UOM strategy defined (V3.1)
- [x] Soft delete rules documented (V3.1)
- [x] Concurrency protection strategy documented (V3.1)
- [x] Backup and recovery documented (V3.1)
- [x] Performance targets established (V3.1)
- [x] API endpoints specified (V3.1)
- [x] Sequence diagrams produced (V3.1)
- [x] Recipe engine designed for future (V3.1)
- [ ] **Next:** Final stakeholder approval
- [ ] **Next:** Set up Supabase migration files
- [ ] **Next:** Begin Phase 1A implementation (foundation + bar module)
