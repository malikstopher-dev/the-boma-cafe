# Inventory Engine — Version 3 Engineering Proposal

**Project:** The Boma Café
**Status:** Revised specification — approval pending, no implementation
**Philosophy:** Generic inventory engine. Alcohol is the first module. Everything else is configuration.

---

## 1. Design Principles

1. **Zero regressions** — The existing CMS, booking, quotation, PDF, email, pricing, staff, background jobs are stable. The inventory engine is a new subsystem that integrates via foreign keys and optional links. Existing code is never modified for the engine's benefit.
2. **Menu and inventory are separate** — A `bar_item` (menu entry) optionally links to an `inventory_product`. Multiple menu items can consume the same inventory product. The link is additive — existing items with no link work exactly as today.
3. **Transaction-ledger model** — `inventory_transactions` is the single source of truth for stock levels. Current stock is `SUM(all transactions)` optionally cached in a materialized view for performance. There is never a second authoritative table.
4. **Generic engine, specific module** — The core inventory engine knows nothing about alcohol. It tracks: products, units of measure, transactions, locations, suppliers. The bar module is a configuration layer that adds: bottle/tot conversion, pour sizes, cocktail recipes, and menu item links.
5. **Design for touch from day one** — The primary stock-counting interface is tablet-first with large touch targets, cards, swipes, and minimal typing.
6. **Enterprise data model** — Suppliers, locations, and categories are proper master tables with foreign keys, not free-text fields.

---

## 2. Overall Architecture

### 2.1 Subsystem Structure

```
src/
  inventory/                          ← Standalone subsystem (parallel to app/, components/)
    engine/                           ← Core generic engine
      types.ts                        ← Product, Transaction, Location, Supplier types
      ledger.ts                       ← Transaction-ledger logic (add, remove, balance)
      conversion.ts                   ← Unit conversion between UOMs (bottles↔tots, kg↔g, cases↔units)
      reconciliation.ts               ← Expected vs actual calculation
      alerts.ts                       ← Alert rule engine
      forecasting.ts                  ← Predictive engine (future)
    modules/
      bar/                            ← Bar/alcohol module (first module)
        types.ts                      ← Pour size, cocktail recipe, bottle config
        cocktail-engine.ts            ← Multi-ingredient deduction
        bar-integration.ts            ← Links to bar_items table
      kitchen/                        ← Future: food ingredients
      coffee/                         ← Future: coffee beans, milk, syrups
      consumables/                    ← Future: cleaning, packaging, office
    pages/                            ← Next.js App Router pages
      inventory/
        dashboard/
          page.tsx
        products/
          page.tsx
          [id]/
            page.tsx
        transactions/
          page.tsx
        stock-counts/
          page.tsx
          new/
            page.tsx
          [id]/
            page.tsx
        imports/
          page.tsx
          [id]/
            page.tsx
        purchase-orders/              ← Future
          page.tsx
          [id]/
            page.tsx
        suppliers/
          page.tsx
          [id]/
            page.tsx
        locations/
          page.tsx
        reports/
          page.tsx
    components/
      count-card.tsx                  ← Swipeable stock-count card
      product-search.tsx
      transaction-form.tsx
      variance-table.tsx
      import-preview.tsx
      supplier-select.tsx
      location-select.tsx
    api/
      products/
        route.ts
      transactions/
        route.ts
      stock-counts/
        route.ts
      imports/
        route.ts
        [id]/
          approve/route.ts
          rollback/route.ts
      suppliers/
        route.ts
      locations/
        route.ts
      dashboard/
        route.ts
      forecasts/
        route.ts
    lib/
      db.ts                           ← Supabase queries for inventory tables
      import-parser.ts                ← Excel parsing + fuzzy matching
      import-matcher.ts               ← Product matching + mapping memory
      import-mappings.ts              ← Import mapping CRUD
      supplier-matcher.ts             ← Supplier SKU matching
      reports.ts                      ← Report generation
      booking-integration.ts          ← Future: booking ↔ inventory bridge
```

### 2.2 Integration Points With Existing System

| Existing Module | Integration |
|---|---|
| `bar_items` table | Linked via `bar_item_inventory_links` join table (M:N). Link is optional. Null links = existing behaviour unchanged. |
| `bar_categories` table | Unchanged. Products have their own category system. |
| Admin Sidebar | New nav group "Inventory" added. Existing nav unchanged. |
| `requireAdmin()` auth | Reused. Inventory pages use the same middleware. |
| Supabase `getAdminClient()` | Reused for all DB operations. |
| Staff table | Referenced by foreign key for `performed_by` on transactions. No schema change needed. |
| Bookings / Events | Future: `inventory_transactions` can reference `booking_id` via optional FK. |
| Pricing engine | Unchanged. Inventory knows cost. Pricing engine knows sell price. Separate concerns. |
| Dashboard | Inventory KPIs appear as a widget on the main admin dashboard. Read-only embed. |

### 2.3 Page Structure (V1)

```
/admin/inventory/
├── dashboard                 ← KPIs, alerts, quick-actions
├── products                  ← List all inventory products
│   └── [id]                  ← Product detail, stock history, transactions
├── transactions              ← Full ledger view (filterable, searchable)
├── stock-counts              ← List of past counts
│   ├── new                   ← Initiate a new count (select location)
│   └── [id]                  ← Perform count (card-based UI), approve
├── imports                   ← Import history
│   ├── new                   ← Upload Excel, preview, approve
│   └── [id]                  ← Import detail, rollback
├── suppliers                 ← Supplier master list
│   └── [id]                  ← Supplier detail, products, history
├── locations                 ← Location master list
└── reports                   ← Report generation hub
```

### 2.4 Admin Sidebar Addition

```
Inventory:
  📊 Dashboard
  🏷️ Products
  📋 Transactions
  📸 Stock Counts
  📤 Imports
  🏢 Suppliers
  📍 Locations
  📈 Reports
```

---

## 3. Database Design

### 3.1 Schema Philosophy

The data model follows a strict **transaction-ledger** architecture:

```
                    ┌──────────────────────┐
                    │   inventory_products  │ ← Master product data
                    └──────────┬───────────┘
                               │ one product has many
                               ▼
┌─────────────────────────────────────────────────────┐
│  inventory_transactions                              │ ← SINGLE SOURCE OF TRUTH
│  Every add, remove, adjust, count, purchase, sale    │
│  All stock queries derive from SUM(transactions)     │
└─────────────────────────────────────────────────────┘
                               │ optionally cached as
                               ▼
┌─────────────────────────────────────────────────────┐
│  inventory_product_balances (MATERIALIZED VIEW)      │ ← PERFORMANCE OPTIMISATION
│  Refreshed on transaction commit or periodically     │
│  NEVER written directly                              │
│  Not authoritative — can be rebuilt from ledger      │
└─────────────────────────────────────────────────────┘
```

