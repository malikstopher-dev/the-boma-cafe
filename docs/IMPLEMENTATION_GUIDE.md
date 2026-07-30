# Implementation Guide — Inventory Engine V1

**Source:** Master Technical Architecture Specification (frozen)  
**Status:** Ready for sprint planning  
**Total estimated effort:** 38 development days  
**Team recommendation:** 2 developers → ~4 weeks  

---

## How to Read This Document

Each **Epic** groups related **Stories**. Each story is a single implementable unit with:

- **ID** — unique reference (e.g., `INV-1A-003`)
- **Description** — what to build, one paragraph
- **Acceptance criteria** — how to verify completion
- **Dependencies** — stories that must be done first
- **Files to create/modify** — exact file paths
- **API endpoints** — routes to implement
- **UI screens** — pages to build
- **Database migrations** — which migration file this belongs to
- **Tests** — what to test
- **Effort** — developer-hours estimate

Stories within an epic should be implemented in numerical order.

---

## Phase 1A — Foundation (12 days)

**Goal:** Core engine, database schema, product CRUD, transaction ledger, dashboard.  
**Requires:** Migrations 039 and 045.

---

### Epic 1A-A: Development Infrastructure (Day 1)

#### Story INV-1A-001 — Configure test runner and CI

Set up Vitest for the inventory subsystem. Write a single passing test to verify the setup works.

**Acceptance criteria:**
- `npx vitest run` passes with at least one test
- `src/inventory/__tests__/` directory exists
- CI workflow `.github/workflows/inventory-ci.yml` created
- CI runs `npx vitest run src/inventory/` on every PR

**Files to create:**
- `src/inventory/__tests__/setup.ts`
- `src/inventory/__tests__/hello.test.ts`
- `vitest.config.ts` (at project root)
- `.github/workflows/inventory-ci.yml`

**Dependencies:** None

**Effort:** 4 hours

#### Story INV-1A-002 — TypeScript strict mode for inventory

Enable TypeScript strict mode for all code under `src/inventory/`. Create a per-directory tsconfig if needed to avoid affecting legacy code.

**Acceptance criteria:**
- `src/inventory/tsconfig.json` exists with `"strict": true`
- `npx tsc --noEmit -p src/inventory/tsconfig.json` passes
- No `any`, `@ts-ignore`, or `@ts-nocheck` in any file under `src/inventory/`

**Files to create:**
- `src/inventory/tsconfig.json`

**Files to modify:**
- `tsconfig.json` (add `references` to include inventory tsconfig)

**Dependencies:** None

**Effort:** 2 hours

#### Story INV-1A-003 — Barrel export and public API

Create `src/inventory/index.ts` that exports the engine's public API functions.

**Acceptance criteria:**
- `import { createTransaction, getBalance } from '@/inventory'` works
- All engine functions have documented JSDoc comments
- Internal functions (`computeBalanceFromLedger`, `normalizeQuantity`) are NOT exported

**Files to create:**
- `src/inventory/index.ts`

**Dependencies:** None (file can be created early and populated as functions are built)

**Effort:** 1 hour

---

### Epic 1A-B: Database Schema (Day 2)

#### Story INV-1A-004 — Create migration 039: inventory engine core tables

Write and apply migration 039 creating: `inventory_uoms`, `inventory_uom_conversions_global`, `inventory_product_uoms`, `inventory_locations`, `inventory_suppliers`, `inventory_categories`, `inventory_products`, `inventory_transactions`, `inventory_product_balances`, `inventory_audit_log`.

**Acceptance criteria:**
- All 10 tables exist in Supabase with correct columns, types, defaults, and constraints
- Indexes are created: `idx_tx_balance_lookup`, `idx_tx_product_history`, `idx_tx_date`, `idx_tx_reference`, `idx_tx_import`
- `inventory_product_balances` has `PRIMARY KEY (product_id, location_id)`
- `inventory_transactions.quantity` is `NUMERIC(15,4)` (NOT `NUMERIC(10,2)`)
- No `running_balance` column exists

**Files to create:**
- `supabase/migrations/039_inventory_engine_core.sql`

**Dependencies:** INV-1A-001, INV-1A-002

**Tests:**
- Verify all tables exist by querying `information_schema.tables`
- Verify all constraints exist by querying `information_schema.table_constraints`

**Effort:** 4 hours

#### Story INV-1A-005 — Create migration 040: inventory bar module

Write and apply migration 040 creating: `bar_item_inventory_links`, `bar_product_config`.

**Acceptance criteria:**
- Both tables exist with correct FKs referencing `inventory_products` and `bar_items`
- `bar_item_inventory_links` has `UNIQUE(bar_item_id, inventory_product_id)`
- `bar_product_config` has `UNIQUE(product_id)` (one config per product)

**Files to create:**
- `supabase/migrations/040_inventory_bar_module.sql`

**Dependencies:** INV-1A-004

**Effort:** 1 hour

#### Story INV-1A-006 — Create migration 045: inventory supplementary tables

**Note:** Migration numbering is 045 (after 044 defined in the architecture for later phases).  

Write and apply: `inventory_imports`, `inventory_import_mappings` (for Phase 1D — create schema now, implement logic later).

**Acceptance criteria:**
- `inventory_imports.idempotency_key` is `TEXT NOT NULL UNIQUE`
- `inventory_imports.status` CHECK constraint includes all valid statuses
- `inventory_import_mappings` has `UNIQUE(supplier_id, supplier_product_name)`

**Files to create:**
- `supabase/migrations/045_inventory_imports.sql`

**Dependencies:** INV-1A-004

**Effort:** 2 hours

#### Story INV-1A-007 — Create migration 046: stock count tables

Write and apply: `inventory_stock_counts`, `inventory_stock_count_items`, `inventory_dashboard_cache`.

**Acceptance criteria:**
- `inventory_stock_counts` has `snapshot_tx_before` and `snapshot_tx_after` (nullable UUID)
- `inventory_stock_count_items.variance` is a GENERATED column
- `inventory_dashboard_cache` has `PRIMARY KEY (location_id)`

**Files to create:**
- `supabase/migrations/046_inventory_stock_counts.sql`

**Dependencies:** INV-1A-004

**Effort:** 2 hours

#### Story INV-1A-008 — Create migration 047: add has_inventory to bar_items

Add a single nullable boolean column to the existing `bar_items` table.

**Acceptance criteria:**
- `bar_items` has column `has_inventory BOOLEAN NOT NULL DEFAULT false`
- No existing queries, views, or triggers are affected
- Existing rows have `has_inventory = false` (default)

**Files to create:**
- `supabase/migrations/047_inventory_bar_items_link.sql`

**Dependencies:** INV-1A-004

**Effort:** 30 minutes

---

### Epic 1A-C: Engine Core (Days 3–4)

