# The Boma Café — Master Technical Architecture Specification

**Version:** 1.0  
**Status:** Final — Single Source of Truth for Implementation  
**Scope:** Inventory Engine (V1) + Integration with Existing System  
**Effective Date:** 2026-07-29  

---

## Preamble: Governing Decisions

The following decisions are ratified and will not be revisited during V1 implementation:

1. **Transaction-ledger architecture** is the single source of truth for stock. There is no writable `running_balance` column. Current stock is `SUM(inventory_transactions.quantity)` optionally cached in a read-only materialized view.
2. **Inventory is a generic engine.** It knows nothing about alcohol, bottles, tots, pour sizes, or cocktails. The bar module configures the engine for alcohol use.
3. **Bar functionality is a module** layered on top of the inventory engine via `inventory/modules/bar/`. The engine does not import the module.
4. **Existing CMS is stable.** Inventory integration uses only additive, nullable, backward-compatible schema changes. No existing column, table, or behaviour is modified.
5. **Auth reuses the existing system.** Inventory uses the same cookie/PIN auth as the rest of the admin. No new auth infrastructure.
6. **Materialized views are read-only caches.** They are never written directly and are never authoritative. They can be rebuilt from the ledger at any time.
7. **No event sourcing.** The transaction-ledger model is sufficient for V1. Event sourcing can be evaluated when multi-service architecture is needed.
8. **TypeScript strict mode is enabled** for all code under `src/inventory/`. Legacy code outside this directory remains at the project-wide strict setting.

---

## Section 1 — Project Structure

```
src/
├── inventory/                          ← SELF-CONTAINED SUBSYSTEM
│   ├── index.ts                        ← Barrel exports (public API)
│   │
│   ├── engine/                         ← GENERIC CORE (no alcohol knowledge)
│   │   ├── types.ts                    ← Product, Transaction, Supplier, Location, Category
│   │   ├── ledger.ts                   ← INSERT transaction, SUM balance, point-in-time balance
│   │   ├── conversion.ts              ← UOM conversion (base↔display, cross-UOM)
│   │   ├── reconciliation.ts          ← Expected vs actual variance calculation
│   │   └── alerts.ts                  ← Rule-based alert evaluation
│   │
│   ├── modules/
│   │   └── bar/                        ← BAR MODULE (first engine consumer)
│   │       ├── types.ts                ← Menu link, pour config, cocktail recipe types
│   │       ├── config.ts               ← Bottle/pour setup, display preferences
│   │       ├── cocktail-engine.ts      ← Multi-ingredient deduction (future)
│   │       └── bar-integration.ts      ← Links to bar_items table
│   │
│   ├── api/                            ← API ROUTES (Next.js App Router)
│   │   ├── products/
│   │   │   ├── route.ts                ← GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts            ← GET, PATCH, DELETE
│   │   ├── transactions/
│   │   │   ├── route.ts                ← GET (list), POST (create single)
│   │   │   └── batch/
│   │   │       └── route.ts            ← POST (atomic batch)
│   │   ├── stock-counts/
│   │   │   ├── route.ts                ← GET, POST (create session)
│   │   │   └── [id]/
│   │   │       ├── route.ts            ← GET (session detail), PATCH
│   │   │       ├── items/
│   │   │       │   └── route.ts        ← POST (save count items)
│   │   │       ├── submit/route.ts     ← POST (submit for review)
│   │   │       ├── approve/route.ts    ← POST (approve + apply adjustments)
│   │   │       └── cancel/route.ts     ← POST (cancel session)
│   │   ├── imports/
│   │   │   ├── route.ts                ← GET (list), POST (upload + preview)
│   │   │   ├── template/
│   │   │   │   └── route.ts            ← GET (download Excel template)
│   │   │   └── [id]/
│   │   │       ├── route.ts            ← GET (detail)
│   │   │       ├── approve/route.ts    ← POST (apply import)
│   │   │       └── rollback/route.ts   ← POST (reverse import)
│   │   ├── suppliers/
│   │   │   ├── route.ts                ← CRUD
│   │   │   └── [id]/
│   │   │       └── route.ts            ← GET, PATCH, DELETE
│   │   ├── locations/
│   │   │   ├── route.ts                ← CRUD
│   │   │   └── [id]/
│   │   │       └── route.ts            ← GET, PATCH, DELETE
│   │   ├── uoms/
│   │   │   ├── route.ts                ← List, create UOM
│   │   │   └── [id]/
│   │   │       └── route.ts            ← GET, DELETE
│   │   ├── categories/
│   │   │   ├── route.ts                ← List, create (tree-structured)
│   │   │   └── [id]/
│   │   │       └── route.ts            ← PATCH, DELETE
│   │   ├── menu-items/
│   │   │   ├── route.ts                ← List bar_items with inventory links
│   │   │   ├── [id]/
│   │   │   │   ├── link/route.ts       ← POST (link menu item ↔ product)
│   │   │   │   └── unlink/route.ts     ← POST (remove link)
│   │   │   └── unlinked/route.ts       ← GET (menu items without inventory)
│   │   ├── dashboard/
│   │   │   └── route.ts                ← GET (KPIs, alerts, recent activity)
│   │   ├── reports/
│   │   │   ├── daily/route.ts          ← GET (daily stock report)
│   │   │   ├── variance/route.ts       ← GET (variance report)
│   │   │   ├── waste/route.ts          ← GET (waste/breakage report)
│   │   │   ├── fast-movers/route.ts    ← GET (fast movers ranking)
│   │   │   ├── slow-movers/route.ts    ← GET (slow movers ranking)
│   │   │   └── valuation/route.ts     ← GET (inventory valuation)
│   │   └── dashboard-cache/
│   │       └── route.ts                ← POST (admin: refresh cache manually)
│   │
│   ├── lib/                            ← ENGINE INTERNALS
│   │   ├── db.ts                       ← Supabase queries for inventory tables
│   │   ├── import-parser.ts            ← SheetJS Excel parsing + validation
│   │   ├── import-matcher.ts           ← Product matching (supplier code → exact → fuzzy)
│   │   ├── import-mappings.ts          ← CRUD for saved import mappings
│   │   ├── reports.ts                  ← Report query builders
│   │   └── errors.ts                   ← Standardised error types + responses
│   │
│   ├── pages/                          ← NEXT.JS PAGE COMPONENTS
│   │   ├── dashboard/
│   │   │   ├── page.tsx                ← Server component (data fetch)
│   │   │   └── dashboard-client.tsx    ← Client component (interactivity)
│   │   ├── products/
│   │   │   ├── page.tsx                ← Product list
│   │   │   └── [id]/
│   │   │       └── page.tsx            ← Product detail
│   │   ├── transactions/
│   │   │   └── page.tsx                ← Transaction ledger view
│   │   ├── stock-counts/
│   │   │   ├── page.tsx                ← Count session list
│   │   │   ├── new/
│   │   │   │   └── page.tsx            ← Start new count
│   │   │   └── [id]/
│   │   │       └── page.tsx            ← Perform count (card UI) + approve
│   │   ├── imports/
│   │   │   ├── page.tsx                ← Import history
│   │   │   ├── new/
│   │   │   │   └── page.tsx            ← Upload + preview
│   │   │   └── [id]/
│   │   │       └── page.tsx            ← Import detail + rollback
│   │   ├── suppliers/
│   │   │   ├── page.tsx                ← Supplier list
│   │   │   └── [id]/
│   │   │       └── page.tsx            ← Supplier detail
│   │   ├── locations/
│   │   │   └── page.tsx                ← Location list
│   │   ├── reports/
│   │   │   └── page.tsx                ← Report hub + individual reports
│   │   └── settings/
│   │       └── page.tsx                ← UOMs and categories management
│   │
│   └── components/                     ← REUSABLE UI COMPONENTS
│       ├── count-card.tsx              ← Swipeable stock-count card (stepper, progress)
│       ├── product-search.tsx          ← Product search with autocomplete
│       ├── transaction-form.tsx        ← Quick-add transaction form (global action)
│       ├── variance-table.tsx          ← Variance display with reason dropdowns
│       ├── import-preview.tsx          ← Import preview table with per-row decisions
│       ├── supplier-select.tsx         ← Supplier dropdown with search
│       ├── location-select.tsx         ← Location dropdown with search
│       ├── kpi-card.tsx                ← Dashboard KPI card
│       └── alert-banner.tsx            ← Alert list with severity colors
│
├── lib/                                ← EXISTING SHARED LIBRARY
│   ├── supabase.ts                     ← Keep existing. Do not modify.
│   └── ...                             ← All existing files remain unchanged.
│
├── components/admin/                   ← EXISTING ADMIN COMPONENTS
│   ├── Sidebar.tsx                     ← ADD Inventory nav group. Do NOT modify existing groups.
│   └── ...                             ← All existing components remain unchanged.
│
├── jobs/                               ← EXISTING BACKGROUND WORKER
│   └── ...                             ← Unchanged. Future: inventory import jobs.
│
└── middleware.ts                       ← EXISTING AUTH MIDDLEWARE
    └── ...                             ← Add /api/inventory/* to protected route matcher.
```