**Advantages of transaction-ledger model:**

| Aspect | Transaction-Ledger | Snapshot Table |
|---|---|---|
| Audit trail | Every change is recorded by default | Requires separate audit table |
| Rollback | Trivial — reverse the transaction(s) | Must restore old snapshot value |
| Consistency | Impossible for stock and transactions to disagree | Common source of bugs |
| Debugging | `SELECT * FROM transactions WHERE product_id = X` shows full history | Must join multiple tables |
| Data loss | Zero — every atom of stock movement is preserved | Snapshots lose intermediate states |
| Complexity | Slightly more complex queries (`SUM` + `GROUP BY`) | Simpler reads |
| Performance | Slower at scale (need index + materialized view) | Fast reads |

**Trade-off:** Reads (dashboard, product list) require aggregation. Mitigation:
- Index on `(product_id, created_at DESC)` covering `bottle_change`, `tot_change`
- Materialized view `inventory_product_balances` refreshed via `NOTIFY` trigger on every transaction INSERT
- The materialized view is never written directly — it is a read-only cache

### 3.2 Core Engine Tables (Generic — No Alcohol Knowledge)

```sql
-- ============================================================
-- CORE INVENTORY ENGINE — knows nothing about alcohol
-- ============================================================

-- Units of measure (e.g. "bottles", "tots", "kg", "litres", "cases", "units")
CREATE TABLE inventory_uoms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,            -- "bottle"
  plural      TEXT,                     -- "bottles"
  symbol      TEXT,                     -- "btl"
  is_base     BOOLEAN DEFAULT false,    -- is this the smallest countable unit?
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion rates between UOMs for a given product category
-- e.g. 1 bottle = 30 tots (for whiskey), 1 case = 12 bottles (for beer)
CREATE TABLE inventory_uom_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id       UUID NOT NULL REFERENCES inventory_uoms(id),
  to_uom_id         UUID NOT NULL REFERENCES inventory_uoms(id),
  product_type      TEXT,               -- nullable: applies to specific type only
  conversion_factor NUMERIC NOT NULL,    -- e.g. 30 (1 bottle = 30 tots)
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_uom_id, to_uom_id, COALESCE(product_type, ''))
);

-- Locations (bar, cold room, store room, VIP bar, kitchen, etc.)
CREATE TABLE inventory_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                -- "Main Bar"
  code        TEXT UNIQUE,                  -- "MB-01"
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE inventory_suppliers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,           -- "Distell Wholesale"
  contact_person    TEXT,                    -- "John Smith"
  phone             TEXT,
  email             TEXT,
  vat_number        TEXT,
  payment_terms     TEXT,                    -- "30 days", "COD"
  lead_time_days    INTEGER,                 -- average days from order to delivery
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Product categories (generic — not alcohol-specific)
CREATE TABLE inventory_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,               -- "Spirits", "Beer", "Wine", "Dairy", "Produce"
  parent_id     UUID REFERENCES inventory_categories(id),  -- hierarchical categories
  module        TEXT,                        -- 'bar', 'kitchen', 'coffee', 'consumables'
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Master product registry — the generic inventory product
CREATE TABLE inventory_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,               -- "Jameson Irish Whiskey 750ml"
  sku               TEXT,                        -- Internal SKU
  barcode           TEXT,                        -- EAN / UPC / QR
  category_id       UUID REFERENCES inventory_categories(id),
  default_uom_id    UUID NOT NULL REFERENCES inventory_uoms(id),  -- e.g. "bottle"
  cost_price        NUMERIC(10,2),               -- Latest cost per default UOM
  image_url         TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Reorder defaults
  reorder_threshold NUMERIC(10,2),               -- in default UOM
  reorder_quantity  NUMERIC(10,2),               -- suggested order qty in default UOM

  -- Expiry tracking (future)
  has_expiry        BOOLEAN DEFAULT false,
  shelf_life_days   INTEGER,

  -- Supplier link
  preferred_supplier_id UUID REFERENCES inventory_suppliers(id),
  supplier_code         TEXT,                    -- SKU as used by supplier

  UNIQUE(sku),
  UNIQUE(barcode)
);

-- TRANSACTION LEDGER — THE SINGLE SOURCE OF TRUTH
CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),

  -- Transaction type — extensible, not enum-bound
  transaction_type  TEXT NOT NULL,        -- 'purchase', 'sale', 'transfer_in', 'transfer_out',
                                          -- 'breakage', 'spillage', 'comp', 'staff', 'waste',
                                          -- 'adjustment', 'opening', 'physical_count',
                                          -- 'return', 'expiry_loss', 'production'
  -- Movement in the product's BASE UOM (e.g. tots, not bottles)
  -- Positive = stock increase, Negative = stock decrease
  quantity          NUMERIC(15,4) NOT NULL,
  uom_id            UUID NOT NULL REFERENCES inventory_uoms(id),

  -- Snapshot context (denormalised for readability, not authority)
  running_balance   NUMERIC(15,4),        -- quantity balance AFTER this tx (in base UOM)
  unit_cost         NUMERIC(10,2),        -- cost per unit at time of transaction

  -- Reference links
  reference_type    TEXT,                 -- 'import_batch', 'stock_count', 'purchase_order',
                                          -- 'booking', 'pos_order', 'manual'
  reference_id      UUID,                 -- FK to the source document
  performed_by      UUID REFERENCES staff(id),
  notes             TEXT,

  -- Import-specific (for rollback tracking)
  import_batch_id   UUID REFERENCES inventory_imports(id),

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- PERFORMANCE INDEXES
CREATE INDEX idx_inv_tx_product ON inventory_transactions(product_id, created_at DESC);
CREATE INDEX idx_inv_tx_location ON inventory_transactions(location_id, created_at DESC);
CREATE INDEX idx_inv_tx_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_tx_date ON inventory_transactions(created_at);
CREATE INDEX idx_inv_tx_reference ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_inv_tx_import ON inventory_transactions(import_batch_id);

-- Materialized view for fast balance lookups (refreshed via trigger)
-- THIS IS A CACHE. IT IS NOT AUTHORITATIVE.
CREATE MATERIALIZED VIEW inventory_product_balances AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  COALESCE(b.total_quantity, 0) AS current_balance,
  COALESCE(b.location_id, NULL) AS location_id,
  p.default_uom_id,
  NOW() AS last_refreshed_at
FROM inventory_products p
LEFT JOIN (
  SELECT
    product_id,
    location_id,
    SUM(quantity) AS total_quantity
  FROM inventory_transactions
  GROUP BY product_id, location_id
) b ON b.product_id = p.id;

CREATE UNIQUE INDEX idx_balance_product_location
  ON inventory_product_balances(product_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'));
```