#### Story INV-1A-009 — Define engine types

Create all TypeScript types for the inventory engine.

**Acceptance criteria:**
- `InventoryProduct`, `InventoryTransaction`, `InventoryLocation`, `InventorySupplier`, `InventoryCategory`, `InventoryUom`, `InventoryStockCount`, `InventoryStockCountItem`, `ImportBatch`, `ImportMapping` are defined
- `TransactionType` is a union of literal string types matching the DB CHECK constraint
- `StockCountStatus` is a union of literal string types
- All types use `interface` for objects and `type` for unions

**Files to create:**
- `src/inventory/engine/types.ts`

**Dependencies:** INV-1A-002

**Effort:** 3 hours

#### Story INV-1A-010 — Implement ledger.ts: createTransaction

Implement the core transaction creation function.

**Acceptance criteria:**
- `createTransaction(input)` inserts a row into `inventory_transactions`
- Quantity can be positive (increase) or negative (decrease)
- `unitCost` is optional (null for wastage/breakage, required for purchases)
- `importBatchId` links to an import batch (optional)
- Function returns the created transaction
- Throws `InsufficientStockError` if resulting balance would go negative (for decrease-only transaction types: sale, spillage, comp, staff, waste, breakage, transfer_out)

**Files to create:**
- `src/inventory/engine/ledger.ts`

**Dependencies:** INV-1A-009

**Tests:**
- Creates transaction with positive quantity → balance increases
- Creates transaction with negative quantity → balance decreases
- Sale with insufficient stock → throws `InsufficientStockError`
- Opening transaction → works (no stock check)
- Multiple transactions → SUM matches

**Effort:** 6 hours

#### Story INV-1A-011 — Implement ledger.ts: getBalance and getBalanceAtTime

Implement balance query functions.

**Acceptance criteria:**
- `getBalance(productId, locationId)` returns `SUM(quantity)` for all transactions matching product+location
- `getBalanceAtTime(productId, locationId, timestamp)` returns `SUM(quantity)` WHERE `created_at <= timestamp`
- Both return `0` if no transactions exist (not `null`)
- Both use the covering index `idx_tx_balance_lookup` (only touches index, not table)

**Files to modify:**
- `src/inventory/engine/ledger.ts`

**Dependencies:** INV-1A-010, INV-1A-004

**Tests:**
- Empty product → returns 0
- Single transaction → returns that quantity
- Multiple transactions → returns SUM
- Point-in-time query excludes transactions after the timestamp
- Point-in-time query includes transactions at exactly the timestamp

**Effort:** 4 hours

#### Story INV-1A-012 — Implement conversion.ts: UOM conversion

Implement functions for converting between UOMs.

**Acceptance criteria:**
- `convertQuantity(quantity, fromUomId, toUomId, productId)` converts any supported UOM to any other
- `toBaseUnit(quantity, uomId, productId)` converts to the product's base UOM
- `toDisplayUnit(baseQuantity, productId)` converts from base to display UOM
- Lookup order: product-specific conversion → global conversion → error
- Throws `ConversionNotFoundError` if no conversion path exists

**Files to create:**
- `src/inventory/engine/conversion.ts`

**Dependencies:** INV-1A-009, INV-1A-004

**Tests:**
- Bottle → tot (product-specific) → correct factor
- Case → bottle (global) → correct factor
- Unknown UOM path → throws error
- Rounding: 1 bottle = 30 tots, 45 tots = 1.5 bottles
- Display formatting: 1.5 bottles displays as "1B + 15T"

**Effort:** 5 hours

---

### Epic 1A-D: Products API (Days 5–6)

#### Story INV-1A-013 — Products API: list and search

Implement `GET /api/inventory/products`.

**Acceptance criteria:**
- Returns paginated list of products (cursor-based)
- Filters: `?category_id=&search=&is_active=true&location_id=`
- `search` searches by name, SKU, and barcode (ILIKE)
- Each product includes `current_balance` when `location_id` is provided
- Archived products (`is_active = false`) are excluded unless `?show_archived=true`

**Files to create:**
- `src/inventory/api/products/route.ts`

**API endpoints:** `GET /api/inventory/products`

**Dependencies:** INV-1A-010, INV-1A-011

**Tests:**
- Returns empty list when no products exist
- Returns products with correct pagination
- Search by partial name returns matching products
- Filter by category returns only that category
- Archived products hidden by default

**Effort:** 4 hours

#### Story INV-1A-014 — Products API: CRUD

Implement `POST /api/inventory/products`, `GET /api/inventory/products/[id]`, `PATCH /api/inventory/products/[id]`, `DELETE /api/inventory/products/[id]`, `POST /api/inventory/products/[id]/restore`.

**Acceptance criteria:**
- Create: accepts product fields + UOM configuration array. Validates exactly one base UOM and one display UOM. Returns 201 with created product.
- Read: returns product with current balance for all locations.
- Update: partial update. Does not allow changing UOMs after creation (must archive and recreate).
- Delete: if product has no transactions, hard-deletes (204). If product has transactions, returns 409 with message "Archive instead".
- Archive: sets `is_active = false`, `deleted_at = NOW()`. Writes to audit log.
- Restore: sets `is_active = true`, `deleted_at = NULL`. Writes to audit log.
- `GET /api/inventory/products/archived` returns archived products list.

**Files to create:**
- `src/inventory/api/products/[id]/route.ts`

**API endpoints:** `POST /api/inventory/products`, `GET /api/inventory/products/[id]`, `PATCH /api/inventory/products/[id]`, `DELETE /api/inventory/products/[id]`, `POST /api/inventory/products/[id]/restore`, `GET /api/inventory/products/archived`

**Dependencies:** INV-1A-013

**Tests:**
- Create product with valid UOMs → 201
- Create product with no base UOM → 400
- Get product by ID → 200 with correct fields
- Update product name → 200 with updated name
- Delete product with no transactions → 204
- Delete product with transactions → 409
- Archive product → soft-deleted
- Restore archived product → reactivated
- Audit log written on archive and restore

**Effort:** 8 hours

#### Story INV-1A-015 — Products page (list)

Build the product list page with search, filters, and pagination.

**Acceptance criteria:**
- Server component fetches initial product list
- Client component handles search (debounced, 300ms), category filter, active/archived toggle
- Each row shows: name, SKU, category, current balance (as display UOM), status badge
- Click row navigates to product detail
- Archived products are visually distinct (muted colours, "Archived" badge)
- Pagination uses cursor-based ("Load More" button, not page numbers)

**Files to create:**
- `src/inventory/pages/products/page.tsx`
- `src/inventory/pages/products/product-list-client.tsx`

**UI screens:** `/admin/inventory/products`

**Dependencies:** INV-1A-013, INV-1A-014

**Effort:** 6 hours

#### Story INV-1A-016 — Products page (detail)