---

## Section 2 — Database Schema (Final)

### 2.1 Core Engine Tables

These tables form the generic inventory engine. They have zero alcohol-specific knowledge.

```sql
-- ============================================================
-- CORE ENGINE — GENERIC INVENTORY
-- No alcohol, no bottles, no tots, no pour sizes.
-- ============================================================

-- Units of Measure (e.g. "bottle", "tot", "kg", "ml", "case", "piece")
CREATE TABLE inventory_uoms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,      -- "bottle", "tot", "millilitre", "case"
  symbol      TEXT,                      -- "btl", "t", "ml", "cs"
  category    TEXT NOT NULL DEFAULT 'discrete'
              CHECK (category IN ('discrete', 'continuous')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global UOM conversion rates (shared across all products)
-- Example: 1 case = 12 bottles (applies to all beer products)
CREATE TABLE inventory_uom_conversions_global (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id       UUID NOT NULL REFERENCES inventory_uoms(id),
  to_uom_id         UUID NOT NULL REFERENCES inventory_uoms(id),
  factor            NUMERIC(20,6) NOT NULL,  -- multiply from_uom by this to get to_uom
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_uom_id, to_uom_id)
);

-- Product-specific UOM assignments and conversions
CREATE TABLE inventory_product_uoms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  uom_id            UUID NOT NULL REFERENCES inventory_uoms(id),
  is_base           BOOLEAN NOT NULL DEFAULT false,    -- exactly one per product
  is_display        BOOLEAN NOT NULL DEFAULT false,    -- exactly one per product
  conversion_factor NUMERIC(20,6) NOT NULL,             -- 1 of this UOM = N of base UOM
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, uom_id),
  CONSTRAINT one_base_uom CHECK (
    NOT (is_base = true AND is_display = true)
  )
);

-- Locations (bars, storage rooms, cold rooms, etc.)
CREATE TABLE inventory_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,              -- "Main Bar"
  code        TEXT NOT NULL UNIQUE,       -- "MB-01"
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers
CREATE TABLE inventory_suppliers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  contact_person    TEXT,
  phone             TEXT,
  email             TEXT,
  vat_number        TEXT,
  payment_terms     TEXT,
  lead_time_days    INTEGER,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product categories (hierarchical — "Spirits" → "Whiskey" → "Irish")
CREATE TABLE inventory_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  parent_id     UUID REFERENCES inventory_categories(id),
  module        TEXT,                     -- 'bar', 'kitchen', 'coffee', 'consumables'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master product registry
CREATE TABLE inventory_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,               -- "Jameson Irish Whiskey 750ml"
  sku               TEXT,                        -- Internal SKU
  barcode           TEXT,                        -- EAN / UPC / QR
  category_id       UUID REFERENCES inventory_categories(id),
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,

  -- Reorder defaults
  preferred_supplier_id UUID REFERENCES inventory_suppliers(id),
  supplier_code         TEXT,                    -- SKU as used by supplier
  reorder_threshold     NUMERIC(10,2),           -- in display UOM
  reorder_quantity      NUMERIC(10,2),           -- suggested order qty in display UOM

  -- Expiry (future use)
  has_expiry        BOOLEAN NOT NULL DEFAULT false,
  shelf_life_days   INTEGER,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku),
  UNIQUE(barcode)
);

-- ============================================================
-- TRANSACTION LEDGER — THE SINGLE SOURCE OF TRUTH
-- ============================================================

CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN (
    'opening', 'purchase', 'sale', 'sale_bottle', 'breakage', 'spillage',
    'comp', 'staff', 'waste', 'expiry_loss', 'adjustment', 'physical_count',
    'transfer_in', 'transfer_out', 'return', 'production', 'theft', 'donation'
  )),

  -- Quantity in product's BASE UOM
  -- Positive = stock increase, Negative = stock decrease
  quantity          NUMERIC(15,4) NOT NULL,

  -- Cost at time of transaction (for weighted average cost calculation)
  unit_cost         NUMERIC(10,2),

  -- Reference links
  reference_type    TEXT CHECK (reference_type IN (
    'import_batch', 'stock_count', 'purchase_order', 'booking', 'pos_order', 'manual'
  )),
  reference_id      UUID,
  performed_by      UUID REFERENCES staff(id),
  notes             TEXT,

  -- Import rollback tracking
  import_batch_id   UUID REFERENCES inventory_imports(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PERFORMANCE INDEXES
CREATE INDEX idx_tx_balance_lookup
  ON inventory_transactions(product_id, location_id, quantity);
CREATE INDEX idx_tx_product_history
  ON inventory_transactions(product_id, created_at DESC);
CREATE INDEX idx_tx_date
  ON inventory_transactions(created_at);
CREATE INDEX idx_tx_reference
  ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_tx_import
  ON inventory_transactions(import_batch_id);

-- ============================================================
-- CACHED BALANCE (READ-ONLY, NOT AUTHORITATIVE)
-- ============================================================

CREATE TABLE inventory_product_balances (
  product_id    UUID NOT NULL REFERENCES inventory_products(id),
  location_id   UUID NOT NULL REFERENCES inventory_locations(id),
  balance       NUMERIC(15,4) NOT NULL,   -- current stock in base UOM
  refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, location_id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE inventory_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored', 'hard_deleted')),
  changes       JSONB,
  performed_by  UUID REFERENCES staff(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Bar Module Tables

These tables sit on top of the engine and add alcohol-specific semantics.

```sql
-- ============================================================
-- BAR MODULE — alcohol-specific configuration
-- ============================================================

-- Links bar menu items to inventory products (M:N)
CREATE TABLE bar_item_inventory_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_item_id         UUID NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,
  inventory_product_id UUID NOT NULL REFERENCES inventory_products(id),
  pour_size_ml        NUMERIC(10,2) NOT NULL,     -- e.g. 25ml for a shot, 50ml for a double
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bar_item_id, inventory_product_id)
);