### 3.3 Bar Module Tables (Alcohol-Specific Configuration)

These tables are in the `bar` module layer. They reference the generic engine but add alcohol-specific semantics.

```sql
-- ============================================================
-- BAR MODULE — alcohol-specific configuration on top of engine
-- ============================================================

-- Links inventory products to bar menu items (M:N)
-- One inventory product (Jameson 750ml) can serve many menu items
CREATE TABLE bar_item_inventory_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_item_id         UUID NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,
  inventory_product_id UUID NOT NULL REFERENCES inventory_products(id),
  pour_size_ml        NUMERIC(10,2) NOT NULL,   -- how many ml this menu item consumes
  -- e.g. Jameson Shot = 25ml pour, Jameson Double = 50ml, Jameson Bottle = 750ml
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bar_item_id, inventory_product_id)
);

-- Bottle configuration for alcohol products (extends inventory_products)
CREATE TABLE bar_product_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES inventory_products(id) UNIQUE,
  bottle_size_ml        NUMERIC(10,2) NOT NULL,     -- 750, 1000, 1500
  pour_size_ml          NUMERIC(10,2) NOT NULL,     -- default pour: 25, 30, 50
  tots_per_bottle       NUMERIC(10,2) GENERATED ALWAYS AS (bottle_size_ml / pour_size_ml) STORED,
  -- Display preference
  display_as            TEXT DEFAULT 'bottles_and_tots',  -- 'bottles_and_tots', 'tots_only', 'ml'
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Cocktail recipes (multi-ingredient deduction)
CREATE TABLE bar_cocktail_recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,              -- "Mojito", "Margarita"
  bar_item_id       UUID REFERENCES bar_items(id),  -- optional link to menu item
  yield_quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,  -- how many drinks this recipe makes
  yield_uom         TEXT DEFAULT 'drinks',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Individual ingredients in a cocktail recipe
CREATE TABLE bar_cocktail_ingredients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id           UUID NOT NULL REFERENCES bar_cocktail_recipes(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES inventory_products(id),
  quantity            NUMERIC(10,2) NOT NULL,   -- amount consumed
  uom                 TEXT NOT NULL,             -- 'ml', 'tots', 'splash', 'leaf', 'slice'
  notes               TEXT,
  UNIQUE(recipe_id, product_id)
);

-- Import mapping memory (remembers fuzzy match decisions)
CREATE TABLE inventory_import_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           UUID REFERENCES inventory_suppliers(id),
  supplier_product_name TEXT NOT NULL,           -- "Jameson" (as written on spreadsheet)
  supplier_sku          TEXT,                    -- "JMS-750"
  matched_product_id    UUID REFERENCES inventory_products(id),
  confidence            NUMERIC(5,4),            -- 0.0 to 1.0 match confidence
  auto_approve          BOOLEAN DEFAULT false,   -- future imports match silently
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, supplier_product_name)
);

-- Purchase orders (future)
CREATE TABLE inventory_purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES inventory_suppliers(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
  ordered_at      TIMESTAMPTZ,
  expected_at     DATE,
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_purchase_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES inventory_products(id),
  quantity_ordered NUMERIC(10,2) NOT NULL,
  quantity_received NUMERIC(10,2) DEFAULT 0,
  unit_cost       NUMERIC(10,2),
  UNIQUE(po_id, product_id)
);
```

### 3.4 Location Architecture

```
inventory_locations
├── Main Bar          (code: MB)
├── VIP Bar           (code: VB)
├── Cold Room 1       (code: CR1)
├── Cold Room 2       (code: CR2)
├── Store Room        (code: SR)
├── Outdoor Bar       (code: OB)
└── [Branch Name] / Main Bar   (future: branch prefix)
```

Every transaction is tagged with a `location_id`. Stock balances are per-location. Physical counts are per-location.

### 3.5 Supplier Architecture

```
inventory_suppliers
├── name, contact, phone, email, VAT, payment terms, lead time
├── Each product has a preferred_supplier_id + supplier_code
└── Each import batch is linked to a supplier
```

Future: `inventory_supplier_performance` view calculates:
- On-time delivery rate
- Damage rate
- Price trend
- Average lead time

---

## 4. Transaction-Ledger Model — Detailed Explanation

### 4.1 How It Works

```
The ledger is a single table: inventory_transactions

Each row records:
  - WHAT moved (product_id)
  - WHERE it moved (location_id)
  - HOW MUCH moved (quantity + uom_id)
  - WHY it moved (transaction_type + reference_type/id)
  - WHO moved it (performed_by)
  - WHEN it moved (created_at)

To get CURRENT BALANCE for a product at a location:
  SELECT SUM(quantity)
  FROM inventory_transactions
  WHERE product_id = $1 AND location_id = $2;

To get BALANCE AT A POINT IN TIME:
  SELECT SUM(quantity)
  FROM inventory_transactions
  WHERE product_id = $1 AND location_id = $2
    AND created_at <= $timestamp;

To get FULL HISTORY:
  SELECT * FROM inventory_transactions
  WHERE product_id = $1
  ORDER BY created_at DESC;
```

### 4.2 Opening Balance

When a product is first created, an `opening` transaction is inserted with the starting stock quantity. This is the product's genesis point — everything derives from it.

```
INSERT INTO inventory_transactions (
  product_id, location_id, transaction_type,
  quantity, uom_id, running_balance, notes
) VALUES (
  $product_id, $location_id, 'opening',
  20, $bottle_uom_id, 20, 'Initial stock count 2026-07-28'
);
```

### 4.3 Transaction Types — Fully Extensible

| Type | Quantity Sign | Meaning |
|---|---|---|
| `opening` | + | Initial stock or shift-start balance |
| `purchase` | + | Supplier delivery |
| `return` | + | Returned to supplier (reversal) |
| `transfer_in` | + | Received from another location |
| `production` | + | Made in-house (e.g. infused spirits, batch cocktails) |
| `sale` | − | Sold to customer |
| `breakage` | − | Broken bottle |
| `spillage` | − | Spilled drink |
| `comp` | − | Complimentary drink |
| `staff` | − | Staff consumption |
| `waste` | − | Poured out |
| `expiry_loss` | − | Expired/spoiled |
| `transfer_out` | − | Sent to another location |
| `adjustment` | ± | Manual correction (reason required) |
| `physical_count` | ± | Correction after stock count |
| `theft` | − | Suspected theft |
| `donation` | − | Donated product |