Build the product detail page showing configuration, stock summary, and transaction history.

**Acceptance criteria:**
- Server component fetches product + balance data
- Configuration panel: name, SKU, category, supplier, UOMs (read-only after creation)
- Stock summary panel: current balance per location, reorder threshold, estimated days until out
- Transaction history: table with type, quantity, balance after, performer, date, notes
- [Record Transaction] button opens the global transaction form (see INV-1A-024)
- [Archive] / [Restore] button (context-dependent)
- Archived products show a banner: "This product is archived. [Restore]"

**Files to create:**
- `src/inventory/pages/products/[id]/page.tsx`

**UI screens:** `/admin/inventory/products/[id]`

**Dependencies:** INV-1A-014, INV-1A-015

**Effort:** 6 hours

---

### Epic 1A-E: UOMs & Categories API (Day 7)

#### Story INV-1A-017 — UOMs API

Implement CRUD for units of measure.

**Acceptance criteria:**
- `GET /api/inventory/uoms` — list all UOMs
- `POST /api/inventory/uoms` — create UOM (name, symbol, category)
- `GET /api/inventory/uoms/:id` — single UOM detail
- `DELETE /api/inventory/uoms/:id` — delete only if unused (no products reference it)
- `GET /api/inventory/uoms/conversions` — list global conversion rules
- `POST /api/inventory/uoms/conversions` — create global conversion (from_uom, to_uom, factor)
- Validates that conversion paths do not create cycles

**Files to create:**
- `src/inventory/api/uoms/route.ts`
- `src/inventory/api/uoms/[id]/route.ts`
- `src/inventory/api/uoms/conversions/route.ts`

**API endpoints:** 6 endpoints

**Dependencies:** INV-1A-004

**Tests:**
- Create and list UOMs
- Create conversion, verify factor
- Delete unused UOM → 204
- Delete used UOM → 409

**Effort:** 4 hours

#### Story INV-1A-018 — Categories API

Implement CRUD for hierarchical categories.

**Acceptance criteria:**
- `GET /api/inventory/categories` — returns tree structure (parent → children nesting)
- `POST /api/inventory/categories` — create with optional `parent_id`
- `PATCH /api/inventory/categories/:id` — update name, parent
- `DELETE /api/inventory/categories/:id` — soft-delete (set `is_active = false`). Prevents deletion if child categories exist.
- Moving a category updates all descendant `module` fields if needed

**Files to create:**
- `src/inventory/api/categories/route.ts`
- `src/inventory/api/categories/[id]/route.ts`

**API endpoints:** 4 endpoints

**Dependencies:** INV-1A-004

**Tests:**
- Create root category → 201
- Create child category → parent_id set correctly
- List returns tree structure
- Delete category with children → 409
- Delete leaf category → 204 (soft)

**Effort:** 4 hours

---

### Epic 1A-F: Transactions API (Day 8)

#### Story INV-1A-019 — Transactions API: single and list

Implement `POST /api/inventory/transactions` and `GET /api/inventory/transactions`.

**Acceptance criteria:**
- Create single transaction. Validates: product exists, location exists, quantity ≠ 0.
- For sale/spillage/comp/staff/waste/breakage types: validates sufficient stock before insert.
- Returns created transaction with 201.
- List transactions: filterable by `product_id`, `location_id`, `type`, `from`, `to`. Paginated with cursor.
- `GET /api/inventory/transactions/types` returns valid transaction types.

**Files to create:**
- `src/inventory/api/transactions/route.ts`

**API endpoints:** `POST /api/inventory/transactions`, `GET /api/inventory/transactions`, `GET /api/inventory/transactions/types`

**Dependencies:** INV-1A-010, INV-1A-011

**Tests:**
- Create purchase → balance increases
- Create sale → balance decreases
- Sale with insufficient stock → 422 with InsufficientStockError
- List transactions filtered by product → only that product's transactions
- List transactions filtered by date range → correct subset

**Effort:** 5 hours

#### Story INV-1A-020 — Transactions API: batch

Implement `POST /api/inventory/transactions/batch`.

**Acceptance criteria:**
- Accepts array of transactions in a single request
- All transactions in the batch are applied atomically (single DB transaction)
- If any transaction fails (insufficient stock, validation error), ALL are rolled back
- Returns all created transactions with 201
- Supports mixed transaction types in a single batch

**Files to create:**
- `src/inventory/api/transactions/batch/route.ts`

**API endpoints:** `POST /api/inventory/transactions/batch`

**Dependencies:** INV-1A-019

**Tests:**
- Batch of 3 purchases → all inserted, balances correct
- Batch with one invalid transaction → none inserted (atomic rollback)
- Batch with mixed types → all inserted correctly

**Effort:** 4 hours

#### Story INV-1A-021 — Transactions page

Build the transaction ledger view page.

**Acceptance criteria:**
- Table: date, type, product, location, quantity (with +/- sign), balance after, performer, notes
- Filters: date range, transaction type dropdown, product search
- Default sort: most recent first
- Cursor-based pagination ("Load More")
- [New Transaction] button opens global transaction form

**Files to create:**
- `src/inventory/pages/transactions/page.tsx`

**UI screens:** `/admin/inventory/transactions`

**Dependencies:** INV-1A-019

**Effort:** 4 hours

---

### Epic 1A-G: Global Transaction Entry (Day 9)

#### Story INV-1A-022 — Global transaction form component

Build a reusable "quick-add transaction" component (bottom sheet / floating action button) accessible from any inventory page.

**Acceptance criteria:**
- Floating action button visible on all inventory pages (position: fixed, bottom right)
- Tap opens a bottom sheet with: product search (autocomplete), transaction type dropdown, quantity stepper (+/−), notes field, [Record] button
- Product search searches by name, shows current balance for context
- On confirm: calls `POST /api/inventory/transactions`, shows success toast with new balance, closes sheet
- On error: shows error toast, stays open
- After recording: updates the product list or dashboard if they're visible (or shows "refreshing" indicator)

**Files to create:**
- `src/inventory/components/transaction-form.tsx`
- `src/inventory/components/global-action-button.tsx`

**Dependencies:** INV-1A-019

**Effort:** 6 hours

---

### Epic 1A-H: Dashboard (Days 10–12)

#### Story INV-1A-023 — Dashboard cache table and refresh logic

Implement the `refreshDashboardCache()` function that computes KPI values from the ledger and writes to `inventory_dashboard_cache`.

**Acceptance criteria:**
- `refreshDashboardCache(locationId)` computes:
  - `total_products` = COUNT active products with any transaction at this location
  - `total_value` = SUM(balance × latest unit_cost from purchase transactions)
  - `total_alerts` = COUNT active alerts for this location
  - `low_stock_count` = COUNT products where balance < reorder_threshold (only products with reorder_threshold set)
  - `drinks_sold_today` = SUM(ABS(quantity)) for type='sale' AND created_at = today
  - `estimated_loss` = SUM(ABS(last_count_variance) × unit_cost)