-- Bottle/pour configuration for alcohol products
CREATE TABLE bar_product_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES inventory_products(id) UNIQUE,
  bottle_size_ml        NUMERIC(10,2) NOT NULL,
  pour_size_ml          NUMERIC(10,2) NOT NULL,
  display_as            TEXT NOT NULL DEFAULT 'bottles_and_tots'
                        CHECK (display_as IN ('bottles_and_tots', 'tots_only', 'ml')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Supplier & Import Tables

```sql
-- ============================================================
-- IMPORT & SUPPLIER TRACKING
-- ============================================================

-- Import batches
CREATE TABLE inventory_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type     TEXT NOT NULL CHECK (import_type IN ('supplier_delivery', 'physical_count', 'adjustment')),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'previewed', 'approved', 'applied', 'rolled_back', 'failed')),
  supplier_id     UUID REFERENCES inventory_suppliers(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  row_count       INTEGER,
  matched_count   INTEGER,
  unknown_count   INTEGER,
  error_count     INTEGER,
  errors          JSONB,
  applied_by      UUID REFERENCES staff(id),
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import product mappings (remembers fuzzy-match decisions)
CREATE TABLE inventory_import_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           UUID REFERENCES inventory_suppliers(id),
  supplier_product_name TEXT NOT NULL,
  supplier_sku          TEXT,
  normalized_name       TEXT,                  -- lowercase, stripped, for matching
  matched_product_id    UUID REFERENCES inventory_products(id),
  confidence            NUMERIC(5,4),
  auto_approve          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, supplier_product_name)
);
```

### 2.4 Stock Count Tables

```sql
-- ============================================================
-- PHYSICAL STOCK COUNTS
-- ============================================================

CREATE TABLE inventory_stock_counts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  status            TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'submitted', 'approved', 'cancelled')),
  snapshot_tx_before UUID,                  -- last transaction ID when count started
  snapshot_tx_after  UUID,                  -- last transaction ID when count was approved
  performed_by      UUID REFERENCES staff(id),
  approved_by       UUID REFERENCES staff(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE TABLE inventory_stock_count_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id    UUID NOT NULL REFERENCES inventory_stock_counts(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  physical_bottles  NUMERIC(10,2),             -- display value (bottles)
  physical_tots     NUMERIC(10,2),             -- display value (tots)
  physical_quantity NUMERIC(15,4) NOT NULL,    -- in base UOM (always stored)
  expected_quantity NUMERIC(15,4),             -- pre-calculated at count start
  variance          NUMERIC(15,4) GENERATED ALWAYS AS (physical_quantity - expected_quantity) STORED,
  variance_reason   TEXT,
  UNIQUE(stock_count_id, product_id)
);
```

### 2.5 Dashboard Cache Tables

```sql
-- ============================================================
-- DASHBOARD CACHE
-- ============================================================

CREATE TABLE inventory_dashboard_cache (
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  total_products    INTEGER NOT NULL DEFAULT 0,
  total_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_alerts      INTEGER NOT NULL DEFAULT 0,
  low_stock_count   INTEGER NOT NULL DEFAULT 0,
  drinks_sold_today INTEGER NOT NULL DEFAULT 0,
  estimated_loss    NUMERIC(12,2) NOT NULL DEFAULT 0,
  refreshed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (location_id)
);
```

### 2.6 Existing Table Changes

```sql
-- ============================================================
-- EXISTING SYSTEM — Additive, Backward-Compatible Changes
-- ============================================================

-- Add optional inventory link to bar_items (nullable, no breaking change)
ALTER TABLE bar_items
  ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN NOT NULL DEFAULT false;
```

### 2.7 Entity Relationship Diagram

```
┌────────────────┐       ┌─────────────────────────┐       ┌───────────────────┐
│ inventory_uoms │       │ inventory_product_uoms   │       │ inventory_products │
│────────────────│       │─────────────────────────│       │───────────────────│
│ PK id          │──1:N──│ PK id                    │──N:1──│ PK id             │
│ name           │       │ FK product_id            │       │ name              │
│ symbol         │       │ FK uom_id                │       │ sku               │
│ category       │       │ is_base                  │       │ category_id ──────┐│
└────────────────┘       │ is_display               │       │ preferred_supplier│
                         │ conversion_factor        │       └────────┬──────────┘
                         └──────────────────────────┘                │
                                                                     │1:N
                            ┌──────────────────────────────────┐     │
                            │ inventory_transactions            │     │
                            │──────────────────────────────────│     │
                            │ PK id                            │─────┘
                            │ FK product_id                    │
                            │ FK location_id                   │─────┐
                            │ FK import_batch_id               │     │
                            │ quantity                         │     │
                            │ unit_cost                        │     │
                            │ transaction_type                 │     │
                            │ reference_type, reference_id     │     │
                            │ performed_by ───── staff.id      │     │
                            │ created_at                       │     │
                            └──────────────────────────────────┘     │
                                                                     │
                                                                     │
┌────────────────────┐    ┌──────────────────┐    ┌──────────────────┐│
│ inventory_locations │    │ inventory_imports │    │ inventory_import ││
│────────────────────│    │──────────────────│    │ _mappings        ││
│ PK id              │    │ PK id            │    │─────────────────││
│ name               │    │ import_type      │    │ PK id           ││
│ code               │    │ supplier_id ─────┘    │ matched_product ││
│ is_active          │    │ idempotency_key  │    │ supplier_sku    ││
└────────────────────┘    │ status           │    │ auto_approve    ││
                          └──────────────────┘    └──────────────────┘│
                                                                     │
┌───────────────────────┐    ┌───────────────────────────┐           │
│ inventory_stock_counts │    │ inventory_stock_count_     │           │
│───────────────────────│    │ items                     │           │
│ PK id                 │──1:N│───────────────────────────│           │
│ FK location_id        │    │ PK id                     │           │
│ status                │    │ FK stock_count_id         │           │
│ snapshot_tx_before    │    │ FK product_id ───────────────┘         │
│ snapshot_tx_after     │    │ physical_quantity          │           │
│ created_at            │    │ expected_quantity          │           │
└───────────────────────┘    │ variance (GENERATED)       │           │
                             └───────────────────────────┘           │
                                                                     │
┌────────────────────┐         ┌──────────────────────────┐          │
│ bar_item_inventory │         │ inventory_product_balances│          │
│ _links             │         │──────────────────────────│          │
│────────────────────│         │ PK product_id             │          │
│ FK bar_item_id     │         │ PK location_id            │          │
│ FK product_id ─────┼─────────│ balance (cached, read-only)│         │
│ pour_size_ml       │         │ refreshed_at              │          │
└────────────────────┘         └──────────────────────────┘          │
```

---

## Section 3 — API Contracts

### 3.1 Standard Error Envelope

Every API response follows this structure:

```typescript
// Success
{
  "data": T,                             // The response payload
  "meta"?: {                             // Pagination metadata (when applicable)
    "cursor": string | null,
    "hasMore": boolean,
    "total"?: number
  }
}

// Error
{
  "error": {
    "code": string,                      // 'VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', etc.
    "message": string,                   // Human-readable
    "details"?: Record<string, any>      // Machine-readable details (field errors, etc.)
  }
}
```

HTTP status codes:
- `200` — GET success
- `201` — POST/PUT create success
- `204` — DELETE success (no body)
- `400` — Validation error (BAD_REQUEST, VALIDATION_ERROR)
- `401` — Not authenticated (UNAUTHORIZED)
- `403` — Authenticated but not authorised (FORBIDDEN)
- `404` — Resource not found (NOT_FOUND)
- `409` — Conflict (DUPLICATE, CONCURRENT_MODIFICATION)
- `422` — Business logic error (INSUFFICIENT_STOCK, INVALID_TRANSITION)
- `429` — Rate limited (RATE_LIMITED)
- `500` — Internal server error (INTERNAL_ERROR)

### 3.2 Response Helpers

```typescript
// src/inventory/lib/errors.ts
export function ok<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json({ data, meta }, { status: 200 })
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 })
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function apiError(code: string, message: string, status: number, details?: any) {
  return NextResponse.json({ error: { code, message, details } }, { status })
}
```

### 3.3 Endpoint Specifications

#### Products

```
GET /api/inventory/products
  Query: ?page_size=50&cursor=<created_at>&category_id=&search=&is_active=true
  Response: { data: Product[], meta: { cursor, hasMore } }

POST /api/inventory/products
  Body: { name, sku?, barcode?, category_id?, image_url?, preferred_supplier_id?,
          supplier_code?, reorder_threshold?, reorder_quantity?,
          uoms: [{ uom_id, is_base, is_display, conversion_factor }] }
  Response: { data: Product } (201)

GET /api/inventory/products/:id
  Response: { data: Product & { current_balance: number, location_id: string } }

PATCH /api/inventory/products/:id
  Body: Partial<Product>
  Response: { data: Product }

DELETE /api/inventory/products/:id
  Response: 204 (if no transactions → hard delete)
  Response: 409 (if has transactions → must archive instead)

POST /api/inventory/products/:id/restore
  Response: { data: Product }

GET /api/inventory/products/archived
  Response: { data: Product[] }
```

#### Transactions

```
GET /api/inventory/transactions
  Query: ?product_id=&location_id=&type=&from=&to=&cursor=&page_size=50
  Response: { data: Transaction[], meta: { cursor, hasMore } }

POST /api/inventory/transactions
  Body: { product_id, location_id, transaction_type, quantity,
          unit_cost?, reference_type?, reference_id?, notes? }
  Response: { data: Transaction } (201)

POST /api/inventory/transactions/batch
  Body: { transactions: TransactionInput[] }  (all-or-nothing)
  Response: { data: Transaction[] } (201)

GET /api/inventory/transactions/types
  Response: { data: string[] }  (list of valid transaction types)
```

#### Stock Counts

```
GET /api/inventory/stock-counts
  Response: { data: StockCount[] }

POST /api/inventory/stock-counts
  Body: { location_id }
  Response: { data: StockCount } (201)

GET /api/inventory/stock-counts/:id
  Response: { data: StockCount & { items: StockCountItem[] } }

PATCH /api/inventory/stock-counts/:id
  Body: { notes? }
  Response: { data: StockCount }

POST /api/inventory/stock-counts/:id/items
  Body: { items: [{ product_id, physical_quantity }] }  (batch save)
  Response: { data: StockCountItem[] }

POST /api/inventory/stock-counts/:id/submit
  Response: { data: StockCount }  (status → submitted)

POST /api/inventory/stock-counts/:id/approve
  Body: { variance_reasons?: [{ product_id, reason }] }
  Response: { data: StockCount }  (status → approved, adjustments applied)

POST /api/inventory/stock-counts/:id/cancel
  Response: { data: StockCount }
```

#### Imports

```
GET /api/inventory/imports
  Response: { data: ImportBatch[] }

POST /api/inventory/imports      (multipart/form-data)
  Body: file (Excel), type (supplier_delivery|physical_count|adjustment)
  Response: { data: ImportPreview }  (parsed + matched, NOT yet applied)

GET /api/inventory/imports/template?type=supplier_delivery
  Response: Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

GET /api/inventory/imports/:id
  Response: { data: ImportBatch & { rows: ImportRow[] } }

POST /api/inventory/imports/:id/approve
  Body: { decisions: [{ row_index, action: 'create'|'merge'|'skip'|'create_mapping',
                        product_id?, name?, category_id?, uoms? }] }
  Response: { data: ImportBatch }  (status → applied)

POST /api/inventory/imports/:id/rollback
  Response: { data: ImportBatch }  (status → rolled_back)

POST /api/inventory/import-mappings
  Body: { supplier_id, supplier_product_name, supplier_sku?, matched_product_id, auto_approve? }
  Response: { data: ImportMapping }

DELETE /api/inventory/import-mappings/:id
  Response: 204
```

#### Suppliers

```
GET    /api/inventory/suppliers          → { data: Supplier[] }
POST   /api/inventory/suppliers          → { data: Supplier } (201)
GET    /api/inventory/suppliers/:id      → { data: Supplier & { products: Product[] } }
PATCH  /api/inventory/suppliers/:id      → { data: Supplier }
DELETE /api/inventory/suppliers/:id      → 204
POST   /api/inventory/suppliers/:id/restore → { data: Supplier }
```

#### Locations

```
GET    /api/inventory/locations            → { data: Location[] }
POST   /api/inventory/locations            → { data: Location } (201)
GET    /api/inventory/locations/:id        → { data: Location & { stock_summary: ... } }
PATCH  /api/inventory/locations/:id        → { data: Location }
DELETE /api/inventory/locations/:id        → 204
POST   /api/inventory/locations/:id/restore → { data: Location }
GET    /api/inventory/locations/:id/stock  → { data: { product_id, balance }[] }
```

#### UOMs & Categories

```
GET    /api/inventory/uoms                 → { data: Uom[] }
POST   /api/inventory/uoms                 → { data: Uom } (201)
GET    /api/inventory/uoms/:id             → { data: Uom }
DELETE /api/inventory/uoms/:id             → 204 (only if unused)
GET    /api/inventory/uoms/conversions     → { data: UomConversion[] }
POST   /api/inventory/uoms/conversions     → { data: UomConversion } (201)

GET    /api/inventory/categories           → { data: Category[] } (tree)
POST   /api/inventory/categories           → { data: Category } (201)
PATCH  /api/inventory/categories/:id       → { data: Category }
DELETE /api/inventory/categories/:id       → 204 (soft)
```

#### Menu Integration

```
GET    /api/inventory/menu-items           → { data: { bar_item: BarItem, link?: Link }[] }
POST   /api/inventory/menu-items/:id/link  → Body: { product_id, pour_size_ml }
                                            → Response: { data: Link } (201)
POST   /api/inventory/menu-items/:id/unlink → 204
GET    /api/inventory/menu-items/unlinked  → { data: BarItem[] }
```

#### Dashboard

```
GET /api/inventory/dashboard
  Query: ?location_id=
  Response: {
    data: {
      kpis: { inventoryValue, productsTracked, drinksSoldToday, estimatedLoss, activeAlerts },
      alerts: Alert[],
      recentActivity: Activity[],
      reconciliation: { totalExpected, totalPhysical, variance, variancePercent, estimatedLoss },
      fastMovers: { product, quantity }[],
      slowMovers: { product, quantity }[]
    }
  }

POST /api/inventory/dashboard-cache/refresh
  Response: 202 (accepted, refresh in progress)
```

#### Reports

```
GET /api/inventory/reports/daily?date=&location_id=
  Response: { data: DailyReport }

GET /api/inventory/reports/variance?from=&to=&location_id=&threshold=
  Response: { data: VarianceReport }

GET /api/inventory/reports/waste?from=&to=&location_id=
  Response: { data: WasteReport }

GET /api/inventory/reports/fast-movers?days=7&limit=10&location_id=
  Response: { data: FastMover[] }

GET /api/inventory/reports/slow-movers?days=30&limit=10&location_id=
  Response: { data: SlowMover[] }

GET /api/inventory/reports/valuation?location_id=
  Response: { data: ValuationReport }
```

---

## Section 4 — Service Layer Architecture

### 4.1 Engine Service

```typescript
// src/inventory/engine/ledger.ts — Public API

export function createTransaction(input: {
  productId: string
  locationId: string
  transactionType: TransactionType
  quantity: number              // In base UOM. Negative = decrease.
  unitCost?: number
  referenceType?: string
  referenceId?: string
  performedBy?: string
  notes?: string
  importBatchId?: string
}): Promise<Transaction>

export function getBalance(productId: string, locationId: string): Promise<number>
// Returns current stock in base UOM. SUM(quantity) WHERE product_id AND location_id.

export function getBalanceAtTime(productId: string, locationId: string, timestamp: Date): Promise<number>
// Point-in-time balance. SUM(quantity) WHERE product_id AND location_id AND created_at <= timestamp.

export function getBalances(locationId: string): Promise<Map<string, number>>
// All product balances at a location. Used for dashboard. Can read from cache table.

export function getTransactionHistory(productId: string, options: {
  cursor?: string, pageSize?: number, from?: Date, to?: Date
}): Promise<{ transactions: Transaction[], cursor: string | null, hasMore: boolean }>
```

### 4.2 Reconciliation Service

```typescript
// src/inventory/engine/reconciliation.ts

export function calculateExpectedBalance(
  productId: string,
  locationId: string,
  since: Date          // typically the last stock count timestamp
): Promise<number>
// SUM(transactions) since the last count. This is the "expected" stock value.

export function reconcile(options: {
  stockCountId: string
}): Promise<ReconciliationResult>
// For each item in the stock count:
//   expected = calculateExpectedBalance(productId, locationId, since)
//   actual = countItem.physicalQuantity
//   variance = actual - expected
// Returns { items, summary }
```

### 4.3 Import Service

```typescript
// src/inventory/lib/import-parser.ts

export function parseExcel(buffer: Buffer, type: ImportType): Promise<ImportParseResult>
// Uses SheetJS. Validates columns, parses quantities, returns structured rows.

export function matchProducts(rows: ImportRow[], supplierId?: string): Promise<MatchedRow[]>
// For each row:
//   1. Match by supplier_code on inventory_products (exact)
//   2. Match by inventory_import_mappings (supplier_product_name)
//   3. Match by exact name on inventory_products
//   4. Match by fuzzy name (trigram similarity ≥ 0.6)
//   5. No match → mark unknown
// Returns rows with match_confidence and suggested_actions.

export function applyImport(batchId: string, decisions: ImportDecision[]): Promise<void>
// Single DB transaction:
//   For each row with action 'create':
//     INSERT inventory_product + inventory_product_uoms + bar_product_config (if bar module)
//   For each row with action 'merge' or 'create_mapping':
//     INSERT or UPDATE inventory_import_mappings
//   For each row with action 'approve' (already matched):
//     INSERT inventory_transaction (type = 'purchase' or 'physical_count')
//   UPDATE inventory_imports SET status = 'applied'

export function rollbackImport(batchId: string): Promise<void>
// Single DB transaction:
//   For each transaction with this import_batch_id:
//     INSERT reversal transaction (negative quantity, type = 'adjustment')
//   UPDATE inventory_imports SET status = 'rolled_back'
```

### 4.4 Stock Count Service

```typescript
// src/inventory/engine/stock-counts.ts (lives in engine/, not modules/)

export function createStockCount(locationId: string, performedBy?: string): Promise<StockCount>
// INSERT into inventory_stock_counts
// Record snapshot_tx_before = MAX(id) FROM inventory_transactions at this moment

export function saveCountItems(stockCountId: string, items: CountItemInput[]): Promise<void>
// Batch UPSERT into inventory_stock_count_items
// For each item, compute expected_quantity from ledger at snapshot_tx_before time

export function submitStockCount(stockCountId: string): Promise<StockCount>
// Validate all products at the location have been counted (or flagged as skipped)
// Set status = 'submitted'

export function approveStockCount(
  stockCountId: string,
  varianceReasons?: { productId: string; reason: string }[],
  approvedBy?: string
): Promise<StockCount>
// For each count item with variance ≠ 0:
//   INSERT inventory_transaction (type = 'physical_count', quantity = variance)
// Update snapshot_tx_after = MAX(id) FROM inventory_transactions
// Set status = 'approved', approved_by, completed_at
// Refresh dashboard cache for the location
```

### 4.5 Dashboard Cache Service

```typescript
// src/inventory/engine/dashboard.ts

export async function refreshDashboardCache(locationId: string): Promise<void>
// Compute all KPI values from the ledger and write to inventory_dashboard_cache:
//   total_products = COUNT active products at location
//   total_value = SUM(balance × latest_unit_cost)
//   total_alerts = COUNT active alerts for this location
//   low_stock_count = COUNT products where balance < reorder_threshold
//   drinks_sold_today = SUM(quantity WHERE transaction_type = 'sale' AND date = today)
//   estimated_loss = SUM(|variance| × unit_cost for last completed stock count)

// Called:
//   - After stock count approval
//   - After import application
//   - Via admin button "Refresh Cache"
//   - Every 5 minutes via cron (future)
```

---

## Section 5 — Data Flow Diagrams

### 5.1 Supplier Delivery (Excel Import)

```
SUPPLIER                      MANAGER                    INVENTORY SYSTEM                DATABASE
   │                            │                              │                           │
   │   Delivers goods            │                              │                           │
   │ ──────────────────────────► │                              │                           │
   │                            │  1. Upload delivery note     │                           │
   │                            │     (Excel file)             │                           │
   │                            │ ───────────────────────────► │                           │
   │                            │                              │  2. Store file in          │
   │                            │                              │     Supabase Storage       │
   │                            │                              │ ────────────────────────► │
   │                            │                              │  3. INSERT import_batch    │
   │                            │                              │     (status: pending,      │
   │                            │                              │      idempotency_key)      │
   │                            │                              │ ────────────────────────► │
   │                            │                              │                           │
   │                            │  4. Return preview:          │                           │
   │                            │     - 10 matched             │                           │
   │                            │     - 1 unknown              │                           │
   │                            │     - 0 errors               │                           │
   │                            │ ◄─────────────────────────── │                           │
   │                            │                              │                           │
   │                            │  5. Unknown: "Create new"    │                           │
   │                            │  6. Tap [Apply Import]       │                           │
   │                            │ ───────────────────────────► │                           │
   │                            │                              │  7. BEGIN                 │
   │                            │                              │ ────────────────────────► │
   │                            │                              │  8. INSERT new product    │
   │                            │                              │     (if applicable)        │
   │                            │                              │ ────────────────────────► │
   │                            │                              │  9. INSERT purchase txs   │
   │                            │                              │     (×10 matched rows)     │
   │                            │                              │ ────────────────────────► │
   │                            │                              │ 10. INSERT import mapping │
   │                            │                              │     (for future)           │
   │                            │                              │ ────────────────────────► │
   │                            │                              │ 11. UPDATE batch status   │
   │                            │                              │     (status: applied)      │
   │                            │                              │ ────────────────────────► │
   │                            │                              │ 12. COMMIT                │
   │                            │                              │ ────────────────────────► │
   │                            │                              │ 13. Refresh dashboard     │
   │                            │                              │     cache                 │
   │                            │                              │ ────────────────────────► │
   │                            │ 14. "Import applied:         │                           │
   │                            │     10 products updated,     │                           │
   │                            │     1 product created"       │                           │
   │                            │ ◄─────────────────────────── │                           │
```

### 5.2 Physical Stock Count

```
MANAGER                   INVENTORY SYSTEM                      DATABASE
   │                            │                                  │
   │  1. Tap [New Count]        │                                  │
   │ ───────────────────────► │                                  │
   │                            │  2. INSERT stock_count           │
   │                            │     (status: in_progress,        │
   │                            │      snapshot_tx_before = MAX)   │
   │                            │ ──────────────────────────────► │
   │                            │  3. Load product list + balances│
   │                            │ ◄────────────────────────────── │
   │  4. Show card UI           │                                  │
   │ ◄──────────────────────────│                                  │
   │                            │                                  │
   │  ┌── COUNT LOOP ──────────────────────────────────┐          │
   │  │  5. Tap +/- to adjust                          │          │
   │  │  6. Swipe to next                              │          │
   │  │  7. Auto-save each card                        │          │
   │  │ ───────────────────────────────────────────────► │        │
   │  └───────────────────────────────────────────────────┘        │
   │                            │                                  │
   │  8. Tap [Submit Count]     │                                  │
   │ ───────────────────────► │                                  │
   │                            │  9. Validate all products        │
   │                            │     counted or skipped           │
   │                            │ 10. Compute expected for each    │
   │                            │     (from ledger at snapshot)    │
   │                            │ 11. Set status = submitted       │
   │                            │ ──────────────────────────────► │
   │  12. Show summary:         │                                  │
   │      - 84/84 counted       │                                  │
   │      - 3 variances > 5%   │                                  │
   │ ◄──────────────────────────│                                  │
   │                            │                                  │
   │  13. Add variance reasons  │                                  │
   │  14. Tap [Approve Count]   │                                  │
   │ ───────────────────────► │                                  │
   │                            │ 15. BEGIN                        │
   │                            │ ──────────────────────────────► │
   │                            │ 16. INSERT physical_count txs   │
   │                            │     (variance for each product) │
   │                            │ ──────────────────────────────► │
   │                            │ 17. UPDATE stock_count           │
   │                            │     (status: approved,           │
   │                            │      snapshot_tx_after = MAX)    │
   │                            │ ──────────────────────────────► │
   │                            │ 18. COMMIT                       │
   │                            │ ──────────────────────────────► │
   │                            │ 19. Refresh dashboard cache     │
   │                            │ ──────────────────────────────► │
   │  20. "Count approved.      │                                  │
   │      4 adjustments applied.│                                  │
   │      Variance: -22 tots    │                                  │
   │      (-R72.00)"            │                                  │
   │ ◄──────────────────────────│                                  │
```

### 5.3 Manual Transaction (Wastage / Breakage / Comp)

```
BARTENDER                 INVENTORY SYSTEM                        DATABASE
   │                            │                                  │
   │  1. Tap [Record] FAB       │                                  │
   │     (floating action btn)  │                                  │
   │ ───────────────────────► │                                  │
   │  2. Bottom sheet opens:   │                                  │
   │     Product search         │                                  │
   │     Type: [Spillage ▼]    │                                  │
   │     Qty: [-] 1 [+]        │                                  │
   │     Notes: "Spilled while │                                  │
   │            pouring"       │                                  │
   │ ───────────────────────► │                                  │
   │                            │  3. Validate: quantity > 0      │
   │                            │     product exists              │
   │                            │     type is valid               │
   │  4. Tap [Record]           │                                  │
   │ ───────────────────────► │                                  │
   │                            │  5. INSERT transaction          │
   │                            │     (type: spillage,            │
   │                            │      quantity: -1,              │
   │                            │      performed_by: bartender)   │
   │                            │ ──────────────────────────────► │
   │                            │  6. Check reorder thresholds   │
   │                            │     → generate alert if low    │
   │  7. "Recorded: -1 tot     │                                  │
   │      Jameson (Spillage).   │                                  │
   │      Remaining: 18B+9T"   │                                  │
   │ ◄──────────────────────────│                                  │
```

---

## Section 6 — Security Model

### 6.1 Authentication

Inventory reuses the existing auth system (middleware.ts). No new auth infrastructure.

```
Middleware checks for any /api/inventory/* route:
  - Cookie-based role check (admin/kitchen)/waiter/bar)
  - PIN-based staff session fallback
  - Returns 401 if unauthenticated
  - Sets x-user-role header for downstream handlers

Page-level checks:
  - All /admin/inventory/* pages require 'admin' role
  - Same pattern as existing admin pages (middleware + client-side useEffect)
```

### 6.2 Authorisation Matrix

| Operation | Admin | Manager | Assistant | Bartender | Storeman |
|---|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ❌ | ✅ |
| View products | ✅ | ✅ | ✅ | ✅ | ✅ |
| View stock levels | ✅ | ✅ | ✅ | ✅ | ✅ |
| View transaction history | ✅ | ✅ | ✅ | ❌ | ✅ |
| Record sale/spillage/comp/staff/breakage | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create/update products | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage locations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload import | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve import | ✅ | ✅ | ❌ | ❌ | ❌ |
| Rollback import (<24h) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Start stock count | ✅ | ✅ | ✅ | ❌ | ✅ |
| Approve stock count | ✅ | ✅ | ❌ | ❌ | ❌ |
| Make adjustments | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ❌ | ✅ |
| Archive/restore products | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage UOMs/categories | ✅ | ✅ | ❌ | ❌ | ❌ |
| Link menu items to products | ✅ | ✅ | ❌ | ❌ | ❌ |

Implementation: Role check at the start of each API handler using existing `requireRoleFromHeadersOrSession()`:

```typescript
// src/inventory/api/middleware.ts
export async function requireInventoryRole(
  request: NextRequest,
  allowedRoles: Role[] = ['admin']
): Promise<NextResponse | null> {
  return requireRoleFromHeadersOrSession(request.headers, allowedRoles)
}
```

### 6.3 Audit Trail

All mutations to inventory tables are logged in `inventory_audit_log`:

| Action | Logged |
|---|---|
| Product created | ✅ — created |
| Product updated | ✅ — updated (changes: JSONB) |
| Product archived | ✅ — archived |
| Product restored | ✅ — restored |
| Product hard-deleted | ✅ — hard_deleted (before row removed) |
| Transaction inserted | Not logged separately (transaction IS the audit trail) |
| Import applied | ✅ — audit log + import_batch.status change |
| Import rolled back | ✅ — audit log + import_batch.status change |
| Stock count approved | ✅ — audit log + count status change |
| Configuration change | ✅ — UOM, category, supplier, location changes |

The transaction ledger itself serves as the audit trail for all stock movements. The `inventory_audit_log` covers metadata changes (products, suppliers, configurations).

---

## Section 7 — Performance Strategy

### 7.1 Targets

| Operation | Target | Measurement |
|---|---|---|
| Single product balance | <100ms | P99 database query |
| Dashboard load (V1 scale: 500 products) | <2s | API response time P95 |
| Import preview (200 rows) | <3s | End-to-end P95 |
| Import apply (200 rows) | <2s | Database write P95 |
| Stock count save (84 items) | <1s | Database write P95 |
| Reconciliation | <3s | Query + calculation P95 |

### 7.2 Index Strategy

Primary indexes are defined in the schema (Section 2). Additional notes:

- `idx_tx_balance_lookup` on `(product_id, location_id, quantity)` is a **covering index** — the `SUM(quantity)` query never touches the table, only the index.
- `idx_tx_product_history` on `(product_id, created_at DESC)` supports cursor-based pagination of transaction history.
- Monthly partitioning is recommended at >100K transactions. The schema supports `PARTITION BY RANGE (created_at)`.

### 7.3 Dashboard Cache

The `inventory_dashboard_cache` table is refreshed:
- On demand: via `POST /api/inventory/dashboard-cache/refresh`
- On events: after stock count approval, after import application
- Scheduled: every 5 minutes via background job (future)

The dashboard API reads from `inventory_dashboard_cache` first, returning stale data if the cache is recent (<5 minutes). If the cache is older or empty, it computes live from the ledger.

### 7.4 Product Balance Cache

`inventory_product_balances` is a cache table (not materialized view) to avoid materialized view locking issues:

```typescript
// Refresh strategy
export async function refreshProductBalance(productId: string, locationId: string): Promise<void> {
  const balance = await computeBalanceFromLedger(productId, locationId)
  await db.from('inventory_product_balances').upsert({
    product_id: productId,
    location_id: locationId,
    balance,
    refreshed_at: new Date().toISOString()
  }, { onConflict: 'product_id, location_id' })
}
```

Reads check the cache first. If `refreshed_at` is within 60 seconds, return cached. Otherwise, compute live and update cache asynchronously.

### 7.5 Costing Method

**Weighted Average Cost** is the standard method:

```
After each purchase:
  new_avg = ((current_qty × current_avg) + (purchase_qty × purchase_unit_cost)) / (current_qty + purchase_qty)

At any point:
  stock_value = current_qty × current_avg
```

The `unit_cost` field on each purchase transaction stores the price paid at that time. The weighted average is computed from the transaction history.

---

## Section 8 — Testing Strategy

### 8.1 Testing Pyramid

```
           ╱─────╲
         ╱  E2E   ╲           ← 1 integration test per critical flow
        ╱    (5%)   ╲
       ╱─────────────╲
      ╱  Integration  ╲        ← 1 per API endpoint (happy path)
     ╱     (20%)       ╲
    ╱───────────────────╲
   ╱      Unit Tests     ╲     ← Every business logic function
  ╱       (75%)           ╲
 ╱─────────────────────────╲
```

### 8.2 What to Test (V1)

**Unit tests (engine):**
- `ledger.ts`: `createTransaction`, `getBalance`, `getBalanceAtTime`
- `conversion.ts`: base↔display conversion, cross-UOM conversion, boundary cases
- `reconciliation.ts`: variance calculation, expected balance computation
- `alerts.ts`: threshold evaluation, alert generation
- `import-parser.ts`: column detection, quantity parsing, error handling
- `import-matcher.ts`: supplier code match, exact match, fuzzy match, no match

**Unit tests (bar module):**
- `config.ts`: tot conversion, bottle/tot display formatting
- `bar-integration.ts`: menu item linking, pour size application

**Integration tests (API):**
- `POST /api/inventory/transactions`: create transaction, verify balance update
- `POST /api/inventory/imports + approve`: full import flow, verify stock change
- `POST /api/inventory/stock-counts/:id/approve`: full count flow, verify adjustments
- `POST /api/inventory/imports/:id/rollback`: verify stock reversal

**E2E tests:**
- Full supplier delivery flow: upload → preview → approve → verify
- Full stock count flow: create → count → submit → approve → verify

### 8.3 Tooling

- **Test runner:** Vitest (configured in `vitest.config.ts` at project root)
- **Database:** Testcontainers (PostgreSQL) or Supabase local instance for integration tests
- **Mocking:** `vi.mock()` for Supabase client in unit tests
- **Coverage target:** 80% for `src/inventory/engine/`, 60% for `src/inventory/api/`

### 8.4 CI Integration

```yaml
# .github/workflows/inventory-ci.yml (created before Phase 1A)
name: Inventory CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit -p tsconfig.json    # type check everything
      - run: npx vitest run --coverage src/inventory/
      - run: npm run build                          # ensure Next.js builds
```

---

## Section 9 — Migration Plan

### 9.1 Migration from Current State

The system has 37 existing migrations. Inventory V1 adds:

```
supabase/migrations/
├── 039_inventory_engine.sql           ← Core tables (uoms, products, locations, suppliers,
│                                        categories, transactions, balances, audit log)
├── 040_inventory_bar_module.sql       ← Bar-specific tables (links, pour config)
├── 041_inventory_import_tracking.sql  ← Import batches, import mappings
├── 042_inventory_stock_counts.sql     ← Stock count sessions and items
├── 043_inventory_dashboard_cache.sql  ← Dashboard cache table
└── 044_inventory_bar_items_link.sql   ← ALTER TABLE bar_items ADD has_inventory
```

### 9.2 Data Migration

No data migration from existing tables is needed. Inventory V1 starts with zero stock. Opening balances are set via:
- Excel import (type: `physical_count`) for bulk setup
- Manual `opening` transactions for individual products

The `inventory/importer/migration/` directory does not exist. Data entry is the manager's responsibility during go-live.

### 9.3 Go-Live Sequence

```
1. Apply migrations 039–044 to Supabase (no downtime)
2. Verify schema: run type checks, start dev server, confirm inventory pages load
3. Enable sidebar navigation for Inventory group (no impact on other nav)
4. Admin enters UOMs, categories, suppliers, locations (configuration, ~1 hour)
5. Admin creates inventory products (~2 hours for 200+ products)
6. Admin performs initial physical count via Excel import (opening balance)
7. System goes live: daily stock counts begin
8. Existing bar menu items linked to inventory products (ongoing, as needed)
```

Existing functionality is unaffected during the entire sequence. Inventory pages are accessed via the new sidebar group. No existing page, route, or API endpoint changes.

---

## Section 10 — Implementation Roadmap

### Phase 1A: Foundation (Days 1–12)

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | Configure Vitest, write first test | Test runner works, first passing test |
| 2–3 | Implement `inventory/engine/types.ts`, `ledger.ts`, `conversion.ts` | Ledger engine complete with unit tests |
| 4 | Apply migrations 039–044 to Supabase | Tables exist |
| 5–6 | API: products CRUD, UOMs, categories | 6 API endpoints, test coverage |
| 7–8 | API: transactions CRUD | 3 API endpoints + batch, test coverage |
| 9 | Page: product list + detail | Working UI |
| 10 | Page: transaction ledger | Working UI |
| 11 | Dashboard cache table + refresh logic | Cache works |
| 12 | Page: inventory dashboard | Dashboard page with KPIs + alerts |

### Phase 1B: Suppliers & Locations (Days 13–17)

| Day | Task | Deliverable |
|-----|------|-------------|
| 13 | API + page: supplier CRUD | Supplier management |
| 14 | API + page: location CRUD | Location management |
| 15–16 | Migration 040 (bar module tables), API: menu item linking | Menu items linkable to products |
| 17 | Page: menu integration page | Admin links bar items to inventory |

### Phase 1C: Stock Counts (Days 18–25)

| Day | Task | Deliverable |
|-----|------|-------------|
| 18 | API: stock count CRUD, items save | Count infrastructure |
| 19 | Component: `count-card.tsx` (card UI, stepper, swipe) | Card UI works in isolation |
| 20 | Page: stock count new + perform | Functional count page |
| 21 | API: stock count submit + approve | Approval applies adjustments |
| 22 | Reconciliation engine | Variances calculated correctly |
| 23 | Page: variance review + reason entry | Variance management |
| 24 | E2E tests for stock count workflow | Full flow tested |
| 25 | Bug fixes, polish | Count feature stable |

### Phase 1D: Excel Import (Days 26–32)

| Day | Task | Deliverable |
|-----|------|-------------|
| 26 | `import-parser.ts`: SheetJS integration, column detection | Can parse Excel |
| 27 | `import-matcher.ts`: matching algorithm | Products matched |
| 28 | API: import upload + preview | Preview returned |
| 29 | API: import approve + apply | Import applied to stock |
| 30 | API: import rollback + template download | Rollback works |
| 31 | Page: import history + detail + rollback UI | Full import workflow functional |
| 32 | E2E tests for import workflow | Full flow tested |

### Phase 1E: Reports (Days 33–38)

| Day | Task | Deliverable |
|-----|------|-------------|
| 33 | API: daily stock report | Report endpoint |
| 34 | API: variance, waste/breakage reports | Report endpoints |
| 35 | API: fast/slow movers, valuation | Report endpoints |
| 36 | Page: report hub with all reports | Reports page functional |
| 37 | Performance optimisation, index tuning | Meets performance targets |
| 38 | Final integration testing, bug fixes | V1 ready for production |

---

## Section 11 — Coding Standards

### 11.1 TypeScript

- **Strict mode** is enabled for `src/inventory/`. The `tsconfig.json` should include:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": false
    }
  }
  ```
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and primitives.
- All public function signatures must have explicit return types (no type inference on exports).
- Use `const` assertions (`as const`) for literal types.
- `null` and `undefined` are distinct. Use `undefined` for optional values. Use `null` for explicitly empty values (e.g., "no supplier assigned").

### 11.2 Naming Conventions

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components, `route.ts` for API route handlers.
- **Functions:** `camelCase()` for regular functions, `useCamelCase()` for React hooks, `PascalComponent()` for components.
- **Database tables:** `snake_case` (PostgreSQL convention).
- **API routes:** `kebab-case` path segments (`/stock-counts/`, `/fast-movers/`).
- **SQL columns:** `snake_case` with singular names (`quantity`, not `quantities`).

### 11.3 Error Handling

- Every API route handler is wrapped in try/catch. Catch blocks use `apiError()`.
- Business logic functions throw typed errors:
  ```typescript
  class InsufficientStockError extends Error {
    constructor(productId: string, requested: number, available: number) {
      super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`)
      this.name = 'InsufficientStockError'
    }
  }
  ```
- Unhandled errors are caught by the route handler and returned as `500 INTERNAL_ERROR`.
- `console.error()` is used for server-side logging. Never `console.log()` in production code.

### 11.4 Database Access

- All queries go through a Supabase admin client (service role). RLS is not used for inventory (consistent with existing system pattern).
- Queries are typed: `const { data } = await supabase.from('inventory_products').select('*')` returns typed rows.
- No raw SQL strings. All queries use the Supabase query builder.

### 11.5 React Components

- Prefer Server Components (`page.tsx`) for data fetching.
- Use Client Components (`*-client.tsx`) for interactivity only.
- Pass initial data from Server Component to Client Component as props:
  ```typescript
  // page.tsx (server)
  export default async function ProductsPage() {
    const products = await getProducts()  // server-side fetch
    return <ProductsClient initialProducts={products} />
  }
  
  // products-client.tsx (client)
  export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
    const [products, setProducts] = useState(initialProducts)
    // ... interactivity only
  }
  ```
- No inline styles. Use TailwindCSS classes for new inventory components. (Existing CSS Modules are untouched.)

---

## Section 12 — "Do Not Do" Rules

These rules prevent architectural drift during implementation. Violations must be approved by the project lead.

| # | Rule | Rationale |
|---|---|---|
| 1 | **Do not** add a writable `running_balance` column. | Contradicts the ledger model. Creates dual truth. |
| 2 | **Do not** modify any existing table in a breaking way. | All inventory additions to existing schemas must be nullable, additive, and backward-compatible. |
| 3 | **Do not** import inventory engine code from `bar/` module code. | The engine is generic. It must not know about alcohol. |
| 4 | **Do not** create new auth infrastructure. | Reuse the existing cookie/PIN auth. No new login pages, no new session tables. |
| 5 | **Do not** write to materialized views or cache tables directly. | They are read-only caches. All writes go through the transaction ledger. |
| 6 | **Do not** add new npm dependencies without project lead approval. | Especially: no ORMs (Prisma, Drizzle), no state management libraries (Redux, Zustand). The existing stack is sufficient. |
| 7 | **Do not** create V2 features (purchase orders, booking integration, cocktail recipes, theft detection, AI) during V1. | These are documented and deferred. Building them now delays V1 delivery. |
| 8 | **Do not** bypass TypeScript strict mode for `src/inventory/`. | If a library type is missing, add a local declaration. Do not use `any`, `@ts-ignore`, or `@ts-nocheck`. |
| 9 | **Do not** create empty or stub directories for future modules (`kitchen/`, `coffee/`, `consumables/`). | YAGNI. Add directories only when work begins on that module. |
| 10 | **Do not** use the `cms-supabase.ts` God module for inventory operations. | Inventory has its own data layer in `src/inventory/lib/db.ts`. The CMS module is untouched. |
| 11 | **Do not** implement server-side pagination without cursor-based (keyset) pagination. | Offset-based pagination breaks under concurrent INSERTs and is slow at high offsets. |
| 12 | **Do not** use `DELETE` for tables with transaction history. | Soft-delete only (set `is_active = false`, `deleted_at = NOW()`). |
| 13 | **Do not** commit untested engine code. | Every function in `engine/` must have a unit test before the PR is merged. |
| 14 | **Do not** add API endpoints that are not in this specification without project lead approval. | Scope creep kills delivery timelines. |

---

## Section 13 — Integration Points Map

```
┌────────────────────────────────────────────────────────────────────────┐
│ EXISTING SYSTEM            │ INVENTORY SYSTEM                          │
├────────────────────────────┼───────────────────────────────────────────┤
│                            │                                           │
│ bar_items table             │──(optional)──► bar_item_inventory_links   │
│   (no modification)         │              (M:N join table)            │
│                            │                                           │
│ bar_categories table        │              (no link — inventory has    │
│   (no modification)         │               its own categories)        │
│                            │                                           │
│ Admin Sidebar              │──adds──►      Inventory nav group         │
│   (existing groups         │              (modification: additive)     │
│    unchanged)               │                                           │
│                            │                                           │
│ Auth middleware            │──protects──►  /api/inventory/*            │
│   (unchanged)               │              /admin/inventory/*          │
│                            │                                           │
│ Staff table                │──FK──►        performed_by                │
│   (unchanged)               │              (in inventory_transactions) │
│                            │                                           │
│ Existing dashboard         │──embed──►     Inventory KPI widget       │
│   (no modification)         │              (reads from cache, readonly)│
│                            │                                           │
│ Background jobs system     │──(future)──►  Async import processing     │
│   (unchanged)               │              Email reports               │
│                            │                                           │
│ Booking system             │──(future)──►  Booking inventory estimates │
│   (unchanged)               │              Event consumption tracking  │
│                            │                                           │
└────────────────────────────┴───────────────────────────────────────────┘
```

---

*End of Master Technical Architecture Specification — Version 1.0*
*This document is the single source of truth for inventory V1 implementation.*
*All prior proposals (V1, V2, V3, V3.1) are superseded by this document.*