### 4.4 Rollback

Rollback = insert reversal transactions:

```
-- Original transaction (purchase of 10 bottles)
INSERT INTO inventory_transactions (..., quantity = +10, import_batch_id = $batch);

-- Rollback (creates a reversal)
INSERT INTO inventory_transactions (
  ..., quantity = -10, transaction_type = 'adjustment',
  notes = 'Rollback of import batch $batch', import_batch_id = $batch
);
```

The rollback is itself a transaction — it is never invisible. The import batch record shows `status = 'rolled_back'`.

### 4.5 Materialized View Performance

For the dashboard and product list (which need fast balance reads):

```sql
-- Refreshed via Supabase trigger on inventory_transactions INSERT
CREATE OR REPLACE FUNCTION refresh_inventory_balances()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_product_balances;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_balances
AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_inventory_balances();
```

Alternative: refresh only the affected product's row (more efficient for high volume).

---

## 5. Excel Import Workflow

### 5.1 Supported Import Types

| Import Type | Source | Effect |
|---|---|---|
| `supplier_delivery` | Supplier invoice/delivery note | Increases stock (purchase) |
| `physical_count` | Manual physical count | Sets actual stock (creates reconciliation) |
| `adjustment` | Bulk correction sheet | Creates adjustment transactions |

### 5.2 Matching Algorithm

```
For each row in spreadsheet:

1. SUPPLIER CODE MATCH (most reliable)
   IF row has supplier_sku AND supplier_id is known:
      Search inventory_products WHERE supplier_code = row.supplier_code AND preferred_supplier_id = supplier_id
      IF found: LINK → confidence 1.0

2. IMPORT MAPPING MATCH (remembered from previous imports)
   Search inventory_import_mappings WHERE supplier_product_name ILIKE row.product_name
   IF found AND auto_approve = true:
      LINK → confidence 0.95 (silently mapped)
   IF found AND auto_approve = false:
      SHOW as suggested match → confidence 0.85

3. EXACT NAME MATCH
   Normalize both names (lowercase, strip "ml", "bottle", hyphens)
   IF normalized name matches exactly:
      LINK → confidence 0.9

4. FUZZY MATCH
   Use trigram similarity on inventory_products.name
   IF similarity >= 0.8:
      SHOW as suggested match → confidence 0.7
   IF similarity >= 0.6 AND < 0.8:
      SHOW as weak suggestion → confidence 0.4
   IF similarity < 0.6:
      NO MATCH → mark as "Unknown Product"

5. UNKNOWN PRODUCT
   Manager options:
     a) Create New Product → opens inline form (name, category, UOM, bottle/pour config)
     b) Merge With Existing → manually search and link
     c) Skip → ignore this row
     d) Import Mapping → create mapping for future (auto-links next time)
```

### 5.3 Import Flow

```
UPLOAD → PARSE → VALIDATE → PREVIEW → APPROVE → APPLY → AUDIT LOG
                                          │
                                     ROLLBACK (within 24h)
```

**Step 1 — Upload:**
- Drag-and-drop `.xlsx` or `.xls` file
- File stored in Supabase Storage `inventory-imports/` bucket

**Step 2 — Parse:**
- Read all rows using SheetJS
- Validate column headers match expected format
- Parse numbers, dates, and text
- For each row, attempt matching (algorithm above)

**Step 3 — Validate:**
- Check for duplicate product names within the file
- Check for negative quantities
- Check for invalid numbers
- Check for unknown suppliers

**Step 4 — Preview:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📤 Import Preview — SupplierDelivery_2026-07-28.xlsx                    │
│                                                                         │
│ Supplier: Distell Wholesale          Batch ID: IMP-20260728-001         │
│                                                                         │
│ STATUS: 12 rows parsed, 10 matched, 1 unknown, 1 error                 │
│                                                                         │
│ ┌──────────────┬───────────┬──────┬───────────┬───────────┬──────────┐ │
│ │ Product      │ Qty       │ Unit │ Decision  │ New Stock │ Status   │ │
│ ├──────────────┼───────────┼──────┼───────────┼───────────┼──────────┤ │
│ │ Jameson      │ +10       │ btl  │ ✅ Matched│ 19B → 29B │ ✅       │ │
│ │ Smirnoff 1L  │ +5        │ btl  │ ✅ Matched│ 8B → 13B  │ ✅       │ │
│ │ Castle Lite  │ +2 (case) │ cs   │ ✅ Matched│ 5→7 cases │ ✅       │ │
│ │ New Gin 750  │ +8        │ btl  │ ❓ Unknown│ —         │ ⚠️        │ │
│ │ Hendricks    │ -2        │ btl  │ ❌ Error  │ —         │ ❌ Neg qty│
│ └──────────────┴───────────┴──────┴───────────┴───────────┴──────────┘ │
│                                                                         │
│ UNKNOWN PRODUCTS:                                                        │
│ New Gin 750ml — [Create New] [Merge With…] [Skip] [Always Map As…]     │
│                                                                         │
│ [APPLY IMPORT]                    [DISCARD]                             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step 5 — Approve:**
- User taps [Apply Import]
- System wraps everything in a database transaction
- For each matched product: INSERT inventory_transaction
- For each "Create New" decision: INSERT inventory_product + bar_product_config + inventory_transaction
- For each "Merge" decision: INSERT inventory_import_mapping for future
- Commit

**Step 6 — Rollback:**
- Import detail page shows [Rollback] button (available for 24 hours)
- Creates reversal transactions for every transaction in the batch
- Sets import_batch.status = 'rolled_back'
- Reversal transactions are tagged with the same import_batch_id for audit

### 5.4 Import History & Audit Trail