- Function is idempotent — calling it twice produces the same result
- Writes to `inventory_dashboard_cache` via UPSERT

**Files to create:**
- `src/inventory/engine/dashboard.ts`

**Dependencies:** INV-1A-010, INV-1A-011, INV-1A-007

**Tests:**
- Cache correctly reflects ledger state after single transaction
- Cache correctly reflects ledger state after multiple transactions
- Cache refresh is idempotent
- Empty location → all values zero

**Effort:** 5 hours

#### Story INV-1A-024 — Dashboard API

Implement `GET /api/inventory/dashboard`.

**Acceptance criteria:**
- Requires `location_id` query parameter
- Reads from `inventory_dashboard_cache` if exist and refreshed within last 5 minutes
- If cache is stale or missing, computes live from ledger and updates cache asynchronously
- Returns KPIs, alerts list, recent activity, reconciliation summary, fast/slow movers
- Response time < 2 seconds for V1 scale (500 products, <50K transactions)

**Files to create:**
- `src/inventory/api/dashboard/route.ts`
- `src/inventory/api/dashboard-cache/route.ts`

**API endpoints:** `GET /api/inventory/dashboard`, `POST /api/inventory/dashboard-cache/refresh`

**Dependencies:** INV-1A-023

**Tests:**
- Dashboard returns correct KPIs after known set of transactions
- Dashboard returns cached data when cache is fresh
- Dashboard falls back to live computation when cache is stale
- Manual cache refresh returns 202

**Effort:** 4 hours

#### Story INV-1A-025 — Dashboard page

Build the main inventory dashboard.

**Acceptance criteria:**
- Server component fetches dashboard data from API
- KPI cards across top: inventory value (R), products tracked, drinks sold today, estimated loss this month, active alerts
- Alert section: grouped by severity (🔴 critical, 🟡 warning, 🟢 info). Each alert is clickable.
- Quick action buttons: [Import Excel], [Stock Count], [Adjust Stock], [Add Product]
- Reconciliation summary: total expected, total physical, variance %, estimated loss. Links to full reconciliation.
- Fast movers and slow movers: top 5 each, ranked by tot quantity
- Recent activity: last 10 transactions with type icons
- Data refreshes every 60 seconds (SWR revalidation)

**Files to create:**
- `src/inventory/pages/dashboard/page.tsx`
- `src/inventory/pages/dashboard/dashboard-client.tsx`
- `src/inventory/components/kpi-card.tsx`
- `src/inventory/components/alert-banner.tsx`

**UI screens:** `/admin/inventory`

**Dependencies:** INV-1A-024

**Effort:** 8 hours

#### Story INV-1A-026 — Admin sidebar integration

Add the Inventory navigation group to the existing admin sidebar.

**Acceptance criteria:**
- New navigation group "Inventory" added AFTER "Growth" group
- Items: Dashboard (/admin/inventory), Products, Stock Counts, Imports, Reports, Settings
- Existing nav groups are unchanged
- Mobile bottom nav: "More" menu includes Inventory items

**Files to modify:**
- `src/components/admin/Sidebar.tsx` (add nav group)

**Dependencies:** INV-1A-025

**Effort:** 2 hours

#### Story INV-1A-027 — Auth middleware for inventory routes

Add `/api/inventory/*` and `/admin/inventory/*` to the middleware matcher.

**Acceptance criteria:**
- All `/api/inventory/*` routes require authentication
- All `/admin/inventory/*` pages require admin role
- Existing auth behaviour for all other routes is unchanged
- Unauthenticated requests to inventory API routes return 401
- Unauthenticated requests to inventory pages redirect to `/admin/login`

**Files to modify:**
- `src/middleware.ts` (add matcher entries + protected prefix)

**Dependencies:** None

**Effort:** 1 hour

---

## Phase 1B — Suppliers & Locations (5 days)

**Goal:** Supplier and location management, menu-item-to-product linking.  
**Requires:** Migration 040 applied.

---

### Epic 1B-A: Suppliers API (Day 13)

#### Story INV-1B-001 — Suppliers API: CRUD

Implement full CRUD for suppliers.

**Acceptance criteria:**
- `GET /api/inventory/suppliers` — list (searchable by name)
- `POST /api/inventory/suppliers` — create with name, contact_person, phone, email, vat_number, payment_terms, lead_time_days
- `GET /api/inventory/suppliers/:id` — detail includes list of products from this supplier
- `PATCH /api/inventory/suppliers/:id` — partial update
- `DELETE /api/inventory/suppliers/:id` — soft-delete if linked to products or imports
- `POST /api/inventory/suppliers/:id/restore` — restore archived

**Files to create:**
- `src/inventory/api/suppliers/route.ts`
- `src/inventory/api/suppliers/[id]/route.ts`

**API endpoints:** 6 endpoints

**Dependencies:** INV-1A-004

**Tests:**
- CRUD flow: create → read → update → delete → restore
- Soft-delete with linked products → 409
- Hard-delete with no links → 204

**Effort:** 4 hours

---

### Epic 1B-B: Locations API (Day 14)

#### Story INV-1B-002 — Locations API: CRUD

Implement full CRUD for locations.

**Acceptance criteria:**
- `GET /api/inventory/locations` — list (active only by default)
- `POST /api/inventory/locations` — create with name, code (must be unique)
- `GET /api/inventory/locations/:id` — detail includes stock summary (count of products with non-zero balance)
- `PATCH /api/inventory/locations/:id` — update
- `DELETE /api/inventory/locations/:id` — soft-delete if linked to transactions
- `POST /api/inventory/locations/:id/restore` — restore archived
- `GET /api/inventory/locations/:id/stock` — list all products with balances at this location

**Files to create:**
- `src/inventory/api/locations/route.ts`
- `src/inventory/api/locations/[id]/route.ts`

**API endpoints:** 7 endpoints

**Dependencies:** INV-1A-004

**Tests:**
- CRUD flow
- Stock summary query returns correct counts
- Soft-delete with linked transactions → 409

**Effort:** 4 hours

---

### Epic 1B-C: Supplier & Location Pages (Days 15–16)

#### Story INV-1B-003 — Suppliers page

Build supplier list and detail pages.

**Acceptance criteria:**
- List: table with name, contact, phone, email, active/archived badge
- Detail: supplier info panel + list of products from this supplier (with current stock)
- [Add Supplier], [Edit], [Archive], [Restore] buttons
- Search by name

**Files to create:**
- `src/inventory/pages/suppliers/page.tsx`
- `src/inventory/pages/suppliers/[id]/page.tsx`