```
┌─────────────────────────────────────────────────────────────────┐
│ Import History                                                  │
│ ┌────────┬───────────┬────────────┬────────┬────────┬─────────┐│
│ │ Batch  │ Date      │ Type       │ Status │ Rows   │ By      ││
│ ├────────┼───────────┼────────────┼────────┼────────┼─────────┤│
│ │ IMP-03 │ 28 Jul    │ Delivery   │ Applied│ 12     │ Maria   ││
│ │ IMP-02 │ 27 Jul    │ Count      │ Rolled │ 84     │ John    ││
│ │ IMP-01 │ 26 Jul    │ Delivery   │ Applied│ 8      │ Maria   ││
│ └────────┴───────────┴────────────┴────────┴────────┴─────────┘│
│                                                                  │
│ [IMP-03 Detail]                                                  │
│ 12:34 — Import applied by Maria (12 transactions)               │
│ 12:35 — Stock updated: +10 Jameson, +5 Smirnoff, +8 New Gin    │
│ 12:35 — Product created: New Gin 750ml                          │
│ 12:35 — Mapping saved: "New Gin" → New Gin 750ml (Distell)     │
│ [Rollback Import] (available for 23h 26m)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Stock Count UX

### 6.1 Design Philosophy

This is designed for **real restaurant staff** — not accountants. The interface should feel like a mobile game, not a spreadsheet.

### 6.2 Workflow

```
1. START
   Manager taps "New Stock Count"
   Selects location: [Main Bar]
   System generates a count session with all active products at that location

2. COUNT (Card-by-card)
   ┌─────────────────────────────────────────────┐
   │                                             │
   │   🏷️   JAMESON IRISH WHISKEY 750ML         │
   │         Main Bar · Expected: 19B + 10T      │
   │                                             │
   │         BOTTLES                             │
   │       ┌──┐  ┌──┐  ┌──┐                     │
   │       │ -│  │19│  │ +│                     │
   │       └──┘  └──┘  └──┘                     │
   │                                             │
   │         TOTS (partial bottle)               │
   │       ┌──┐  ┌──┐  ┌──┐                     │
   │       │ -│  │ 6│  │ +│                     │
   │       └──┘  └──┘  └──┘                     │
   │                                             │
   │         NOTES (optional)                    │
   │       ┌────────────────────────────┐        │
   │       │ 2 bottles broke last night│         │
   │       └────────────────────────────┘        │
   │                                             │
   │   ◀ PREV                    NEXT ▶          │
   │                                             │
   │         Progress: 12 / 84 products          │
   │         [████████░░░░░░░░░░░░░░░]           │
   └─────────────────────────────────────────────┘

3. NAVIGATION
   Swipe left/right = next/previous product
   Tap number = select for editing
   Tap +/- = increment/decrement by 1
   Long-press +/- = fast increment/decrement (10x)
   Tap product name = search/jump to product
   Progress bar at bottom shows completion

4. COMPLETE
   When all products are counted (or manager taps "Skip Uncounted"):
   ┌─────────────────────────────────────────────┐
   │   ✅ Stock Count Complete — Main Bar        │
   │                                              │
   │   Counted: 80 / 84 products                 │
   │   Skipped: 4 products                       │
   │                                              │
   │   Summary:                                  │
   │   📊 Total expected: 1,420 tots             │
   │   📊 Total physical: 1,398 tots             │
   │   📊 Variance: -22 tots (-1.5%)              │
   │                                              │
   │   Products with variance > 5%:               │
   │   ⚠️ Smirnoff 1L: -24 tots (-8.2%)          │
   │   ⚠️ Jack Daniels: -6 tots (-5.1%)           │
   │                                              │
   │   [APPROVE & SAVE]  [REVIEW VARIANCES]       │
   └─────────────────────────────────────────────┘

5. REVIEW VARIANCES
   ┌─────────────────────────────────────────────┐
   │   Variance Review                           │
   │                                              │
   │   For each product with significant variance:│
   │                                              │
   │   Smirnoff 1L                                │
   │   Expected: 8B + 12T                         │
   │   Physical: 7B + 18T                         │
   │   Variance: -24 tots (R72.00)                │
   │   Reason: [Select...] ▼                      │
   │   ┌──────────────────────────────────┐       │
   │   │ Over-pour during busy service    │       │
   │   │ Spillage not recorded            │       │
   │   │ Theft suspected                  │       │
   │   │ Counting error                   │       │
   │   │ Multiple reasons...              │       │
   │   └──────────────────────────────────┘       │
   │                                              │
   │   [SAVE ALL REASONS]  [BACK]                 │
   └─────────────────────────────────────────────┘
```

### 6.3 Key UX Decisions

| Decision | Rationale |
|---|---|
| Card-based, not table | Each product gets full focus. Big tap targets. No scrolling horizontally. |
| Swipe navigation | Natural mobile gesture. No tiny "next" button to aim for. |
| Stepper controls (+/−) | Faster than typing. Staff can do 200 products in minutes. |
| Expected value shown | Staff know what to expect. If it differs wildly, they double-check. |
| Progress bar | Psychological motivation. "12 of 84 done" feels achievable. |
| Skipped products tracked | Manager knows what wasn't counted. No silent omissions. |
| Variance reason dropdown | Fast, consistent, auditable. Free-text is optional. |
| Costed variance shown | "−24 tots" is abstract. "−R72.00" is meaningful. |
| Save-as-you-go | If tablet dies, only last card is lost. Previous cards are saved. |

---

## 7. Purchase Workflow (Future — Design Only)

### 7.1 End-to-End Flow

```
┌──────────────────────────────────────────────────────┐
│ 1. DETECT                                            │
│    inventory_product_balances.current_balance         │
│    < inventory_products.reorder_threshold             │
│                                                       │
│    → Alert created: "Jameson 750ml is low (2 bottles)│
│      PAR is 5. Suggested reorder: 10 bottles."        │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│ 2. SUGGEST                                            │
│    System generates Suggested Purchase Order:         │
│                                                       │
│    Supplier: Distell Wholesale                        │
│    ├── Jameson 750ml   PAR: 5  Current: 2  Order: 10 │
│    ├── Smirnoff 1L     PAR: 8  Current: 6  Order: 5  │
│    └── Hendricks Gin   PAR: 4  Current: 1  Order: 6  │
│                                                       │
│    Estimated total: R8,460.00                         │
│                                                       │
│    Manager reviews, adjusts quantities, approves.     │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│ 3. ORDER                                              │
│    Purchase Order created (status: 'sent')            │
│    PDF generated for emailing to supplier             │
│    (Reuses existing PDF generation infrastructure)    │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│ 4. DELIVER                                            │
│    Supplier delivers goods + invoice                  │
│    Manager receives delivery                          │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│ 5. IMPORT                                             │
│    Manager uploads supplier invoice spreadsheet       │
│    → Import type: 'supplier_delivery'                  │
│    → System detects linked Purchase Order             │
│    → Auto-matches products via PO items               │
│    → Preview shows ordered vs received quantities     │
│    → Manager adjusts for partial/full delivery        │
│    → Approve → stock updated                          │
│    → Purchase Order status: 'received'                │
└──────────────────────┬───────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────┐
│ 6. CLOSE                                              │
│    PO is closed.                                      │
│    Stock updated.                                     │
│    Supplier performance tracked (on-time, accurate).  │
└──────────────────────────────────────────────────────┘
```

### 7.2 PO ↔ Import Integration

When an import is linked to a PO:
- Products are pre-matched from PO items
- Quantities are pre-filled from PO expected quantities
- Manager adjusts for partial deliveries (e.g. ordered 12, received 8)
- System creates partial PO receipt and tracks remaining balance

---

## 8. Booking Integration (Future — Design Only)

### 8.1 Concept

Every booking (wedding, birthday, corporate event, function) has:
- Number of guests
- Event type
- Duration
- Package selection (if applicable)

The inventory system should:
1. **Estimate** required alcohol based on event parameters
2. **Check** available stock against requirements
3. **Reserve** stock for the event date
4. **Track** actual consumption during the event
5. **Reconcile** estimated vs actual after the event

### 8.2 Estimation Engine

```
Booking: Wedding
Guests: 120
Duration: 6 hours
Package: Premium Bar (beer, wine, spirits, soft drinks)

Estimated consumption:
  Beer:        120 guests × 3 drinks × 0.33L         = 118.8L ≈ 360 beers
  Wine:        120 guests × 2 glasses × 150ml        = 36L ≈ 48 bottles
  Spirits:     80 drinking guests × 4 tots × 25ml    = 8L ≈ 11 bottles (whiskey)
  Soft drinks: 120 guests × 2 drinks × 330ml         = 79.2L ≈ 240 cans

Stock check:
  Castle Lite: 8 cases (192 beers) → INSUFFICIENT (need 360)
  Jameson:     19 bottles → SUFFICIENT (need 11)
  Smirnoff:    12 bottles → SUFFICIENT (need 8)

Result:
  ⚠️ Low on beer. Suggested purchase: Castle Lite (168 beers = 7 cases)
```

### 8.3 Data Model Extension

```sql
-- Link bookings to inventory (future)
ALTER TABLE inventory_transactions
  ADD COLUMN booking_id UUID REFERENCES bookings(id);

-- Event consumption estimates (cache for reconciliation)
CREATE TABLE inventory_booking_estimates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  estimated_quantity NUMERIC(10,2),
  actual_quantity   NUMERIC(10,2),    -- from transactions with this booking_id
  variance          NUMERIC(10,2) GENERATED ALWAYS AS (actual_quantity - estimated_quantity) STORED,
  UNIQUE(booking_id, product_id)
);
```

### 8.4 Reconciliation Report

```
Booking: Smith Wedding | 28 July 2026 | 120 guests

Product         | Estimated | Actual | Variance | %
Beer (cases)    | 15        | 22     | +7       | +47%
Jameson (btls)  | 11        | 14     | +3       | +27%
Smirnoff (btls) | 8         | 9      | +1       | +13%
Wine (btls)     | 48        | 52     | +4       | +8%