**UI screens:** `/admin/inventory/suppliers`, `/admin/inventory/suppliers/[id]`

**Dependencies:** INV-1B-001

**Effort:** 5 hours

#### Story INV-1B-004 — Locations page

Build location list and detail pages.

**Acceptance criteria:**
- List: table with name, code, product count, active/archived badge
- Detail: location info + stock summary (all products at this location with current balance)
- [Add Location], [Edit], [Archive], [Restore] buttons

**Files to create:**
- `src/inventory/pages/locations/page.tsx`
- `src/inventory/pages/locations/[id]/page.tsx`

**UI screens:** `/admin/inventory/locations`, `/admin/inventory/locations/[id]`

**Dependencies:** INV-1B-002

**Effort:** 4 hours

---

### Epic 1B-D: Menu Integration (Day 17)

#### Story INV-1B-005 — Menu items API

Implement linking between bar menu items and inventory products.

**Acceptance criteria:**
- `GET /api/inventory/menu-items` — lists all bar items with their inventory link status
- `POST /api/inventory/menu-items/:id/link` — links a bar item to an inventory product with pour_size_ml
- `POST /api/inventory/menu-items/:id/unlink` — removes the link
- `GET /api/inventory/menu-items/unlinked` — lists bar items not yet linked
- Validates that the bar item exists in `bar_items` table
- Validates pour_size_ml > 0
- Updates `bar_items.has_inventory = true` when linked

**Files to create:**
- `src/inventory/api/menu-items/route.ts`
- `src/inventory/api/menu-items/[id]/link/route.ts`
- `src/inventory/api/menu-items/[id]/unlink/route.ts`
- `src/inventory/api/menu-items/unlinked/route.ts`

**API endpoints:** 4 endpoints

**Dependencies:** INV-1A-005

**Tests:**
- Link bar item to product → link created
- Unlink → link removed
- List linked vs unlinked → correct lists
- Link with invalid pour_size → 400

**Effort:** 4 hours

#### Story INV-1B-006 — Menu integration page

Build a page for managing bar-menu-to-inventory links.

**Acceptance criteria:**
- Two-column layout: left = unlinked menu items, right = linked items
- Unlinked items have [Link to Product] button → opens product search modal
- Linked items show product name, pour size, [Edit] and [Unlink] buttons
- Product search modal: search by name, select product, enter pour_size_ml, confirm

**Files to create:**
- `src/inventory/pages/menu-items/page.tsx`

**UI screens:** `/admin/inventory/menu-items` (or integrated into existing bar-menu page as a tab)

**Dependencies:** INV-1B-005

**Effort:** 5 hours

---

## Phase 1C — Stock Counts (8 days)

**Goal:** Physical stock count workflow from start to approval.  
**Requires:** Migration 046 applied.

---

### Epic 1C-A: Stock Count Engine (Days 18–19)

#### Story INV-1C-001 — Stock count: create and save items

Implement `POST /api/inventory/stock-counts` and `POST /api/inventory/stock-counts/:id/items`.

**Acceptance criteria:**
- Create: accepts `location_id`. Records `snapshot_tx_before = MAX(inventory_transactions.id)` at creation time. Returns session with status `in_progress`.
- Save items: accepts array of `{ product_id, physical_quantity }`. Validates all products exist at this location. UPSERTs into `inventory_stock_count_items`. Does NOT finalise.
- Auto-saves individual items as they are counted (each card triggers its own save).

**Files to create:**
- `src/inventory/engine/stock-counts.ts`

**API endpoints:** used by INV-1C-003's API routes

**Dependencies:** INV-1A-010, INV-1A-011, INV-1A-007

**Tests:**
- Create count → session exists, snapshot_tx_before is set
- Save single item → item saved with correct physical_quantity
- Save multiple items → batch saved
- Item for non-existent product → 400

**Effort:** 5 hours

#### Story INV-1C-002 — Stock count: submit and approve

Implement submit and approve flows.

**Acceptance criteria:**
- Submit: validates all products at the location have been counted or explicitly skipped. Sets status to `submitted`. Returns summary: total counted, total expected, total variance.
- Approve: for each item with variance ≠ 0, creates an `inventory_transaction` with type `physical_count` and quantity = variance. Records `snapshot_tx_after = MAX(inventory_transactions.id)`. Sets status to `approved`. Sets `approved_by` and `completed_at`. Refreshes dashboard cache for the location.
- Cancel: sets status to `cancelled`. Does NOT roll back already-saved items (items remain for audit).

**Files to modify:**
- `src/inventory/engine/stock-counts.ts`

**Dependencies:** INV-1C-001

**Tests:**
- Submit incomplete count (some products skipped) → still works (skip is explicit)
- Approve count → transactions created for each variance
- Approve zero-variance count → no transactions created
- Cancel count → status changes, no transactions created

**Effort:** 5 hours

---

### Epic 1C-B: Stock Count API (Day 20)

#### Story INV-1C-003 — Stock count API routes

Create all stock count API endpoints.

**Acceptance criteria:**
- `GET /api/inventory/stock-counts` — list all sessions for a location
- `POST /api/inventory/stock-counts` — create new session
- `GET /api/inventory/stock-counts/:id` — session detail with all items
- `PATCH /api/inventory/stock-counts/:id` — update notes
- `POST /api/inventory/stock-counts/:id/items` — save count items
- `POST /api/inventory/stock-counts/:id/submit` — submit for review
- `POST /api/inventory/stock-counts/:id/approve` — approve and apply
- `POST /api/inventory/stock-counts/:id/cancel` — cancel session
- `GET /api/inventory/stock-counts/:id/reconciliation` — reconciliation report

**Files to create:**
- `src/inventory/api/stock-counts/route.ts`
- `src/inventory/api/stock-counts/[id]/route.ts`
- `src/inventory/api/stock-counts/[id]/items/route.ts`
- `src/inventory/api/stock-counts/[id]/submit/route.ts`
- `src/inventory/api/stock-counts/[id]/approve/route.ts`
- `src/inventory/api/stock-counts/[id]/cancel/route.ts`

**API endpoints:** 9 endpoints (some in single file)

**Dependencies:** INV-1C-001, INV-1C-002

**Tests:** Integration test for full flow: create → save items → submit → approve → verify transactions created

**Effort:** 6 hours

---

### Epic 1C-C: Stock Count UI (Days 21–23)

#### Story INV-1C-004 — Count card component

Build the card-based stock count UI component.

**Acceptance criteria:**
- Single card shows: product name, category, expected balance (from snapshot), two stepper rows (bottles + tots for bar module, generic quantity stepper for non-bar products)
- Tap +/- adjusts by 1. Long-press adjusts by 10.
- Tap the number to type a value directly (for large counts)
- Swipe left = next product, swipe right = previous
- Progress bar at bottom: "14 / 84 products counted"
- Auto-saves each card when the user navigates away (swipe or tap Next)
- Skip button for products that can't be counted (requires reason selection)

**Files to create:**
- `src/inventory/components/count-card.tsx`

**Dependencies:** INV-1C-001

**Effort:** 8 hours

#### Story INV-1C-005 — New stock count page

Build the "New Stock Count" page.

**Acceptance criteria:**
- Location selector (dropdown)
- [Start Count] button
- On start: creates session via API, navigates to the count page

**Files to create:**
- `src/inventory/pages/stock-counts/new/page.tsx`

**UI screens:** `/admin/inventory/stock-counts/new`

**Dependencies:** INV-1C-001

**Effort:** 2 hours

#### Story INV-1C-006 — Perform count page

Build the count execution page with the card UI.

**Acceptance criteria:**
- Loads all products at the selected location
- Shows the first product in card UI
- Progress bar at top: "Product 14 of 84"
- Swipe navigation works
- Auto-save saves to API on every card change
- [Skip to Summary] button for managers who want to jump ahead
- [Submit Count] button when all products are counted or skipped

**Files to create:**
- `src/inventory/pages/stock-counts/[id]/page.tsx`

**UI screens:** `/admin/inventory/stock-counts/[id]`

**Dependencies:** INV-1C-004

**Effort:** 6 hours

---

### Epic 1C-D: Variance & Approval (Days 24–25)

#### Story INV-1C-007 — Variance summary screen

Build the variance summary that appears after submitting a count.

**Acceptance criteria:**
- Shows: total expected, total physical, total variance (tots + value)
- Table: product, expected, physical, variance (tots), variance (value), status (✅/⚠️/🔴)
- Sorting by variance severity (largest variance first)
- Each product with variance > 5% has a reason dropdown
- [Approve] button to finalise
- [Back to Count] to return to card UI and make changes

**Files to create:**
- `src/inventory/components/variance-table.tsx`
- `src/inventory/pages/stock-counts/[id]/review/page.tsx` (or integrated into the count page as a mode)

**UI screens:** part of `/admin/inventory/stock-counts/[id]`

**Dependencies:** INV-1C-002

**Effort:** 6 hours

#### Story INV-1C-008 — Stock count list page

Build the stock count history page.

**Acceptance criteria:**
- Table: date, location, status (in_progress/submitted/approved/cancelled), counted/total products, total variance, performed by
- Click to view detail
- Status badges with colours
- [New Count] button

**Files to create:**
- `src/inventory/pages/stock-counts/page.tsx`

**UI screens:** `/admin/inventory/stock-counts`

**Dependencies:** INV-1C-003

**Effort:** 3 hours

---

## Phase 1D — Excel Import (7 days)

**Goal:** Supplier delivery and physical count import from Excel.  
**Requires:** Migration 045 applied.

---

### Epic 1D-A: Import Parser & Matcher (Days 26–27)

#### Story INV-1D-001 — Import parser: Excel parsing

Implement the Excel file parser using SheetJS.

**Acceptance criteria:**
- `parseExcel(buffer, type)` reads `.xlsx` and `.xls` files
- Detects columns by header name (not position): `Product Name`, `Quantity`, `Unit`, `Bottle Size`, `Supplier Code`, `Unit Price`, `Full Bottles`, `Tots`, `Notes`
- Supports three format types: supplier_delivery, physical_count, adjustment
- Returns structured array: `{ rowIndex, productName, quantity, unit, supplierCode, unitCost, bottles, tots, notes }`
- Returns parse errors: `{ rowIndex, field, message }` for invalid numbers, missing required columns, empty rows
- Validates: quantities are positive numbers, unit cost is a valid number if provided, required columns exist

**Files to create:**
- `src/inventory/lib/import-parser.ts`

**Dependencies:** None (pure function, no DB dependency)

**Tests:**
- Parse valid supplier delivery Excel → correct row count, correct values
- Parse valid physical count Excel → correct row count
- Parse with invalid quantity → parse error returned
- Parse with missing columns → validation error
- Parse empty file → validation error

**Effort:** 6 hours

#### Story INV-1D-002 — Import matcher: product matching

Implement the product matching algorithm.

**Acceptance criteria:**
- `matchProducts(rows, supplierId?)` processes each row through the priority chain:
  1. Supplier code match (`supplier_code` on `inventory_products`)
  2. Import mapping match (`inventory_import_mappings` with auto_approve or confidence threshold)
  3. Exact name match (case-insensitive, after normalising: strip "ml", "bottle", hyphens, lowercase)
  4. Fuzzy name match (PostgreSQL trigram similarity ≥ 0.6)
  5. No match → marked unknown
- Returns each row with: `matchedProductId`, `confidence` (0.0–1.0), `matchSource` (supplier_code/mapping/exact/fuzzy/none), `suggestedActions` (create/merge/skip)
- Uses `pg_trgm` extension for fuzzy matching

**Files to create:**
- `src/inventory/lib/import-matcher.ts`

**Dependencies:** INV-1D-001, INV-1A-004

**Tests:**
- Supplier code match → returns correct product, confidence 1.0
- Import mapping match (auto_approve) → returns correct product, confidence 0.95
- Exact name match → returns correct product, confidence 0.9
- Fuzzy match → returns correct product, confidence 0.7
- No match → returns null product, confidence 0

**Effort:** 6 hours

---

### Epic 1D-B: Import API (Days 28–30)

#### Story INV-1D-003 — Import API: upload and preview

Implement `POST /api/inventory/imports` (multipart upload + parse + match + preview).

**Acceptance criteria:**
- Accepts `multipart/form-data` with file + type + optional supplier_id
- Generates `idempotency_key` from file hash + timestamp (client-side, sent in header)
- Stores uploaded file in Supabase Storage `inventory-imports/` bucket
- Parses file with `import-parser.ts`
- Matches rows with `import-matcher.ts`
- Creates `inventory_imports` record with status `previewed`
- Returns preview: matched rows, unknown rows, error rows, summary counts
- If `idempotency_key` already exists (retry), returns existing preview instead of re-parsing

**Files to create:**
- `src/inventory/api/imports/route.ts`
- `src/inventory/lib/import-mappings.ts` (CRUD for mappings)

**API endpoints:** `POST /api/inventory/imports` (upload + preview), `GET /api/inventory/imports`

**Dependencies:** INV-1D-001, INV-1D-002

**Tests:**
- Upload valid file → 200 with preview data
- Upload duplicate (same idempotency key) → 200 with same preview (idempotent)
- Upload invalid file → 400 with validation errors

**Effort:** 5 hours

#### Story INV-1D-004 — Import API: approve and rollback

Implement `POST /api/inventory/imports/:id/approve` and `POST /api/inventory/imports/:id/rollback`.