Total variance cost: R3,240.00
Variance %: 22% over estimate
```

This data refines the estimation engine over time. After 10 weddings, the system learns:
- "Weddings with 100–150 guests typically consume 40% more beer than estimated"
- Future estimates automatically adjust.

---

## 9. Intelligence Layer

### 9.1 V1 Intelligence (Ship Now)

These features provide immediate value with simple algorithms — no AI/ML required.

| Feature | Algorithm | Output |
|---|---|---|
| **Reorder alerts** | `current < threshold` | Low stock alert with suggested order quantity |
| **Fast/slow movers** | `SUM(sales) over 7/30 days` | Product ranking by turnover rate |
| **Dead stock** | `no transactions for 90 days` | Product flagged for review |
| **Costed variance** | `variance_tots × (cost_per_bottle / tots_per_bottle)` | Monetary value of every variance |
| **Supplier performance** | `on_time_count / total_orders`, `avg_lead_time` | Supplier rating |
| **Variance reason tracking** | `COUNT(*) GROUP BY variance_reason` | Top reasons report |
| **Product movement history** | `time_series of balances over 7/30 days` | Stock level chart |

### 9.2 V2 Intelligence (Phase 2)

| Feature | Algorithm | Output |
|---|---|---|
| **Predictive depletion** | `(current_balance - reorder_threshold) / avg_daily_consumption` | Predicted stock-out date |
| **Reorder assistant** | Suggest quantities based on: `avg_daily_consumption × lead_time_days + buffer` | Smart purchase order suggestions |
| **Booking guestimates** | Historical event consumption per guest type × guest count | Stock requirement estimates |
| **Expiry forecasting** | Products with expiry + 80% shelf life remaining | "Use by" alerts (beer, wine, dairy) |
| **Trend analysis** | Week-over-week and month-over-month consumption comparison | Identifying seasonal patterns |

### 9.3 V3 Intelligence (Phase 3 — Pattern Detection)

| Feature | Algorithm | Output |
|---|---|---|
| **Theft/over-pour detection** | Per-staff variance over time: `aggregate_variance_by_performed_by()` with rolling 30-day window × statistical outlier detection | "Maria has 5.2% average variance. Team average is 0.8%. Flag for review." |
| **Shift-based anomaly** | Variance bucketed by shift or day-of-week | "Friday nights consistently lose 8% more stock" |
| **Multi-product correlation** | When Product A has high variance, Product B always does too | "Mojito ingredients disappear together — likely unrecorded cocktail prep, not theft" |
| **Predictive purchasing** | `30-day avg + upcoming bookings + weekends + seasonality + trend` | "Recommended order for next week: Jameson 15 bottles, Smirnoff 8 bottles, etc." |
| **Ingredient-level auto-deduction** | POS order for Mojito → auto-deduct: rum (−50ml), mint (−5 leaves), lime (−0.5), sugar (−10g), soda (−100ml) | No manual entry for cocktail sales |

### 9.4 Intelligence Architecture

```
┌─────────────────────────────────────────────────────────┐
│  INTELLIGENCE ENGINE (Future)                            │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Forecasters  │  │ Detectors   │  │ Recommenders    │ │
│  │             │  │             │  │                 │ │
│  │ Depletion   │  │ Theft       │  │ Reorder         │ │
│  │ Booking     │  │ Over-pour   │  │ Supplier        │ │
│  │ Consumption │  │ Shift anom. │  │ Menu changes    │ │
│  │ Seasonal    │  │ Correlation │  │ Events          │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                                                         │
│  All run as:                                            │
│  - SQL window functions (simple)                        │
│  - Background worker cron jobs (medium)                 │
│  - Future: Python microservice (complex ML)             │
└─────────────────────────────────────────────────────────┘
```

### 9.5 V1 vs Future Intelligence

| Feature | V1 | V2 | V3 |
|---|---|---|---|
| Reorder alerts | ✅ Basic (threshold) | ✅ Smart (stats) | ✅ Predictive |
| Fast/slow movers | ✅ | ✅ | ✅ |
| Dead stock | ✅ | ✅ | ✅ |
| Costed variance | ✅ | ✅ | ✅ |
| Supplier performance | ✅ Basic (on-time) | ✅ Full (trends) | ✅ Predictive |
| Variance reasons | ✅ Manual entry | ✅ Auto-categorize | ✅ ML detection |
| Depletion forecast | ❌ | ✅ | ✅ |
| Stock-out prediction | ❌ | ✅ | ✅ |
| Booking estimation | ❌ | ✅ | ✅ |
| Expiry tracking | ❌ ✅ (design only) | ✅ | ✅ |
| Theft detection | ❌ | ❌ | ✅ |
| Pattern analysis | ❌ | ❌ | ✅ |
| Cocktail deduction | ❌ | ❌ | ✅ |
| AI reorder assistant | ❌ | ❌ | ✅ |

---

## 10. Dashboard Design

### 10.1 Main Dashboard (`/admin/inventory`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📦 INVENTORY DASHBOARD                              Location: [Main Bar ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  R124.5K │ │   47     │ │   342    │ │  R3.2K   │ │   5 ⚠️   │         │
│  │ Inventory│ │ Products │ │ Drinks   │ │ Est. Loss│ │ Alerts   │         │
│  │  Value   │ │ Tracked  │ │ Sold Tdy │ │ This Mo  │ │  Active  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 OUT OF STOCK (2)                                                  │   │
│  │  • Smirnoff 1L — no stock since 26 Jul — Reorder now                │   │
│  │  • Jack Daniels 750ml — no stock since 25 Jul — Reorder now          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 🟡 LOW STOCK (3)                                                     │   │
│  │  • Jameson 750ml — 2 bottles remaining (PAR: 5) — Reorder 10        │   │
│  │  • Hendricks Gin — 1 bottle (PAR: 4) — Reorder 6                    │   │
│  │  • Castle Lite — 3 cases (PAR: 8) — Reorder 6 cases                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 🟢 RECENT ACTIVITY                                                   │   │
│  │  • 📤 Import #IMP-003 applied (12 products) — 15 min ago            │   │
│  │  • ✏️ Stock count completed (84/84 products) — 2h ago                │   │
│  │  • 💔 Breakage: 1 bottle Jameson (Maria) — 3h ago                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                                         │   │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │ │ 📤      │ │ 📸      │ │ ✏️      │ │ 📊     │ │ 📋      │       │   │
│  │ │ Import  │ │ Count   │ │ Adjust  │ │ Recon   │ │ Product │       │   │
│  │ │ Excel   │ │ Stock   │ │ Stock   │ │ ciliate │ │ Add     │       │   │
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RECONCILIATION SUMMARY               (Last count: 27 Jul 2026)       │   │
│  │   Total Expected: 14,322 tots                                        │   │
│  │   Total Physical: 14,198 tots                                        │   │
│  │   Variance: -124 tots (-0.87%)                                       │   │
│  │   Estimated Loss: R3,240.00                                          │   │
│  │                                                                       │   │
│  │  Top variances:                                                       │   │
│  │   🔴 Smirnoff 1L: −24 tots (−8.2%) — Over-pour suspected             │   │
│  │   🟡 Jameson: −6 tots (−1.1%) — Spillage                             │   │
│  │   🟢 Hennessy: +2 tots (+0.3%) — Counting error                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │ FAST MOVERS (This Week)      │  │ SLOW MOVERS (This Month)          │   │
│  │ 1. Jameson — 186 tots       │  │ 1. Banana Liqueur — 0 tots        │   │
│  │ 2. Castle Lite — 144 beers  │  │ 2. Grenadine — 4 tots             │   │
│  │ 3. Smirnoff — 98 tots       │  │ 3. Cream Liqueur — 6 tots         │   │
│  │ 4. Wine (house) — 72 glasses│  │ 4. Pineapple Juice — 0            │   │
│  └──────────────────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Product Detail Page (`/admin/inventory/products/[id]`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏷️ Jameson Irish Whiskey 750ml                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐     │
│  │ CONFIGURATION             │  │ STOCK SUMMARY                   │     │
│  │                           │  │                                  │     │
│  │ Category: Spirits         │  │ 🟡 Low Stock                    │     │
│  │ UOM: Bottle               │  │                                  │     │
│  │ Bottle: 750ml             │  │ Current: 19B + 10T (580 tots)   │     │
│  │ Pour: 25ml                │  │ Expected: 19B + 16T (586 tots)  │     │
│  │ Tots/Bottle: 30           │  │ PAR: 5 bottles                  │     │
│  │                           │  │ Reorder: 10 bottles             │     │
│  │ Cost/Bottle: R180.00      │  │ Est. Value: R3,420.00           │     │
│  │ Cost/Tot: R6.00           │  │ Days Until Out: 6 (est.)        │     │
│  │                           │  │ [ORDER NOW]                     │     │
│  │ Supplier: Distell Wholesale│  └──────────────────────────────────┘     │
│  │ Supplier Code: JMS-750    │                                          │
│  └──────────────────────────┘                                           │
│                                                                          │
│  RECENT TRANSACTIONS (Last 30 days)                                      │
│  ┌────────┬──────────┬──────┬──────────┬───────────┬────────────┐       │
│  │ Date   │ Type     │ Qty  │ Balance  │ By        │ Notes      │       │
│  ├────────┼──────────┼──────┼──────────┼───────────┼────────────┤       │
│  │ 28 Jul │ Purchase │ +10B │ 19B+10T  │ Maria     │ Delivery   │       │
│  │ 28 Jul │ Sale     │ −6T  │ 9B+4T*   │ System    │ POS order  │       │
│  │ 27 Jul │ Comp     │ −2T  │ 9B+10T   │ John      │ Guest comp │       │
│  │ 27 Jul │ Count    │ −1B  │ 9B+12T   │ Maria     │ Physical   │       │
│  │ 26 Jul │ Spillage │ −4T  │ 10B+12T  │ Staff 3   │ Spilled    │       │
│  └────────┴──────────┴──────┴──────────┴───────────┴────────────┘       │
│  * displayed in bottles+tots for readability, stored as tots in ledger   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Phases

### Phase 1A — Foundation (Weeks 1–2)

**Goal:** Core engine + alcohol module + basic UI

| Task | Details | Dependencies |
|---|---|---|
| Database migrations | All core engine tables + bar module tables + indexes | None |
| Sidebar + nav | Add Inventory nav group | Admin layout |
| Product CRUD | inventory_products + bar_product_config CRUD pages | DB migration |
| Transaction ledger | INSERT transactions, SUM queries, balance view | DB migration |
| Basic dashboard | KPIs, low stock alerts, recent activity | Transaction ledger |
| Manual transactions | Record sale, breakage, spillage, comp, staff | Transaction ledger |
| Stock count UI | Card-based count form with swipe | Products, locations |
| Reconciliation | Expected vs physical variance calculation | Stock count, ledger |

**Estimated effort:** 10–12 days

### Phase 1B — Import & Supply (Week 3)

**Goal:** Excel import + supplier/location management

| Task | Details | Dependencies |
|---|---|---|
| Supplier master CRUD | Add/edit/delete suppliers | DB migration |
| Location master CRUD | Add/edit/delete locations | DB migration |
| Excel import — parse | SheetJS integration, column detection | Products |
| Excel import — match | Fuzzy matching, import mapping memory | Products, suppliers |
| Excel import — preview | Preview screen with decision per row | Import parse |
| Excel import — approve | Apply transactions, rollback infrastructure | Transaction ledger |
| Import history | List, detail, rollback button | Import infrastructure |

**Estimated effort:** 5–7 days

### Phase 1C — Reporting (Week 4)

**Goal:** Essential reports

| Task | Details | Dependencies |
|---|---|---|
| Daily stock report | Opening, purchases, sales, closing | Transaction ledger |
| Variance report | Expected vs physical per product | Reconciliation |
| Waste/breakage report | Aggregated by type, reason, staff | Transaction ledger |
| Fast/slow movers | 7-day and 30-day consumption ranking | Transaction ledger |
| Inventory valuation | Current balances × cost | Product costs |
| Materialized view refresh | Performance optimisation | DB migration |

**Estimated effort:** 4–5 days

### Phase 2 — Purchase Orders (Future)

| Task | Complexity |
|---|---|
| PO creation and approval flow | Medium |
| PO ↔ Import integration | Medium |
| Partial delivery handling | Medium |
| PO PDF generation | Low (reuse existing PDF engine) |
| Supplier performance tracking | Low |

### Phase 3 — Booking Integration (Future)

| Task | Complexity |
|---|---|
| Transaction-to-booking linking | Low |
| Estimation engine | Medium |
| Booking reconciliation report | Medium |
| Learning from past events | Medium |

### Phase 4 — Intelligence (Future)

| Task | Complexity |
|---|---|
| Predictive depletion | Low |
| Smart reorder assistant | Medium |
| Theft/over-pour detection | High |
| Cocktail recipe deduction | Medium |
| Trend analysis | Low |

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Excel import matches wrong product | Medium | Medium | Preview step with human confirmation. Rollback available 24h. Import mapping memory improves over time. |
| Staff don't record waste/breakage | High | High | Single-tap entry. Show "this protects you" messaging. Manager sees unverified variance and investigates. |
| Transaction ledger becomes slow | Medium | Medium | Materialized view + proper indexes. Partition by month if needed. |
| Staff resistant to stock counting | Medium | Medium | Card-based UX is faster than paper. No typing. Swipe through 200 products in 10 minutes. |
| Feature creep delays V1 | High | High | Strict V1 scope: only what's in Phase 1A–1C. Everything else is documented but deferred. |
| Generic engine over-engineering | Medium | Medium | Build for alcohol first. Extract generic parts only when a second module is being built. YAGNI. |
| Data migration from existing manual system | Medium | Medium | Opening balance transaction for each product. Phase 1A includes bulk opening balance import from Excel. |

---

## 13. Scalability Roadmap

```
Now (V1)                             6 months                          12 months
─────────────────────────────────────────────────────────────────────────────
Alcohol inventory                    + Kitchen ingredients               + Full restaurant ERP
Manual transactions                  + POS auto-deduction                + Auto-reordering
Excel import                         + Purchase orders                   + Supplier portal
Basic reconciliation                 + Booking integration               + ML-based prediction
Card-based stock count              + Barcode scanning                   + Mobile app for counts
Single location                     + Multiple locations                 + Multi-branch
Core reports                        + Intelligence layer                 + BI dashboard
Materialized view for perf          + Read replicas                     + Partitioned tables
```

---

## 14. Summary of Key Decisions vs Proposals 1 & 2

| Decision | Proposal 1 | Proposal 2 | V3 (This) |
|---|---|---|---|
| Menu ↔ Inventory | Direct link on bar_items | Separate tables | M:N join table |
| Stock truth | Snapshot table | Snapshot table | Transaction ledger (no snapshot) |
| Expected stock | Stored | Stored | Calculated |
| Suppliers | TEXT field | TEXT field | Master table |
| Locations | TEXT field | TEXT field | Master table |
| Categories | bar_categories only | TEXT field | Hierarchical master table |
| Engine specificity | Bar-specific | Bar-specific | Generic (bar = first module) |
| Import matching | Create/Skip only | Create/Skip only | Create/Skip/Merge + mapping memory |
| Stock count UI | Table-based | Table-based | Card-based, swipeable |
| Purchase orders | Not mentioned | Not mentioned | Designed (future) |
| Booking integration | Not mentioned | Not mentioned | Designed (future) |
| Intelligence | Basic alerts | Mentioned | Layered (V1/V2/V3) |
| Expiry tracking | Not mentioned | Not mentioned | Designed (future) |
| Cocktail recipes | Not mentioned | Not mentioned | Designed (future) |
| UOMs | Bottles + Tots only | Bottles + Tots only | Generic UOM system |
| Existing system | No changes | Adds columns to bar_items | No changes to existing tables |

---

## 15. Final Recommendation

**Build Phase 1A first** — the transaction-ledger foundation with bar module, product CRUD, and card-based stock counting. This is the highest-value, lowest-risk starting point. It gives the manager immediate visibility into stock levels and physical count reconciliation without waiting for imports, reports, or intelligence features.

Phase 1A is independently useful. Everything else builds on it.

**V1 scope (hard boundary):**
- transaction-ledger engine
- alcohol module (bottle/tot conversion)
- product management
- location management
- supplier management
- manual transaction entry (all types)
- card-based stock counting
- basic reconciliation
- basic dashboard
- Excel import with mapping memory

**Explicitly NOT in V1:**
- purchase orders
- booking integration
- cocktail recipes
- predictive analytics
- theft detection
- kitchen inventory
- POS auto-deduction

These are documented, designed, and deferred.