**Acceptance criteria:**
- Approve: accepts `{ decisions: [{ rowIndex, action, productId?, name?, categoryId?, uoms? }] }`
- Single DB transaction:
  - For each `create` action: INSERT product + INSERT purchase transaction
  - For each `merge` action: INSERT import mapping
  - For each `approve` action (already matched): INSERT purchase transaction
  - For each `skip` action: log but skip
- Sets `inventory_imports.status = 'applied'`
- Returns error if any transaction fails (atomic rollback of entire import)
- Rollback: finds all transactions with this `import_batch_id`, creates reversal transactions (type = adjustment, negative original quantity). Sets batch status to `rolled_back`. Available within 24 hours of application.

**Files to create:**
- `src/inventory/api/imports/[id]/approve/route.ts`
- `src/inventory/api/imports/[id]/rollback/route.ts`

**API endpoints:** `POST /api/inventory/imports/:id/approve`, `POST /api/inventory/imports/:id/rollback`

**Dependencies:** INV-1D-003

**Tests:**
- Approve import with all matched rows → stock updated, batch status = applied
- Approve import with "create new" decisions → product created + stock updated
- Rollback import → stock returns to pre-import state
- Rollback already-rolled-back import → 409
- Rollback after 24 hours → 422

**Effort:** 6 hours

#### Story INV-1D-005 — Import API: template download

Implement `GET /api/inventory/imports/template`.

**Acceptance criteria:**
- Accepts `?type=supplier_delivery` or `?type=physical_count`
- Returns an `.xlsx` file with pre-formatted columns and a header row
- Columns include validation notes in the header (e.g., "Quantity must be a positive number")
- File is generated on-the-fly (no pre-stored file)

**Files to create:**
- `src/inventory/api/imports/template/route.ts`

**API endpoints:** `GET /api/inventory/imports/template`

**Dependencies:** INV-1D-001

**Effort:** 3 hours

---

### Epic 1D-C: Import UI (Days 31–32)

#### Story INV-1D-006 — Import page: upload and preview

Build the import upload and preview page.

**Acceptance criteria:**
- Drag-and-drop file upload area
- Type selector: Supplier Delivery / Physical Count / Adjustment
- After upload: shows preview table with columns: Product, Qty, Unit, Decision, Status
- Matched rows: ✅ green with product name
- Unknown rows: ❓ yellow with action buttons [Create New] [Merge With…] [Skip]
- Error rows: ❌ red with error message
- Summary bar: "12 rows, 10 matched, 1 unknown, 1 error"
- [Apply Import] button (disabled until all decisions are made)
- [Discard] button to cancel

**Files to create:**
- `src/inventory/pages/imports/new/page.tsx`
- `src/inventory/components/import-preview.tsx`

**UI screens:** `/admin/inventory/imports/new`

**Dependencies:** INV-1D-003

**Effort:** 8 hours

#### Story INV-1D-007 — Import pages: history and detail

Build the import history list and import detail pages.

**Acceptance criteria:**
- History list: table with batch ID, date, type, status badge, row count, performer
- Detail page: full per-row detail, [Rollback Import] button (visible within 24h of applied status)
- Rollback confirmation dialog: "This will reverse all {N} transactions from this import. Are you sure?"
- After rollback: page refreshes, status shows "Rolled Back", stock values update

**Files to create:**
- `src/inventory/pages/imports/page.tsx`
- `src/inventory/pages/imports/[id]/page.tsx`

**UI screens:** `/admin/inventory/imports`, `/admin/inventory/imports/[id]`

**Dependencies:** INV-1D-004

**Effort:** 5 hours

---

## Phase 1E — Reports (6 days)

**Goal:** Essential inventory reports.  
**Requires:** All prior phases (data must exist to report on).

---

### Epic 1E-A: Report Engine (Days 33–34)

#### Story INV-1E-001 — Report functions

Implement report generation functions in `reports.ts`.

**Acceptance criteria:**
- `dailyStockReport(date, locationId)` — opening balance, purchases, sales, adjustments, closing balance per product
- `varianceReport(stockCountId)` — expected vs actual per product, total variance, top 5 variances
- `wasteReport(from, to, locationId)` — all waste/breakage/spillage/comps aggregated by type, product, performer
- `fastMovers(days, limit, locationId)` — products ranked by total sale quantity
- `slowMovers(days, limit, locationId)` — products ranked by total sale quantity (ascending, zero-sales included)
- `valuationReport(locationId)` — current balance × unit_cost per product, total value

**Files to create:**
- `src/inventory/lib/reports.ts`

**Dependencies:** INV-1A-010, INV-1A-011

**Tests:**
- Daily report with known transactions → correct opening, purchases, sales, closing
- Variance report → correct expected vs actual
- Waste report → correct aggregation by type
- Fast/slow movers → correct ranking
- Valuation → correct value computation

**Effort:** 8 hours

---

### Epic 1E-B: Report API (Day 35)

#### Story INV-1E-002 — Report API endpoints

Create all report API routes.

**Acceptance criteria:**
- `GET /api/inventory/reports/daily?date=&location_id=` — daily stock report
- `GET /api/inventory/reports/variance?from=&to=&location_id=&threshold=` — variance report (filterable by minimum variance threshold)
- `GET /api/inventory/reports/waste?from=&to=&location_id=` — waste/breakage report
- `GET /api/inventory/reports/fast-movers?days=7&limit=10&location_id=` — fast movers
- `GET /api/inventory/reports/slow-movers?days=30&limit=10&location_id=` — slow movers
- `GET /api/inventory/reports/valuation?location_id=` — inventory valuation
- All reports return `{ data: ReportResult }` with standard error envelope
- Reports cache results for 60 seconds (identical query within 60s returns cached)

**Files to create:**
- `src/inventory/api/reports/daily/route.ts`
- `src/inventory/api/reports/variance/route.ts`
- `src/inventory/api/reports/waste/route.ts`
- `src/inventory/api/reports/fast-movers/route.ts`
- `src/inventory/api/reports/slow-movers/route.ts`
- `src/inventory/api/reports/valuation/route.ts`

**API endpoints:** 6 endpoints

**Dependencies:** INV-1E-001

**Tests:** Integration test for each report type

**Effort:** 5 hours

---

### Epic 1E-C: Report UI (Days 36–38)

#### Story INV-1E-003 — Reports page

Build the report hub page with all report types.

**Acceptance criteria:**
- Report selector tabs: Daily Stock, Variance, Waste & Breakage, Fast Movers, Slow Movers, Valuation
- Each report has date range / location / threshold filter controls
- Reports render as tables with sortable columns
- Daily report: hierarchical by category, shows product-level detail
- Variance report: colour-coded (green = positive, red = negative), sortable by variance %
- Waste report: grouped by type with subtotals
- Fast/slow movers: ranked list with bar charts (visual indicator of relative quantity)
- Valuation: per-product value + total
- [Export CSV] button for each report (generates CSV from current data)

**Files to create:**
- `src/inventory/pages/reports/page.tsx`

**UI screens:** `/admin/inventory/reports`

**Dependencies:** INV-1E-002

**Effort:** 10 hours

#### Story INV-1E-004 — Final integration testing

End-to-end testing of the entire V1 inventory system.

**Acceptance criteria:**
- Test: create product → record purchase transaction → verify balance increased
- Test: upload import → preview → approve → verify stock updated
- Test: start stock count → count all products → submit → approve → verify adjustments applied
- Test: import → rollback → verify stock returned
- Test: dashboard reflects all activity correctly
- Test: sidebar navigation reaches all inventory pages
- Test: unauthenticated user cannot access inventory API routes (401)
- Test: non-admin user cannot access inventory admin pages (redirect to login)

**Files to create:**
- `src/inventory/__tests__/e2e/inventory-workflow.test.ts`

**Dependencies:** All prior stories

**Effort:** 8 hours

#### Story INV-1E-005 — Performance validation

Validate that all inventory operations meet performance targets.

**Acceptance criteria:**
- Measure with 500 products and 50K transactions in the database
- Single product balance: <100ms P99
- Dashboard load: <2s P95 (with cache warm)
- Stock count save (84 items): <1s P95
- Import preview (200 rows): <3s P95
- Import apply (200 rows): <2s P95
- Report queries: <3s P95
- Performance test script exists and can be re-run

**Files to modify:**
- (performance test script in `scripts/` or `__tests__/performance/`)

**Dependencies:** INV-1E-004

**Effort:** 4 hours

---

## Dependency Graph

```
Phase 1A (Foundation)
├── INV-1A-001 (Test runner) ──► all test-dependent stories
├── INV-1A-002 (Strict mode) ──► all TypeScript stories
├── INV-1A-003 (Barrel export) ──► all engine stories
├── INV-1A-004→008 (Migrations) ──► all DB stories
│
├── INV-1A-009 (Types) ──► INV-1A-010 (Ledger) ──► INV-1A-011 (Balance)
│   ├── INV-1A-012 (Conversion)
│   ├── INV-1A-013→014 (Products API)
│   ├── INV-1A-019→020 (Transactions API)
│   ├── INV-1C-001→002 (Stock count engine)
│   └── INV-1E-001 (Report engine)
│
├── INV-1A-013→014 (Products API) ──► INV-1A-015→016 (Products UI)
├── INV-1A-017 (UOMs API) ──► (used by product creation)
├── INV-1A-018 (Categories API) ──► (used by product creation)
├── INV-1A-019→020 (Transactions API) ──► INV-1A-021 (Transactions UI)
├── INV-1A-022 (Global transaction form) ──► used by all pages
│
├── INV-1A-023 (Dashboard cache) ──► INV-1A-024 (Dashboard API) ──► INV-1A-025 (Dashboard UI)
├── INV-1A-026 (Sidebar) ──► (independent, last in phase)
└── INV-1A-027 (Middleware) ──► (independent, can be early)

Phase 1B (Suppliers & Locations)
├── INV-1B-001 (Suppliers API) ──► INV-1B-003 (Suppliers UI)
├── INV-1B-002 (Locations API) ──► INV-1B-004 (Locations UI)
└── INV-1B-005 (Menu items API) ──► INV-1B-006 (Menu integration UI)

Phase 1C (Stock Counts)
├── INV-1C-001→002 (Stock count engine) ──► INV-1C-003 (Stock count API)
├── INV-1C-003 ──► INV-1C-004 (Count card) + INV-1C-005 (New count page)
├── INV-1C-004 + INV-1C-005 ──► INV-1C-006 (Perform count page)
├── INV-1C-002 ──► INV-1C-007 (Variance review)
└── INV-1C-003 ──► INV-1C-008 (Count list page)

Phase 1D (Excel Import)
├── INV-1D-001 (Parser) + INV-1D-002 (Matcher) ──► INV-1D-003 (Upload API)
├── INV-1D-003 + INV-1D-002 ──► INV-1D-004 (Approve/rollback API)
├── INV-1D-003 ──► INV-1D-006 (Import upload UI)
├── INV-1D-004 ──► INV-1D-007 (Import history UI)
└── INV-1D-005 (Template) ──► independent

Phase 1E (Reports)
├── INV-1E-001 (Report engine) ──► INV-1E-002 (Report API) ──► INV-1E-003 (Report UI)
└── INV-1E-004 (E2E tests) ──► all
└── INV-1E-005 (Performance) ──► all
```

---

## Summary

| Epic | Stories | Est. Hours | Days |
|---|---|---|---|
| 1A-A: Dev Infrastructure | 3 | 7 | 1 |
| 1A-B: Database Schema | 5 | 9.5 | 2 |
| 1A-C: Engine Core | 4 | 18 | 2 |
| 1A-D: Products API + UI | 4 | 24 | 3 |
| 1A-E: UOMs & Categories | 2 | 8 | 1 |
| 1A-F: Transactions API + UI | 3 | 13 | 2 |
| 1A-G: Global Transaction Form | 1 | 6 | 1 |
| 1A-H: Dashboard | 4 | 19 | 3 |
| **Phase 1A total** | **26** | **104.5** | **12** |
| 1B-A: Suppliers API | 1 | 4 | 1 |
| 1B-B: Locations API | 1 | 4 | 1 |
| 1B-C: Supplier & Location UI | 2 | 9 | 2 |
| 1B-D: Menu Integration | 2 | 9 | 1 |
| **Phase 1B total** | **6** | **26** | **5** |
| 1C-A: Stock Count Engine | 2 | 10 | 2 |
| 1C-B: Stock Count API | 1 | 6 | 1 |
| 1C-C: Stock Count UI | 3 | 16 | 3 |
| 1C-D: Variance & Approval | 2 | 9 | 2 |
| **Phase 1C total** | **8** | **41** | **8** |
| 1D-A: Import Parser & Matcher | 2 | 12 | 2 |
| 1D-B: Import API | 3 | 14 | 3 |
| 1D-C: Import UI | 2 | 13 | 2 |
| **Phase 1D total** | **7** | **39** | **7** |
| 1E-A: Report Engine | 1 | 8 | 1 |
| 1E-B: Report API | 1 | 5 | 1 |
| 1E-C: Report UI + Testing | 3 | 22 | 3 |
| **Phase 1E total** | **5** | **35** | **6** |
| **Total V1** | **52 stories** | **245.5 hours** | **38 days** |

For a team of 2 developers: ~4 weeks. For a team of 3 developers: ~2.5 weeks.

---

*End of Implementation Guide — Inventory Engine V1*
*52 developer stories across 5 phases, 38 days total estimated effort.*
