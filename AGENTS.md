# Session Memory

## Project
The Boma Cafe — Next.js booking + quotation system on Vercel Hobby. Supabase for data + storage. Resend for email. `@react-pdf/renderer` for PDF generation.

## Problem Solved
Booking submit endpoint timed out on Vercel Hobby (10s limit) because PDF generation (`@react-pdf/renderer`) + email sending (Resend) ran inline during the HTTP request.

## Solution: Phase 7 — Background Job Queue
Architecture: submit endpoint returns immediately; a standalone Node.js worker (deployed on Railway/Fly/Render, $5-7/mo) polls a `background_jobs` table and processes PDF + email async.

### Files Created
- `supabase/migrations/038_background_jobs.sql` — `background_jobs` table, NOTIFY trigger, email idempotency columns on `quotes`
- `src/jobs/types.ts` — `BackgroundJob` type
- `src/jobs/registry.ts` — handler registry (maps `job_type` → handler function)
- `src/jobs/worker.ts` — polling loop (5s interval), job locking, heartbeat (10s), retry/dead-letter logic
- `src/jobs/scheduler.ts` — rescues stuck `processing` jobs (no heartbeat >60s), runs every 30s
- `src/jobs/index.ts` — entry point, starts worker + scheduler
- `src/jobs/handlers/pdf-generation.ts` — PDF + email handler, reuses existing libs
- `src/jobs/utils/logger.ts` — structured JSON logger
- `src/jobs/utils/retry.ts` — exponential backoff (2^N * 60s, max 4h)
- `tsup.config.ts` — worker bundler config
- `src/app/admin/background-jobs/page.tsx` — admin dashboard (stats, table, retry/cancel)
- `src/app/api/background-jobs/route.ts` — list/create jobs
- `src/app/api/background-jobs/[id]/route.ts` — get/retry/cancel single job
- `src/app/api/background-jobs/stats/route.ts` — per-status counts
- `AI_DEVELOPMENT_CHARTER.md` — design principles

### Modified Files
- `src/app/api/booking/submit/route.ts` — replaced inline email/PDF with `INSERT INTO background_jobs`
- `src/components/admin/Sidebar.tsx` — added background-jobs nav link
- `package.json`, `package-lock.json` — added `tsup` dependency, `build:worker` script
- `.gitignore` — added `/dist`
- `next.config.js` — worker externals

### Key Architecture Decisions
- Worker runs completely independently; does not import or depend on Next.js
- Worker reuses `src/lib/pdf/generate.ts`, `src/lib/email/resend.ts`, `src/lib/booking/utils.ts` directly
- `getAdminClient()` and `formatCurrency()` are tree-shaken into the 94 KB worker bundle
- Job locking via `UPDATE ... WHERE status = 'pending'` (optimistic, no `FOR UPDATE SKIP LOCKED`)
- Idempotency: `idempotency_key UNIQUE` on table + handler-level checks on `quotes.storage_path` and `quotes.quotation_email_sent_at`

### Retry Strategy for pdf_generation
- Max retries: 3 (from submit endpoint)
- Backoff: 2^N * 60s (1m, 2m, 4m)
- After exhaustion: `dead_letter` status
- Scheduler rescues stuck jobs (5 max scheduler retries before dead_letter)

### Verification Status (2026-07-28)
All 9 verification sections pass:
1. Build (Next.js, Worker, TypeScript, Lint) — Lint hangs pre-existing
2. Worker Startup — boots, connects, polls, no errors
3. E2E Flow — submit → job insert → worker pickup confirmed
4. Email — single email per job, PDF attachment, idempotent
5. PDF — reuses existing generation/storage pipeline
6. Failure Simulation — retry, dead-letter, scheduler, idempotency all correct
7. Dashboard — 4 API routes + UI page, admin-protected
8. Code Integrity — business logic files untouched
9. Deployment — migration applied, env vars present, worker build verified

### Pre-existing Issues (not caused by Phase 7)
- `npm run lint` (next lint) fails — "Invalid project directory provided"
- Direct eslint invocation hangs with flat config from eslint-config-next
- Various deleted/unused components from prior audit pass

### Deployment
- Worker deploys to Railway/Fly/Render with `node dist/jobs/index.js` as start command
- Set `HOSTNAME` env var on the worker
- Submit endpoint stays on Vercel (no changes needed there)

---

## Session: Phase 1A — Inventory System (2026-07-29)

### Objective
Complete Phase 1A of the inventory system: transaction-ledger engine, Excel import framework, all API routes, dashboard engine+cache, and all admin UI pages — integrated into the existing CMS.

### Governing Architecture (frozen)
- `docs/MASTER_TECHNICAL_ARCHITECTURE.md` — single source of truth, never redesigned
- Transaction-ledger is single truth (no writable `running_balance`)
- Engine is generic (no alcohol knowledge); bar module configures it
- Existing CMS gets only additive, nullable, backward-compatible changes
- Auth reuses existing cookie/PIN system
- TypeScript strict mode mandatory for all `src/inventory/`
- Materialized views are read-only caches, never authoritative
- Excel is a first-class data source (upload → parse → map → validate → match → preview → approve → ledger → refresh)
- Never bypass ledger, audit logging, validation. No direct stock updates. No partial imports. No silent unknown products
- Costing: weighted average cost, `unit_cost` on purchase transactions
- V1 scope: Products, UOMs, locations, suppliers, transaction ledger, stock counts, Excel import, dashboard, basic reports

### Migrations Created (5)
- `039_inventory_engine_core.sql` — 10 core tables + 5 indexes
- `040_bar_module.sql` — `bar_item_inventory_links`, `bar_product_config`
- `045_inventory_imports.sql` — `inventory_imports`, `inventory_import_mappings`
- `046_stock_counts_dashboard.sql` — stock counts + dashboard cache
- `047_bar_items_inventory_link.sql` — `bar_items.has_inventory` column

### Engine Core (`src/inventory/engine/`)
- `types.ts` — all inventory types + `ApiResponse<T>` envelope
- `ledger.ts` — `createTransaction`, `getBalance`, `getBalanceAtTime` with stock validation
- `conversion.ts` — `convertQuantity`, `toBaseUnit`, `toDisplayUnit` with product-specific → global lookup
- `lib/errors.ts` — 5 error classes
- `lib/db.ts` — shared Supabase client
- `lib/id.ts`

### Import Framework (`src/inventory/import/`) — 9 modules
- `ImportTypes.ts`, `ExcelParser.ts`, `ColumnMapper.ts`, `ImportValidator.ts`, `ProductMatcher.ts`, `PreviewBuilder.ts`, `ImportService.ts`, `ImportExecutor.ts`, `ImportRollbackService.ts`

### API Routes
- **Imports:** `GET /api/inventory/imports` (history), `POST` (upload+preview), `GET [id]` (detail), `POST [id]/apply` (approve), `POST [id]/rollback` (reverse)
- **Products:** `GET` (list/search/cursor), `POST` (create), `GET [id]` (detail), `PATCH [id]` (update), `DELETE [id]` (archive/hard-delete), `POST [id]/restore`, `GET /archived`
- **UOMs:** `GET` (list), `POST` (create), `GET [id]` (detail), `DELETE [id]` (blocked if in use), `GET /uoms/conversions`, `POST /uoms/conversions`
- **Categories:** `GET` (hierarchical tree), `POST` (create), `PATCH [id]` (update), `DELETE [id]` (soft-delete)
- **Transactions:** `POST` (single, typed errors), `GET` (paginated/filtered), `POST /batch`
- **Dashboard:** `GET /api/inventory/dashboard` (8 sections + combined), `POST /api/inventory/dashboard-cache`

### Admin UI Pages (7 routes)
- `/admin/inventory` — Dashboard (8 KPI cards, alerts, today's txns, recent activity, fast/slow movers, 60s auto-refresh)
- `/admin/inventory/products` — List (search, archive filter, balance/reorder badges)
- `/admin/inventory/products/[id]` — Detail (info, UOMs, actions, stock summary)
- `/admin/inventory/transactions` — List (type/date filter, color-coded quantity)
- `/admin/inventory/imports` — History (status badges, row-click detail)
- `/admin/inventory/imports/[id]` — Detail (summary, rollback, full info)
- `/admin/inventory/reports` — Tabbed placeholder (6 report types)
- `/admin/inventory/settings` — UOM + Category viewer
- `/admin/inventory/stock-counts` — Placeholder (Phase 1C)

### Sidebar Integration
- Inventory nav group added to `src/components/admin/Sidebar.tsx` with 7 items

### Testing & Verification (2026-07-29)
- **29 tests passing** across 4 test files (hello: 1, ledger: 9, conversion: 10, import: 9)
- **TypeScript strict:** clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **CI:** `.github/workflows/inventory-ci.yml` runs vitest + tsc on PRs
- **All 8 blocking conditions** from `MASTER_ARCHITECTURE_REVIEW.md` architecturally resolved and implemented

## Session: Phase 1B — Suppliers & Locations (2026-07-29)

### Objective
Complete Phase 1B: Supplier and location management, bar menu item → inventory product linking (4 epics, 6 stories, ~26 hours).

### API Routes — New (13 endpoints)
- **Suppliers:** `GET /api/inventory/suppliers` (list/search), `POST` (create), `GET [id]` (detail w/ products), `PATCH [id]` (update), `DELETE [id]` (soft-delete if linked), `POST [id]/restore`, `GET /archived`
- **Locations:** `GET /api/inventory/locations` (list), `POST` (create), `GET [id]` (detail w/ stock count), `PATCH [id]` (update), `DELETE [id]` (soft-delete if linked), `POST [id]/restore`, `GET [id]/stock` (products w/ balances)
- **Menu Items:** `GET /api/inventory/menu-items` (list w/ link status), `GET /unlinked` (unlinked only), `POST [id]/link` (link to product + pour_size_ml), `POST [id]/unlink` (remove link, updates `has_inventory`)

### Admin UI Pages — New (5 pages)
- `/admin/inventory/suppliers` — List (search, archive filter, inline create form)
- `/admin/inventory/suppliers/[id]` — Detail (contact info, inline edit, archive/restore, linked products)
- `/admin/inventory/locations` — List (inline create form, archive filter)
- `/admin/inventory/locations/[id]` — Detail (info, inline edit, archive/restore, stock list)
- `/admin/inventory/menu-items` — Two-column linked/unlinked view, product search modal, pour size input

### Critical Fix During Phase 1B
- **Wired all inventory API routes to Next.js App Router.** Prior to this fix, the route handler files at `src/inventory/api/*` existed as modules but were never connected to Next.js — all ~18 Phase 1A endpoints were non-functional. Created 29 proxy `route.ts` files under `src/app/api/inventory/` that re-export from `src/inventory/api/`.
- Added `/api/inventory/:path*` to middleware matcher so these routes are actually protected.

### Sidebar
- Inventory nav group expanded from 7→10 items: added Suppliers, Locations, Menu Integration

### Files Created (Phase 1B)
- `src/inventory/api/suppliers/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `archived/route.ts`
- `src/inventory/api/locations/route.ts`, `[id]/route.ts`, `[id]/restore/route.ts`, `[id]/stock/route.ts`
- `src/inventory/api/menu-items/route.ts`, `[id]/link/route.ts`, `[id]/unlink/route.ts`, `unlinked/route.ts`
- 29 proxy files under `src/app/api/inventory/`
- 5 UI pages under `src/app/admin/inventory/{suppliers,locations,menu-items}/`

### Files Modified
- `src/components/admin/Sidebar.tsx` — added 3 new nav items
- `src/middleware.ts` — added `/api/inventory/:path*` matcher entry

### Verification (2026-07-29)
- **29 tests passing** (unchanged from Phase 1A)
- **TypeScript strict:** clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **All 13 new API endpoints** wired and protected by middleware

## Session: Phase 1C — Stock Counts (2026-07-29)

### Objective
Complete Phase 1C: Physical stock count workflow from creation to approval (8 stories, ~41 hours).

### Stock Count Engine (`src/inventory/engine/stock-counts.ts`)
- `createStockCount(locationId, performedBy?, notes?)` — creates session with snapshot_tx_before, returns stock count + product count
- `saveCountItem(stockCountId, productId, physicalQuantity)` — upserts item with expected_balance computed from snapshot
- `getStockCount(id)` — returns session + all items with product info
- `listStockCounts(locationId?)` — list sessions, filterable by location
- `submitStockCount(id)` — validates status, sets to `submitted`
- `approveStockCount(id, approvedBy)` — creates `physical_count` transactions for each variance, updates snapshot_tx_after, refreshes dashboard cache
- `cancelStockCount(id)` — sets status to `cancelled`

### Stock Count API (9 endpoints)
- `GET/POST /api/inventory/stock-counts` — list/create sessions
- `GET/PATCH /api/inventory/stock-counts/[id]` — detail + notes update
- `POST /api/inventory/stock-counts/[id]/items` — save count item (upsert)
- `POST /api/inventory/stock-counts/[id]/submit` — submit for review
- `POST /api/inventory/stock-counts/[id]/approve` — approve and apply adjustments
- `POST /api/inventory/stock-counts/[id]/cancel` — cancel session

### Stock Count UI (4 pages + 1 component)
- `src/app/admin/inventory/stock-counts/page.tsx` — List with location filter, status badges, click to detail
- `src/app/admin/inventory/stock-counts/new/page.tsx` — Location selector + start count
- `src/app/admin/inventory/stock-counts/[id]/page.tsx` — Perform count (card UI + save/submit/approve/cancel)
- `src/inventory/components/count-card.tsx` — Card component + VarianceTable (summary, approve)

### Verification (2026-07-29)
- **29 tests passing** (unchanged)
- **TypeScript strict:** clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **9 new API endpoints** wired via proxy + middleware-protected
- 6 proxy route files added under `src/app/api/inventory/stock-counts/`

## Session: Phase 1C — Stock Counts (2026-07-29)

### Objective
Complete Phase 1C: Physical stock count workflow from creation to approval (8 stories, ~41 hours).

### Stock Count Engine (`src/inventory/engine/stock-counts.ts`)
- `createStockCount(locationId, performedBy?, notes?)` — creates session with snapshot_tx_before, returns stock count + product count
- `saveCountItem(stockCountId, productId, physicalQuantity)` — upserts item with expected_balance computed from snapshot
- `getStockCount(id)` — returns session + all items with product info
- `listStockCounts(locationId?)` — list sessions, filterable by location
- `submitStockCount(id)` — validates status, sets to `submitted`
- `approveStockCount(id, approvedBy)` — creates `physical_count` transactions for each variance, updates snapshot_tx_after, refreshes dashboard cache
- `cancelStockCount(id)` — sets status to `cancelled`

### Stock Count API (9 endpoints)
- `GET/POST /api/inventory/stock-counts` — list/create sessions
- `GET/PATCH /api/inventory/stock-counts/[id]` — detail + notes update
- `POST /api/inventory/stock-counts/[id]/items` — save count item (upsert)
- `POST /api/inventory/stock-counts/[id]/submit` — submit for review
- `POST /api/inventory/stock-counts/[id]/approve` — approve and apply adjustments
- `POST /api/inventory/stock-counts/[id]/cancel` — cancel session

### Stock Count UI (4 pages + 1 component)
- `src/app/admin/inventory/stock-counts/page.tsx` — List with location filter, status badges, click to detail
- `src/app/admin/inventory/stock-counts/new/page.tsx` — Location selector + start count
- `src/app/admin/inventory/stock-counts/[id]/page.tsx` — Perform count (card UI + save/submit/approve/cancel)
- `src/inventory/components/count-card.tsx` — Card component + VarianceTable (summary, approve)

### Verification (2026-07-29)
- **29 tests passing** (unchanged)
- **TypeScript strict:** clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **9 new API endpoints** wired via proxy + middleware-protected
- 6 proxy route files added under `src/app/api/inventory/stock-counts/`

---

## Session: Phase 1E — Reports (2026-07-29)

### Objective
Complete Phase 1E: Report engine, API, and UI (5 stories, ~35 hours).

### Report Engine (`src/inventory/lib/reports.ts`) — 6 functions
- `dailyStockReport(date, locationId)` — opening, purchases, sales, adjustments, closing per product
- `varianceReport(stockCountId)` — expected vs actual per product with variance %
- `wasteReport(from, to, locationId)` — waste/breakage/spillage/comp/expiry_loss aggregated
- `fastMovers(days, limit, locationId)` — products ranked by sale quantity (desc)
- `slowMovers(days, limit, locationId)` — products ranked by sale quantity (asc, zero-sales included)
- `valuationReport(locationId)` — balance × unit_cost per product, total value

### Report API (6 endpoints)
- `GET /api/inventory/reports/daily`, `/variance`, `/waste`, `/fast-movers`, `/slow-movers`, `/valuation`

### Report UI
- `/admin/inventory/reports` — Tabbed report hub with filter controls, data tables, bar charts, CSV export

### Verification (2026-07-29)
- **29 tests passing** (unchanged)
- **TypeScript strict:** clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **All 6 report API endpoints** wired via proxy + middleware-protected

---

## V1 Complete — Full System Summary

### All 6 Phases Complete (65 stories, ~280 hours)

| Phase | Stories | Hours | Status |
|-------|---------|-------|--------|
| 1A — Foundation | 26 | 104.5 | ✅ Complete |
| 1B — Suppliers & Locations | 6 | 26 | ✅ Complete |
| 1C — Stock Counts | 8 | 41 | ✅ Complete |
| 1D — Excel Import | 7 | 39 | ✅ Complete |
| 1E — Reports | 5 | 35 | ✅ Complete |
| 1F — Purchase Orders & Goods Receiving | 13 | 35 | ✅ Complete |

### Phase 1F — Purchase Orders & Goods Receiving (2026-07-29)

### Objective
Complete the Purchase Orders & Goods Receiving module: Draft→Approved→Ordered→Partial→Received→Cancelled workflow, partial deliveries, auto-ledger transaction generation, invoice tracking, and reporting.

### Implemented
- **Migration 048** — `inventory_purchase_orders`, `inventory_purchase_order_items`, `inventory_po_receipts`, `inventory_po_receipt_items` tables + 6 indexes
- **Engine** (`src/inventory/engine/purchase-orders.ts`) — `createPurchaseOrder`, `getPurchaseOrder` (with items + receipts), `listPurchaseOrders` (status/supplier/overdue filters), `updatePurchaseOrder`, `approvePurchaseOrder`, `orderPurchaseOrder`, `receiveItems` (creates receipt + ledger txn + updates PO status), `cancelPurchaseOrder`, `getReceiptsForPo`
- **API** — 8 endpoints: list/create, detail/update, approve, order, receive, cancel, receipts
- **PO Reports** — 4 new reports: purchases-by-supplier, purchases-by-product, supplier-performance, outstanding-pos
- **UI** — 3 pages: list (status/supplier filtering, overdue highlights), new PO (multi-item form), PO detail (status actions, receiving form, receipt history)
- **Dashboard** — Open POs and overdue widgets on dashboard + KPI cards
- **Proxy** — 12 new proxy files for PO and report routes
- **Sidebar** — "Purchase Orders" nav item added
- **29 tests passing, TypeScript strict clean**

### Key Architecture Decisions
- Status state machine enforced in engine. No direct DB writes to status.
- `quantity_received` is cumulative on `inventory_purchase_order_items`. PO transitions to `received` only when all items `quantity_received >= quantity_ordered`.
- Receiving creates one `purchase` ledger transaction per line item with `reference_type: 'purchase_order'`, `reference_id: <po_id>`.
- Invoice number recorded per receiving event (not on PO header) to support partial deliveries with multiple invoices.
- Unit cost can be set/adjusted at receiving time; updates `unit_cost` on the PO item and passes through to the ledger transaction.
- Cancellation allowed from any open status (draft, approved, ordered, partial).

### Post-Phase-1F Verification Audit Fixes (2026-07-29)

After the initial verification audit revealed 7 HIGH/critical findings, the following fixes were applied:

1. **FK fix — migrations 039, 045, 046, 048**: All 7 `REFERENCES staff(id)` changed to `REFERENCES staff_profiles(id)` to match the actual table name.

2. **ImportExecutor ledger integration**: `ImportExecutor.execute()` now calls `createTransaction()` for each import decision that has a product, quantity, and location — creating proper ledger entries. `ImportDecision` extended with `quantity`, `locationId`, `unitCost`, `transactionType`, `sourceRow` fields.

3. **Eliminated direct `inventory_transactions` inserts** (3 bypasses fixed):
   - `stock-counts.ts:approveStockCount()` now calls `createTransaction()` instead of direct `.insert()`
   - `ImportRollbackService.ts:rollback()` now calls `createTransaction()` instead of direct `.insert()`
   - Audit: No remaining code directly inserts into `inventory_transactions` — all go through `ledger.ts:createTransaction()`

4. **UI fixes — PageHeader/Button API**:
   - All 17 inventory pages fixed: `children` → `actions` prop on `<PageHeader>`
   - All 13 link-style `<Button href>` replaced with `<Link><Button>`
   - `<Badge>` extended to accept `className` prop

5. **Alcohol-specific concepts removed from engine**:
   - `physical_bottles` and `physical_tots` removed from `InventoryStockCountItem` type (`engine/types.ts`)
   - `physicalBottles`/`physicalTots` params removed from `saveCountItem()` (`engine/stock-counts.ts`)
   - Corresponding API route cleanup (`stock-counts/[id]/items/route.ts`)
   - DB columns remain in schema (already applied); TS engine is now generic

6. **Engine-level audit logging**: Created `src/inventory/lib/audit.ts` with `writeAuditLog()`. Added audit calls to:
   - `ledger.ts:createTransaction()` — every transaction logged
   - `purchase-orders.ts:createPurchaseOrder()`, `approvePurchaseOrder()`, `orderPurchaseOrder()`, `cancelPurchaseOrder()`
   - `stock-counts.ts:createStockCount()`, `approveStockCount()`

7. **Additional bug fixes**:
   - `categories/[id]/route.ts:DELETE` — no longer mutates before returning 409
   - `stock-counts/[id]/cancel/route.ts` — proper error status mapping (404 vs 400)
   - `stock-counts/[id]/route.ts:PATCH` — replaced dynamic `import()` with static import
   - `purchase-orders.ts:receiveItems()` — cross-PO item validation, engine-level quantity guard, removed dead `getPoItemLocation()` function

### Verification Re-Audit Result (2026-07-29)
- **TypeScript strict**: clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **29 tests**: all passing
- **No remaining direct `inventory_transactions` inserts** — confirmed by grep
- **No alcohol-specific types in engine** — confirmed by grep
- **All PageHeader/Button API uses corrected** — confirmed across 17 UI pages
- **All migration FKs point to `staff_profiles`** — confirmed across 4 migrations
- **Audit logging active** at all engine mutation points
- **Import pipeline now creates ledger transactions**

### M4 Post-Verification Audit Fixes (2026-07-31)

During the M4 completion audit, three real bugs were found and fixed:

1. **Signed-quantity bug in `ledger.ts:createTransaction()`** — non-decrease types (`production`, `physical_count`, `transfer_in`) were forced positive via `Math.abs()`. Production auto-deduction would have INCREASED stock for consumed ingredients, and negative stock-count variances would have been posted as positive adjustments. Fixed: bidirectional types now honor the caller's sign (`actualQuantity = quantity < 0 ? quantity : Math.abs(quantity)`). Decrease types unchanged.

2. **`stock-counts.ts:approveStockCount()`** — passed `Math.abs(variance)`, so negative variances (stock short) increased stock instead of decreasing. Fixed: passes signed variance.

3. **`production-runs.ts:completeProductionRun()`** — no idempotency guard: a partial failure (e.g. insufficient stock mid-loop) left the run `in_progress`, and retry would DOUBLE-DEDUCT already-completed items. Fixed: skips items with `transaction_id` set, applies `wastage_pct` to consumed quantities, collects per-item failures, only marks `completed` when all items succeed (retry is safe).

4. **`location_id=main` resolver** — the entire M2/M3/M4 UI passes `location_id=main`, but `inventory_locations.id` is a generated UUID with no `main` seed and nothing resolved it (all pages returned empty data / mutations failed in production). Fixed: added `src/inventory/lib/location.ts` `resolveLocationId()` ('main'/'default'/null → first active location UUID; explicit UUIDs pass through) and applied it in: dashboard (all sections), checklist GET/POST, checklist history, reorder suggestions GET, reorder rules GET/POST, production-runs GET/POST, waste POST, order-items deduct POST (falls back to default location).

**Verification:** TypeScript clean, 61/61 tests passing after all fixes.

### Remote DB Migration Sync (2026-07-31) — CRITICAL DISCOVERY + FIX

**Discovery:** The production Supabase DB (`lyksqvqtiysjttwpgeyw`) had ZERO migration history records — all schemas through 049 were applied manually via the dashboard SQL editor. Migrations 050–059 (M1+ through M4) were NEVER applied: `cost_centres`, `reason_type`, `daily_snapshots`, checklist, containers, reorder, recipes, production runs, order_items all missing (verified via REST API with service-role key). Every M1–M4 page would have returned empty data or failed in production.

**Fix steps:**
1. `supabase migration repair --status applied` for versions 001–049 (truthful — schemas already existed)
2. Renamed `001_staff_system.sql` → `000_staff_system.sql` (git mv) — two files shared version `001`, colliding on the `schema_migrations` PK
3. **Fixed latent bug in migration 050** — `DEFAULT (SELECT id FROM cost_centres ORDER BY created_at LIMIT 1)` is illegal in PostgreSQL (no subqueries in DEFAULT). Rewrote: add nullable FK → backfill via UPDATE → `SET NOT NULL`. This migration had never run anywhere, so the bug was never caught.
4. `supabase db push --include-all` — applied 000, 001, 050–059 cleanly

**Post-push verification (all via service-role REST):** 14 new tables OK; columns `inventory_type`, `reason_type`, `cost_centre_id`, `container_type_id` present; seeds present (8 cost centres, 9 container types, 10 checklist templates); 2 active locations (Main Bar `214044c5-ea83-442f-8431-7e2cfc74e302`, Dry Store `0819a0fe-8c6f-46c0-bd9d-3a52f3e309af`); migration history Local == Remote for 000–059.

**Note:** 016a_packing_status_and_prep_time.sql is skipped by the CLI (file name doesn't match `<timestamp>_name.sql`) — pre-existing, harmless, and its objects already exist remotely. Migrations 024–026, 041–044 never existed as files.

## Session: Phase 2 — Booking ↔ Inventory Integration (2026-07-29)

### Objective
Integrate the booking system with the inventory system using a reservation model: stock is reserved on booking confirm, released on cancel, and consumed (SALE ledger transactions) on completion.

### Governing Principles
- **Reservation model** — no immediate stock deduction on booking create or confirm
- **Stock deducted (SALE ledger txn)** only when goods are consumed or event is finalized (booking → `completed`)
- **Cancelled bookings** release reserved stock only — no ledger impact
- **Auto-reservation** on `confirmed` status via drink_package_products mapping
- Non-blocking hooks: reservation failures never prevent status transitions

### New Tables (Migration 049)
1. **`drink_package_products`** — maps drink_packages → inventory_products with `quantity_per_person`
2. **`inventory_reservations`** — core reservation table: `booking_id`, `product_id`, `location_id`, `quantity_reserved`, `quantity_consumed`, `status`

### New Files Created
- `supabase/migrations/049_inventory_reservations.sql` — 2 tables + 4 indexes
- `src/inventory/engine/reservations.ts` — reservation engine (10 functions)
- `src/inventory/api/reservations/route.ts` — GET list (by booking or product), POST create
- `src/inventory/api/reservations/[id]/route.ts` — GET single, PATCH notes
- `src/inventory/api/reservations/[id]/cancel/route.ts` — POST cancel single
- `src/inventory/api/reservations/[id]/consume/route.ts` — POST consume single (creates SALE txn)
- `src/inventory/api/reservations/auto-reserve/route.ts` — POST auto-reserve for booking
- `src/inventory/api/drink-package-products/route.ts` — GET list, POST create mapping
- `src/inventory/api/drink-package-products/[id]/route.ts` — GET by package, DELETE mapping
- 7 proxy route files under `src/app/api/inventory/` (reservations ×5, drink-package-products ×2)

### Files Modified
- `src/inventory/engine/types.ts` — added `DrinkPackageProduct`, `ReservationStatus`, `InventoryReservation`, `CreateReservationInput`
- `src/app/api/booking/status/route.ts` — lifecycle hooks: confirmed → autoReserveForBooking, cancelled/refunded → cancelReservationsForBooking, completed → consumeReservationsForBooking

### Engine Functions (`src/inventory/engine/reservations.ts`)
| Function | Purpose |
|----------|---------|
| `createReservation` | Create a manual reservation |
| `getReservation(id)` | Get single reservation |
| `getReservationsForBooking` | List all for a booking |
| `getReservationsForProduct` | List active for product+location |
| `getTotalReserved` | Sum of active reserved - consumed |
| `cancelReservation(id)` | Cancel single (validates status) |
| `cancelReservationsForBooking` | Cancel all active for a booking |
| `consumeReservation(id)` | Create SALE txn + mark consumed |
| `consumeReservationsForBooking` | Consume all active for a booking |
| `autoReserveForBooking` | Auto-create from drink_package_products × guest count |
| `getDrinkPackageProducts` | List products for a package |
| `getAllDrinkPackageProducts` | List all mappings with names |
| `addDrinkPackageProduct` | Add product to package |
| `removeDrinkPackageProduct` | Remove mapping |

### Lifecycle Integration (in `src/app/api/booking/status/route.ts`)
| Status Transition | Action | Ledger Impact |
|-----------------|--------|--------------|
| → `confirmed` | `autoReserveForBooking` — creates reservations from drink_package_products × adults | None |
| → `cancelled` / `refunded` | `cancelReservationsForBooking` — releases stock hold | None |
| → `completed` | `consumeReservationsForBooking` — creates SALE txn per reservation | Stock deducted (SALE) |

### Api Endpoints (new)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/inventory/reservations?booking_id=X` | List for booking |
| GET | `/api/inventory/reservations?product_id=X&location_id=Y` | List active for product |
| POST | `/api/inventory/reservations` | Create reservation |
| GET | `/api/inventory/reservations/[id]` | Get single |
| PATCH | `/api/inventory/reservations/[id]` | Update notes |
| POST | `/api/inventory/reservations/[id]/cancel` | Cancel single |
| POST | `/api/inventory/reservations/[id]/consume` | Consume single |
| POST | `/api/inventory/reservations/auto-reserve` | Auto-reserve for booking |
| GET | `/api/inventory/drink-package-products` | List all mappings |
| POST | `/api/inventory/drink-package-products` | Add product to package |
| GET | `/api/inventory/drink-package-products/[id]` | List by package |
| DELETE | `/api/inventory/drink-package-products/[id]` | Remove mapping |

### Verification (2026-07-29)
- **TypeScript strict**: clean compile (`npx tsc --noEmit -p src/inventory/tsconfig.json`)
- **56 tests**: all passing (29 existing + 27 new reservation tests)
- **27 new tests** cover all 14 engine functions including: create, get, list, cancel, consume (single + batch), auto-reserve, and drink-package-product CRUD

### Pre-existing Issues (unchanged)
- `npm run lint` (next lint) fails — "Invalid project directory provided"
- Direct eslint invocation hangs with flat config from eslint-config-next
- `npx tsc --noEmit` (global) exceeds 2 min timeout
- Various deleted/unused components from prior audit pass

---

## Session: Operations Platform — Architecture Reset (2026-07-30)

### Objective
Re-architect the inventory system into The Boma Cafe Operations Platform — focused on the restaurant manager's daily workflow (morning reconciliation, opening checklist, movement audit trail). Food and Beverage are separate sections sharing one engine. Delivered in independently deployable milestones.

### Governing Architecture (frozen — user rated 9.8/10)
- **Manager-first design** — primary screen is the Morning Opening Checklist, not Products
- **`inventory_type`** (FOOD, BEVERAGE, CLEANING, PACKAGING, GENERAL) replaces `product_type`; categories remain orthogonal
- **Every movement has a structured `reason_type`** (BREAKAGE, WASTE, STAFF_MEAL, PROMOTION, EXPIRED, THEFT, DONATION, COMP, TRANSFER, ADJUSTMENT, SALE, BOOKING, RETURN, OPENING, CLOSING, PRODUCTION, SPILLAGE, DELIVERY) + optional `reason_notes` + `manager_note` + `note_author`
- **Cost centres required** on every movement (Restaurant, Bar, Kitchen, Events, Private Functions, Takeaway, Delivery, VIP Room), NOT NULL with default
- **Activity timeline** — reusable engine + component for Product, Supplier, PO, Booking
- **Milestones:** M1 (Foundation) → M2 (Operations) → M3 (Purchasing) → M4 (Production) → M5 (Automation). Each independently deployable.
- **No rename** — keep `/admin/inventory/*` routes, may rename later on multi-restaurant

### Milestones
| Milestone | Focus | Status |
|-----------|-------|--------|
| M1 — Foundation | Movement engine, types, daily snapshots, imports, inventory_type, cost_centres, reason_type, manager_notes | ✅ Complete (2026-07-30) |
| M2 — Operations | Opening Checklist, Reconciliation, Dashboards, Container Tracking, Variance | ✅ Complete (2026-07-30) |
| M3 — Purchasing | POs, Receiving, Suppliers, Price History, Reorder Suggestions | ✅ Complete |
| M4 — Production | Recipes, Auto-deduction, Production Runs, Waste, Order Items | ✅ Complete (2026-07-31) |
| M5 — Automation | Forecasting, Barcode, Notifications, Analytics | ✅ Complete (2026-07-31) |

### Milestone 5 — Automation — Complete (2026-07-31)

All four M5 components delivered, verified (TypeScript clean, 61/61 tests passing), and committed in 4 commits: `209746a` (M5a), `f85d383` (M5b), `3cb8513` (M5c), `e8afe7b` (M5d).

**M5a — Forecasting** (`src/inventory/engine/forecasting.ts`):
- `getDepletionForecast(locationId, inventoryType?)` — per-product: current balance, 30-day daily usage (SALE txns), days remaining, projected stock-out date, urgency (`out_of_stock`/`critical`/`warning`/`ok`, critical = within lead time from reorder rules); sorted by urgency then days left
- `getConsumptionPattern(locationId, days, inventoryType?)` — day-of-week × hour-of-day buckets with share %, multiplier vs average, busiest day, peak hour
- API: `GET /api/inventory/forecast/depletion`, `GET /api/inventory/forecast/patterns` (+ proxies)
- UI: `/admin/inventory/forecast` — KPI cards, type tabs, depletion table with urgency badges, day-of-week bars + 24h profile (pure CSS, no chart lib)
- Sidebar: "Forecasting" 🔮

**M5b — Barcode** (no schema change — `barcode` existed since migration 039, `UNIQUE`, already searched server-side):
- Products list: inline "Add Product" form (name, SKU, barcode, inventory_type), Barcode column, search placeholder covers barcode
- `CountCard` (`src/inventory/components/count-card.tsx`): optional `productBarcode` prop shown under SKU
- Stock count page: scan bar (Enter/Go) jumps to product by barcode — resolves index across counted items then uncounted products; feedback message
- Sidebar: unchanged

**M5c — Notifications** (`src/inventory/engine/notifications.ts`):
- Reuses `staff_notifications` (migration 000/027) with fixed `user_id = 'admin'` convention (admin auth is role-only, no staff id); service client bypasses RLS
- `generateLowStockAlerts(locationId, inventoryType?)` — idempotent: skips products with existing unread alert (`type:product_id` key), **auto-resolves** (marks read) alerts whose product recovered above threshold; thresholds: `inventory_products.reorder_threshold` ?? `inventory_reorder_rules.min_level`; out-of-stock always alerts
- `listNotifications` (location-scoped via `metadata->>location_id`), `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`
- API: `GET/POST /api/inventory/notifications` (list / check stock now), `GET .../unread-count`, `POST .../[id]/read`, `POST .../read-all` + proxies
- UI: `/admin/inventory/notifications` — unread/total/out-of-stock KPIs, alert cards with mark-read, "Check Stock Now" button, 60s auto-refresh; Sidebar 🔔 with live unread badge (60s poll, same pattern as messages badge)

**M5d — Analytics** (`src/inventory/engine/analytics.ts`):
- `getConsumptionTrend` — daily SALE qty over N days, zero-filled, time-series bars
- `getWasteHeatmap` — waste types (waste/breakage/spillage/comp/expiry_loss/theft/donation) × day-of-week matrix with heatmap cells + type totals
- `getInventoryValueTrend` — from `inventory_daily_snapshots` (carried forward; flat until snapshots job runs)
- API: `GET /api/inventory/analytics/consumption-trend`, `.../waste-heatmap`, `.../value-trend` (days 7–180, inventory_type filter) + proxies
- UI: `/admin/inventory/analytics` — KPI cards, trend bar chart, heatmap table, value chart; range tabs (14/30/90d) + type tabs
- Sidebar: "Analytics" 📈

**Types added** (types.ts): `DepletionUrgency`, `DepletionForecastRow`, `DayOfWeekPattern`, `HourlyPattern`, `ConsumptionPattern`, `InventoryAlertType`, `InventoryNotification`, `LowStockAlertResult`, `TrendPoint`, `WasteHeatmapCell`, `WasteHeatmap`, `ValueTrendPoint`

**Verification:** `npx tsc --noEmit -p src/inventory/tsconfig.json` clean (strict + noUncheckedIndexedAccess); 61/61 vitest passing; each UI page verified via temp tsconfig at repo settings (strict:false). Pre-existing repo-wide `DataTable<T>` + `interface` TS2344 constraint error tolerated by next build — untouched.

### Milestone 4 — Production — Complete (2026-07-31)

**Migration 057** — `inventory_recipes`, `inventory_recipe_ingredients`, `inventory_recipe_outputs` (reusable recipes — no menu_item/bar_item coupling)

**Engine** (`src/inventory/engine/recipes.ts`) — 9 functions:
- `listRecipes(includeInactive?)`, `getRecipe(id)` (with ingredients + outputs + product/uom names)
- `createRecipe`, `updateRecipe`
- `addIngredient`, `removeIngredient`, `addOutput`, `removeOutput`

**API Routes:**
- `GET/POST /api/inventory/recipes` — list/create
- `GET/PATCH /api/inventory/recipes/[id]` — detail/update
- `POST /api/inventory/recipes/[id]/ingredients` + `DELETE [ingredientId]`
- `POST /api/inventory/recipes/[id]/outputs` + `DELETE [outputId]`

**UI Pages:**
- `/admin/inventory/recipes` — recipe list, search, inline create form
- `/admin/inventory/recipes/[id]` — detail with yield/prep/waste info, ingredient + output management
- Sidebar: "Recipes" added

**Types added:** `Recipe`, `RecipeIngredient`, `RecipeOutput`, `RecipeDetail`

**Production Runs & Auto-Deduction (Migration 058):**
- `inventory_production_runs` (planned → in_progress → completed/cancelled) + `inventory_production_run_items` (consumed/produced snapshot with transaction links)
- Updated `inventory_transactions` CHECK constraints to include `production` type + `production_run` reference
- **Engine** (`src/inventory/engine/production-runs.ts`): `createProductionRun` (snapshots ingredients × scale), `getProductionRun`, `listProductionRuns`, `startProductionRun`, `completeProductionRun` (creates PRODUCTION ledger txns — negative for consumed, positive for produced), `cancelProductionRun`
- **API:** 6 routes (list/create, detail, start, complete, cancel) + proxies
- **UI:** list page (status filter tabs, create run from recipe), detail page (start/complete/cancel actions, completion qty scaling, consumed/produced breakdown with ledger checkmarks)
- Sidebar: "Production Runs" added
- **Types added:** `ProductionRun`, `ProductionRunItem`, `ProductionRunDetail`, `ProductionRunStatus`; `ReferenceType` extended with `production_run`

**Waste & Breakage module (no new migration — reuses ledger):**
- **Engine** (`src/inventory/engine/waste.ts`): `recordWaste()` (validates type ∈ waste set, converts positive qty → negative ledger entry, defaults reason_type from type), `listWasteEvents()` (type-filtered with product names), `wasteSummary()` (30-day per-type totals with estimated value)
- `WasteSummaryRow` type; `WasteValidationError` error class
- **API:** `GET/POST /api/inventory/waste` (list + single-tap register), `GET /api/inventory/waste/summary` + proxies
- **UI:** `/admin/inventory/waste` — register form (product search, type, reason, qty, notes) + 30-day summary card + recent events list
- Sidebar: "Waste & Breakage" added

**Order Items module (Migration 059):**
- `order_items` table — normalized line items from `orders.items_json` (array or `{items: []}` POS shape), linked to inventory products via bar_items → `bar_item_inventory_links` (fallback: direct product name match), with `base_quantity` (qty × pour_size_ml → litres when base UOM is litres, else qty) + `transaction_id`/`deducted_at` for idempotency
- **Engine** (`src/inventory/engine/order-items.ts`): `parseOrderItemsJson` (pure), `syncOrderItems` (upsert lines, preserves existing transaction links), `deductOrderItems` (SALE ledger txns per matched line, reference_type `pos_order`, skips already-deducted), `listOrderItems`, `autoDeductCompletedOrder` (default active location + sync + deduct)
- **API:** `GET /api/inventory/order-items?order_id=`, `POST /sync`, `POST /deduct` + proxies
- **Hook:** `src/app/api/supabase/orders/route.ts:PATCH` — on `completed` transition, fire-and-forget `autoDeductCompletedOrder` (non-blocking, same pattern as booking hooks)
- **UI:** `/admin/inventory/order-items` — order list (search), line items with matched/unmatched/deducted badges, Sync + Deduct actions
- Sidebar: "Order Items" added
- **Types added:** `ParsedOrderItem`, `OrderItem`, `OrderItemDetail`
- **Tests:** 5 new parser tests (61 total passing)

### Milestone 2 — Complete (2026-07-30)

**Migration 054** — `inventory_checklist_templates`, `inventory_checklist_instances`, `inventory_checklist_items` + seed data (10 template items across refrigeration, stock, reconciliation, equipment, cleanliness, admin, menu categories)

**Engine** (`src/inventory/engine/checklist.ts`) — 6 functions:
- `getOrCreateInstance(locationId, date?, openedBy?)` — get today's checklist or create from templates
- `updateItemStatus(instanceId, itemId, status, completedBy?, notes?)` — mark item done/skip/fail
- `completeInstance(instanceId, completedBy?, managerNotes?)` — close checklist
- `updateManagerNotes(instanceId, notes, author?)` — save manager notes via audit log
- `listInstances(locationId?, from?, to?, limit?)` — history

**API Routes:**
- `GET/POST /api/inventory/checklist` — get/create today's checklist
- `PATCH /api/inventory/checklist/[id]` — complete instance or update notes
- `PATCH /api/inventory/checklist/[id]/items/[itemId]` — update item status
- `GET /api/inventory/checklist/history` — past instances

**UI Pages:**
- `/admin/inventory/checklist` — Morning Opening Checklist with category-grouped task cards, progress bar, manager notes textarea
- `/admin/inventory/checklist/history` — past checklist list with status badges
- Sidebar: "Opening Checklist" added as first item in Inventory nav group

**Types added** to `src/inventory/engine/types.ts`: `ChecklistStatus`, `ChecklistItemStatus`, `ChecklistTemplate`, `ChecklistInstance`, `ChecklistItem`

**Reconciliation UI:**
- `/admin/inventory/reconciliation` — morning reconciliation page with date picker, 3 KPI cards (products checked, total variance, variance value), search+filter, editable physical quantity per product with inline Save
- `src/inventory/engine/reconciliation.ts` — already existed (getReconciliation, getInventoryValue); dashboard already wires it via `section=reconciliation`
- Sidebar: "Reconciliation" added after Opening Checklist

**Container Tracking (Migration 055):**
- `inventory_container_types` table — 9 seeded types (bottle, keg, case, crate, box, packet, bag, tub, bucket)
- `inventory_products` — added `container_type_id` + `units_per_container` columns
- `inventory_transactions` — added `container_quantity` + `container_type_id` columns
- API: `GET /api/inventory/container-types` (list, trackable filter), `GET /api/inventory/container-types/[id]`
- UI: `/admin/inventory/containers` — container type reference page
- Sidebar: "Containers" added after Products in Inventory nav

**Food & Beverage Dashboards:**
- Inventory dashboard tabs: All, Food, Beverage, Cleaning, Packaging, General
- Active tab adds `inventory_type` query param to the combined dashboard API call
- Existing dashboard engine already accepted `InventoryType` param from M1

**M2 Complete — 5/5 components:**
- ✅ Opening Checklist (Migration 054, engine, API, 2 UI pages, sidebar)
- ✅ Reconciliation UI (page with KPI cards, search, inline phys qty editing)
- ✅ Container Tracking (Migration 055, API, UI page, sidebar)
- ✅ Variance Report (UI page, stock count selector, sortable table, sidebar)
- ✅ Food/Beverage Dashboards (type tabs on existing dashboard page)

### Milestone 1 — Complete (2026-07-30)

**Migrations:** 050 (inventory_type + cost_centres), 051 (reason_type + notes), 052 (daily_snapshots), 053 (import_mode)

**Engine:**
- `types.ts` — `InventoryType`, `MovementReason`, `ImportMode`, `CostCentre`, `DailySnapshot`, `MovementEvent`
- `ledger.ts` — `createTransaction()` now passes `cost_centre_id`, `reason_type`, `reason_notes`, `manager_note`, `note_author`
- `dashboard.ts` — all 8 functions accept optional `InventoryType` param
- `timeline.ts` — `getTimeline()` engine (product/location/PO/booking/date scoping)
- `reports.ts` — 5 functions accept optional `InventoryType` param

**API:**
- `api-utils.ts` — `getInventoryTypeFilter()`, `applyInventoryTypeFilter()`
- Products: inventory_type filter on GET + POST + PATCH
- Dashboard: inventory_type filter on all 8 sections
- Transactions: inventory_type filter via inner join
- Reports: inventory_type filter on daily, waste, fast-movers, slow-movers, valuation
- Timeline: new route + proxy
- Imports: `ImportMode` (draft/direct/reconcile), new fields on `ParsedRow`/`ImportDecision`, `directApply()` skips preview, PUT route for JSON direct imports

**Key changes to existing files:**
- `src/inventory/api/dashboard/route.ts` — inventory_type on all sections
- `src/inventory/api/transactions/route.ts` — inventory_type via inner join
- `src/inventory/api/imports/route.ts` — importMode, direct, PUT route
- `src/inventory/import/ImportTypes.ts` — ImportMode, new fields
- `src/inventory/import/ImportService.ts` — preview() accepts importMode, directApply()
- `src/inventory/import/ImportExecutor.ts` — passes cost_centre_id, reason_type, reason_notes
- `src/inventory/api/reports/{daily,waste,fast-movers,slow-movers,valuation}/route.ts` — inventory_type param
- `src/inventory/lib/reports.ts` — inventory_type filter on 5 functions

**Verification:**
- TypeScript strict: clean compile (inventory tsc ~30s)
- Tests: 56/56 passing
- Build: next build compiles successfully (5.4min, global tsc times out — pre-existing)
- Vercel deployment fix: 3 JSX errors in migrated AdminPage files fixed (commit `4ccefdc`)

---

## Session: Operations Restructure � /admin/inventory ? /admin/operations (2026-07-31)

### Objective
Finish the final item of the 8-refinement plan: rename and restructure the admin UI from "Inventory" to manager-first "Operations". User approved overriding the old frozen "no rename" rule.

### Route Changes (commit `ee05722`, 61 files)
- All 37 inventory admin pages moved: `src/app/admin/inventory/*` ? `src/app/admin/operations/*`
- **Opening Checklist is the Operations landing page** (`/admin/operations`); old dashboard ? `/admin/operations/dashboard`
- Checklist history ? `/admin/operations/history`; containers ? `/admin/operations/beverage/containers`
- **Food/Beverage splits** (new routes): `/admin/operations/food/products`, `/admin/operations/beverage/products`, `/admin/operations/food/reconcile`, `/admin/operations/beverage/reconcile`
- **New page:** `/admin/operations/receiving` � Goods Receiving queue (POs in ordered/partial status, links to PO detail receive flow)
- **Settings** became a hub with sub-routes: `settings/uoms`, `settings/categories`, `settings/cost-centres`
- API paths unchanged (`/api/inventory/*`) � only admin UI routes moved; middleware already protects `/admin/:path*`

### Sidebar (7 Operations sub-groups replacing the flat 25-item Inventory group)
- Open: Opening Checklist, Reconcile Food, Reconcile Beverage, Stock Counts, Variance Report
- Inventory: Dashboard, All Products, Food Products, Beverage Products, Containers, Reorder, Forecasting, Analytics
- Purchasing: Purchase Orders, Receiving, Suppliers, Supplier Performance, Price History
- Production: Recipes, Production Runs, Waste & Breakage, Order Items, Menu Integration
- Records: Locations, Transactions, Imports, Notifications (badge href updated)
- Reports, Settings

### Legacy Redirects (next.config.js)
- `/admin/inventory` ? `/admin/operations`, `/admin/inventory/:path*` ? `/admin/operations/:path*` (permanent)
- Special cases: `/admin/inventory/checklist` ? `/admin/operations`, `/admin/inventory/checklist/history` ? `/admin/operations/history`, `/admin/inventory/containers` ? `/admin/operations/beverage/containers`

### Shared Components Created (src/inventory/components/)
- `products-view.tsx` � ProductsView with optional `forcedType` (FOOD/BEVERAGE/all)
- `reconciliation-view.tsx` � ReconciliationView with optional `forcedType` (adds inventory_type query param)
- `settings-views.tsx` � UomsView, CategoriesView, CostCentresView (split out of old settings page)
- `src/inventory/ambient.d.ts` � permanent `declare module '*.module.css'` (inventory components now import design-system CSS modules; required for strict inventory tsc)

### Pre-existing Build Blockers Found & Fixed (would have failed next build)
- **12 pages used `subtitle=`** on AdminPage (prop is `description=`) � pages from M2�M4 era verified only via narrow temp tsconfigs
- **imports/page.tsx** used `render:` instead of `cell:` in DataTable columns + object literal for emptyState
- **TS2344**: DataTable `<T extends Record<string, unknown>>` vs plain interfaces � converted all page interfaces to `type` aliases (51 across operations pages; pattern still exists in some src/app non-inventory pages)
- **Badge/Button** CSS module maps (`Record<Variant, string>`) broke under strict noUncheckedIndexedAccess � added `?? ''` fallbacks
- Receiving page Badge `primary` variant ? `info` (BadgeVariant has no primary)

### Verification (2026-07-31)
- `npx tsc --noEmit -p src/inventory/tsconfig.json` clean (strict)
- UI pages verified via temp `src/inventory/tsconfig.ui.json` (extends root, strict:false, explicit jsx+paths, includes ambient.d.ts) - deleted after verification
- 61/61 vitest passing
- Zero `/admin/inventory` references remain in `src/` (grep verified)

---

## Session: Background Jobs Correctness Pass (2026-08-01)

### Objective
The booking submit / Regenerate PDF endpoints were intermittently returning "Failed to queue PDF generation" / "Failed to queue PDF regeneration". Audited and hardened the entire enqueue → worker → handler pipeline against concurrency, crash, and idempotency failures. Multiple production-blocking bugs found and fixed end-to-end (verified live against the production Supabase DB and the live Vercel deployment).

### Bugs Found (in order of discovery) and Fixed

| Commit | Bug | Severity | Fix |
|--------|-----|----------|-----|
| `281424c` | `regenerate-pdf/route.ts` returned a hard 500 on duplicate `idempotency_key` (23505) — the dead_letter row held the UNIQUE slot forever, so every subsequent Regenerate click on that quote returned "Failed to queue PDF regeneration" | Critical | Introduced atomic `enqueue_background_job()` RPC (migration 060) using `FOR UPDATE` + dead-row delete+insert; both submit & regenerate routes call it |
| `fec179d` | Migration 060's `enqueue_background_job()` raised `42702: column reference "id" is ambiguous` at call time — `RETURNS TABLE (id, status, outcome)` declared output vars named `id`/`status` that collided with unqualified `RETURNING id` / `SELECT id` / `DELETE WHERE id=` references in the body. Every enqueue call died. Both routes returned the generic "Failed to queue ..." message | Critical (production-blocking) | Fully qualified every reference as `public.background_jobs.id` / `.status` |
| `fa51693` | Routes read `enqueueResult.outcome` / `.id` off the ARRAY returned by supabase-js v2 for `RETURNS TABLE` functions → `outcome` was always `undefined` → `isDuplicate` always `false`. Verified live: a deliberate double-submit created a second booking `BMC-2026-0015` + quote, instead of returning `duplicate:true` | High (duplicate customer rows) | Normalize via `Array.isArray(enqueueResult) ? enqueueResult[0] : enqueueResult` in both routes |
| `2c8ff67` | Submit route did the entire booking+quote+audit+availability inserts BEFORE the idempotency decision at the end → a duplicate submission created duplicate rows even when the enqueue decided "duplicate". DB-level idempotency only protected the PDF job, not the booking/quote rows | High (duplicate rows on retry/double-click) | Early idempotency check immediately after validation, before any DB write. Replays prior job's payload back to UI as `success duplicate:true`; falls through to fresh submit if prior payload malformed |
| `5f753c2` | PDF handler's Phase 3 admin notification email had no idempotency check. A worker that crashed between `sendEmailToMultiple` and the final job-status UPDATE would have the scheduler retry and fire ANOTHER admin email — unbounded amplification per crash-retry cycle | High (admin email amplification) | Transactional-outbox pattern keyed on `(recipient_type='admin', notification_type='admin_new_booking', recipient_identifier=quoteNumber)`: insert `status='pending'` BEFORE send, UPDATE to `'sent'` after; retry sees `pending` row and re-attempts only if not sent; `sent`/`failed` rows skip the send |

### Migration 060 — `enqueue_background_job()` RPC (final form after `fec179d`)

File: `supabase/migrations/060_background_jobs_enqueue_rpc.sql`

`SECURITY DEFINER` `RETURNS TABLE (id UUID, status TEXT, outcome TEXT)` function that owns every enqueue decision and row mutation atomically. Outcomes:
- `inserted` — no prior row, fresh `pending` job created
- `already_queued` — a `pending`/`processing` job exists, left untouched (returns existing row)
- `already_completed` — a `completed` job exists, left untouched
- `replaced` — `dead_letter`/`failed`/`cancelled` row deleted, fresh `pending` job inserted with the same key

Hardening baked in:
- `search_path = pg_catalog, public` + fully-qualified `public.background_jobs.*` references (defeats the `42702` ambiguity)
- `<<decision_loop>>` with `EXCEPTION WHEN unique_violation THEN CONTINUE` — handles the READ COMMITTED no-prior-row race (two concurrent first-ever enqueues; one wins UNIQUE, the other re-enters the loop and sees the committed row → `already_queued`). Bounded to 3 attempts.
- `SELECT ... FOR UPDATE` on any existing keyed row serializes concurrent callers under READ COMMITTED (the FOR UPDATE wake-up re-evaluates the query post-peer-commit, so a `replaced` death-row gets seen as a new `pending` row by the locked-out peer)
- `p_job_type` allow-list (only `'pdf_generation'` — must match `registry.ts` registrations; add an entry when a handler is registered)
- `p_max_retries` clamped to 1-10 (default 3)
- `REVOKE ALL FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE TO service_role` guarded by `DO $$ IF EXISTS ...`

Audit verdict (after hardening): production-safe under READ COMMITTED; at most one row lock per transaction ⇒ no deadlock possible across job types; only the service-role can call it (matching `getAdminClient()`).

### Worker Lifecycle Audit (no code change — confirmed safe)

Traced crash scenarios against `src/jobs/worker.ts` + `src/jobs/scheduler.ts`:

- **Crash before lock UPDATE:** row stays `pending`, picked up on next poll (5s). No harm.
- **Crash after lock, before heartbeat:** row is `processing` with stuck `heartbeat_at`. Scheduler runs every 30s, stuck threshold 60s (`lt`, strict). Worst-case reclaim ≈ 90s.
- **Crash during processing:** heartbeat last fired ~10-50s ago. Scheduler detects and resets to `pending` with incremented `retry_count` + backoff.
- **Crash AFTER handler completes but BEFORE status UPDATE:** row stuck `processing`. Scheduler reclaims; handler re-runs. **Idempotency:** PDF gen already done (`quotes.storage_path`/`pdf_version` skip); customer email gated by `quotes.quotation_email_sent_at`; admin notification was the gap (now fixed by `5f753c2`).
- **Permanently stuck?** Only if BOTH worker AND scheduler stop — they're colocated in `src/jobs/index.ts` (`Promise.all([startWorker(), startScheduler()])`). On process restart the scheduler's first poll reclaims within ~30s.

Rejected recommendation: aggressive `locked_by`-based startup reclaim — would steal legitimate long-running PDFs from a still-alive worker whose PID changed on host restart. Heartbeat-based reclaim (the current design) is correct.

### Remaining operational gaps (user-rated ~9.7/10 subsystem)

1. **Worker is NOT running anywhere** — confirmed live: production `background_jobs` has pending `pdf_generation` jobs from ~10h before this session, none picked up. The booking pipeline queues work that nothing processes; customers/admins never receive PDFs or emails until the worker is deployed. This is the unblocking item — see `oracle-runbook.md`.
2. Crash-injection tests (5 scenarios listed in conversation) not yet run — would harden confidence beyond static analysis.
3. Multi-worker (horizontal) instance behavior untested — locking is sound but no live proof.
4. `booking_settings` table doesn't exist (the schema is actually `site_settings` with `booking:*` keys) — code already handles via `getBookingSettings()` defaults; informational only.

### Final Background-Jobs Subsystem Rating

After the enqueue RPC, race hardening, worker lifecycle analysis, scheduler review, retry logic, and idempotency work — **9.7/10**. Remaining gaps are operational (worker deployment, crash-injection tests, multi-worker verification, prod monitoring), not architectural.

### Files Touched (this session)
- `supabase/migrations/060_background_jobs_enqueue_rpc.sql` (NEW — 190 lines)
- `src/app/api/booking/submit/route.ts` (rewrite of enqueue block + early idempotency check + array-unwrap)
- `src/app/api/admin/quotes/[id]/regenerate-pdf/route.ts` (rewrite of enqueue block + array-unwrap)
- `src/jobs/handlers/pdf-generation.ts` (Phase 3 admin notification outbox idempotency)

### Verification
- Migration SQL applied — production `background_jobs`, `enqueue_background_job()` RPC both live
- Live booking submit `BMC-2026-0014` returned 201 with the real job queued in `background_jobs` (`status:=pending, retry_count:=0`)
- Live admin regenerate-pdf on that quote returned 200 with `queued:true, pdf_version:2`; second regeneration job queued correctly
- TypeScript syntax-clean for all three edited `.ts` files (full module-resolution type-check deferred to Vercel build per pre-existing tooling constraints)

---

## Session: Background Worker Deployed — Oracle Cloud (2026-08-03)

### Objective
Resolve the #1 remaining gap: the background-job worker ran nowhere. Deployed it to an Oracle Cloud Always Free VM so booking PDFs + emails actually process in production.

### Host
- Oracle Cloud Always Free, **Ampere A1.Flex**, Ubuntu 24.04 (hostname `boma-worker`), x86_64, Node v22.23.2, 44 GB disk (18% used)
- Public IP: `145.241.101.133`; SSH key: `C:\Users\stoph\Downloads\ssh-key-2026-08-02.key` (`ubuntu` user)
- The runbook (`oracle-runbook.md`) was written in a prior session and used verbatim; steps 1-2 (provisioning) done manually in Oracle Console by the user.

### What was done
1. **Verified** Node v22, git, PM2 v7 already installed
2. `git clone https://github.com/malikstopher-dev/the-boma-cafe.git boma` → `npm ci` → `npm run build:worker` → `dist/jobs/index.js` (78 KB)
3. **Env:** built `~/boma/.env.worker` with values extracted from local `.env.local` (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, BOOKING_FROM_*, HOSTNAME=boma-worker, NODE_ENV=production); transferred via SCP + `chmod 600`. **Key lesson:** `set -a; source .env.worker` in bash fails on quoted/spaced values (`bookings` etc.) — PM2 uses Node's env-file parser for those, but we re-created the file quoted anyway (avoiding enclosing `# runs fine
4. **Smoke test:** `timeout 12 node dist/jobs/index.js` — boots, connects to Supabase, polls (5s worker + 30s scheduler), clean SIGTERM exit
5. **PM2:** `pm2 start ecosystem.config.cjs` (env-loading config that reads `.env.worker`; PM2 v7 dropped `--env-file` CLI flag → ecosystem file is the supported path). `pm2 save` + `pm2 startup systemd` boot persistence. Note: `sudo env PATH=$PATH:...` must be single-quoted (double quotes make PowerShell expand `$PATH`).
6. Added `.env.worker`, `logs/`, `ecosystem.config.cjs` to VM-local `.gitignore` so future `git pull` never dirties

### Live end-to-end verification (production)
- `POST /api/booking/submit` on prod → `success:true, quote_number:BMC-2026-0016, job_id:cdff73be...`
- Within **5s** the worker picked it up: `processing job` → PDF generated (98 KB) → uploaded to Storage `2026/08/BMC-2026-0016/quotation-v1.pdf` → `quotes` updated → `quote_versions` row → customer email sent → **4 admin notifications** → `handler completed` in **8.2s**
- DB confirmed: job `status=completed`, `quotes.storage_path` + `pdf_version=1` + `quotation_email_sent_at` set
- **Test data cleaned up** afterwards: notification_queue rows, quote_version, quote, booking, customer, background_job (all HTTP 204), and the PDF object deleted from storage (`quotations/2026/08/BMC-2026-0016/quotation-v1.pdf`)

### Remaining (from the old gap list)
2. Crash-injection tests — still not run
3. Multi-worker horizontal instance — still untested
4. `booking_settings` table mismatch — informational; `getBookingSettings()` handles it

### Current worker status
- Running under PM2 `boma-worker`, `fork` mode, 0 restarts, ~114 MB RSS, online (checked 2026-08-03, ~45 min uptime)
- Boot persistence via systemd `pm2-ubuntu` service (enabled)
- Deploy key: commit `ad4aba1` on VM `main` (matches local repo)

### Deploy updates (future)
```bash
ssh -i "C:\Users\stoph\Downloads\ssh-key-2026-08-02.key" ubuntu@145.241.101.133
cd ~/boma && git pull && npm ci && npm run build:worker && pm2 restart boma-worker && pm2 save
```

---

## Session: Cost-Centre Requirement on Movements (2026-08-09) — commit `bca7261`

### Objective
Owner noticed PO receiving in production created `inventory_transactions` rows with `cost_centre_id = NULL` (schema requires NOT NULL; engine inserts fell back to null because callers never passed a cost centre). Verified live before the fix: transactions from real receiving events had NULL `cost_centre_id`. Fixed end-to-end.

### Root cause
`createTransaction()` in `src/inventory/engine/ledger.ts` inserted `cost_centre_id ?? null` and no caller (PO receive API, waste, adjustments, stock counts, imports, order items) passed a cost centre. Schema demands NOT NULL; the inserts succeeded anyway because PostgREST insert can't see the table CHECK? (no — actually the check is on the column and the ledger bypasses it) → NULLs persisted.

### The fix (commit `bca7261`, 11 files, +342/−25)
1. **Migration `066_locations_cost_centre.sql`** — added `cost_centre_id UUID NULL REFERENCES cost_centres(id)` to `inventory_locations`, backfilled all 6 production locations by keyword rules (Main Bar/Bar 2 → Bar; Dry Store/Store-Room → Restaurant; Puff Lounge → Events; Art Area → Restaurant fallback), then `SET NOT NULL`. Applied to prod.
2. **`src/inventory/lib/cost-centre.ts` (NEW)** — `resolveCostCentreId(locationId, explicitCostCentreId?)`: explicit non-null wins (validated against DB); else falls back to the location's `cost_centre_id`; else first active location's; else NULL (caller's decision to reject). Default export used everywhere.
3. **`ledger.ts:createTransaction()`** — now calls `resolveCostCentreId(location_id, cost_centre_id)` itself, so **every ledger caller automatically inherits the location's cost centre** even when it passes nothing (waste, adjustments, stock counts, imports, order-items all fixed with zero per-caller changes).
4. **`purchase-orders.ts:receiveItems()`** — rewritten: resolves cost centre for ALL items BEFORE the first write (via `Promise.all(map(async ...))`), throws `MissingCostCentreError` up-front if a location has no centre; previously it created the receipt first and then could silently orphan it. Also fixed a mid-edit duplicated block + `await`-in-sync-`.map` corruption.
5. **API/UI** — receive route passes body `cost_centre_id`; PO detail page added optional Cost Centre select (defaults to location's); transactions route + waste route pass through; `cost_centre_id` now returned in PO/receipts/txn query payloads.

### Live verification (prod, exact owner scenario, cleaned up after)
Applied 066 → all 6 locations have `cost_centre_id` (Bar/Bar/Events/Restaurant ×2/Restaurant). Ran a real PO receive: ESSAIE ×50 @50, TEST ×50 @75, Premium Tonic Water ×50 @35, Premium Vodka 1L ×50 @145, London Gin 750ml ×50 @149 → PO `ordered` → `received`; **5/5 transactions** with exact unit costs, `reference=purchase_order`, `cost_centre_id=Bar (6232a5c4…)`; balances +50 each; owner dashboard KPI `purchased=22700` exactly matches. Test PO/receipts/txns deleted and balance cache rebuilt to pre-test values (Vodka 39.5, Gin 20, others 0).

### Tests
62/62 vitest passing (new: `MissingCostCentreError`). Strict inventory tsc clean.

### Note
Legacy NULL rows from before the fix still exist in `inventory_transactions` (no backfill migration for historical rows — deliberate; the ledger reports treat NULL as "unassigned"). If the owner wants history corrected, write a migration mapping NULL → location's centre for `purchase` txns only.



---

## Session: Daily Stock Input + Weekly View + Gas Tracker (2026-08-10) � commit `e91bdd9`

### Objective
Phases A�D of the owner-approved admin plan: highlight + rename the inventory section on the admin dashboard, Google-Sheets-style Daily Stock Input spreadsheet, numbered Mon�Sun "Delivered vs Sold" weekly view, and an LPG Gas Tracker � all from the live ledger, no fake numbers.

### Migration 067 (applied to prod) � `supabase/migrations/067_daily_stock_profiles_and_gas.sql`
- `inventory_type` CHECK += `GAS`; `transaction_type` CHECK += `gas_usage`; `reason_type` CHECK += `GAS_USAGE`
- New tables `inventory_count_profiles` + `inventory_count_profile_items` (section_label, count_uom_id, sort_order)
- Seeded 5 LPG products `GAS-001..GAS-005` (1/2/9/19/48 kg)

### Engines (new)
- `src/inventory/lib/weeks.ts` � `mondayOf`/`firstMondayOfYear`/`weekNumber`/`lastWeekOfYear`/`weekRange`/`weekLabel`/`currentWeekNumber`. Week 1 = week containing 1st Monday of year; weeks run Mon�Sun (owner-confirmed).
- `src/inventory/engine/weekly.ts` � `getWeeklyMovement` (per-inventory-type delivered vs used, DELIVERED_TYPES=purchase/return/transfer_in, USED_TYPES incl. gas_usage) + `getYearlyWeekSummary` (whole year bucketed by weekNumber, includes current week).
- `src/inventory/engine/daily-entry.ts` � `getOrCreateDailySession` (notes=`daily:{date}` on inventory_stock_counts), `getDailySheet` (profiles ? fallback "All Products" section; expected balance at end-of-day; buildItem converts count units?base via getProductConversion/toBaseUnit), `saveDailyCell` (saveCountItem), `submitDailySession`, `approveDailySession`.
- `src/inventory/engine/gas.ts` � `getGasOverview` (sizes+onHand via inventory_product_balances, weekly/monthly buckets, recentEvents) + `recordGas` (delivery?purchase/DELIVERY '+', usage?gas_usage/GAS_USAGE negative, audit logged).
- `ledger.ts` DECREASE_TYPES += `gas_usage`; `api-utils` inventory type filter += `GAS`.

### API + UI
- API: daily-stock (GET; `[sessionId]` POST cell/PATCH submit; `[sessionId]/approve` POST), count-profiles CRUD, weekly GET, gas GET + records POST � engines under `src/inventory/api/*`, proxies under `src/app/api/inventory/*` using the `@/inventory/api/...` alias pattern (relative depths failed the build).
- UI: `/admin/operations/daily-stock` (spreadsheet grid: sticky header, Enter ? / blur autosave, submit/approve), `/admin/operations/weekly` (week chips, delivered-vs-used bars, per-type table, CSV export), `/admin/operations/gas` (size cards, week/month deltas, record form, recent events). Sidebar groups renamed "Operations & Stock � X" + 3 new items; admin dashboard got the gold hero banner (per-location daily status, Week chip, Operations & Stock quick action).

### CRITICAL production bug found & fixed (stock-counts.ts)
`getStockCount()` ordered items by `created_at` � that column **does not exist** on `inventory_stock_count_items` (migration 046), so PostgREST errored, data came back null, and **every stock count / reconciliation / checklist approval in production silently posted ZERO adjustment transactions**. Fixed: order by `id`. Also made `approveStockCount`'s approver optional (`null`) since `staff_profiles` is empty in prod (FK `approved_by` is nullable).

### Verification (2026-08-10)
- Migration applied to prod via `supabase db push`
- Live smoke against prod (cleaned up after): daily sheet for Main Bar (fallback section, live expected balances Vodka 39.5/Gin 20), cell save 123 ? variance 83.5, submit + approve ? `physical_count` txn +83.5; gas delivery 3� + usage 1� ? onHand=2, week/month buckets correct; weekly engine week 32 Mon�Sun range, zeros when no real txns
- 62/62 vitest passing; strict inventory tsc clean; `next build` green
- Commit `e91bdd9` pushed to main (Vercel auto-deploy)

### Notes
- `inventory_count_profiles` table exists but is empty � Daily Stock Input currently uses the "All Products" fallback; profiles can be configured later via the count-profiles API.
- Legacy orphaned `inventory_stock_count_items` rows remain in prod (sessions deleted) � harmless, invisible to reports.

---

## Session: Stock Sheet Spreadsheet Polish (2026-08-11) ? commit  a6d793

### Objective
Finish the Google-Sheets-style Stock Sheet at /inv/stock: live item search, true Excel cell addresses in the fx bar, variance warnings, click-to-add row, and one-click .XLSX Import/Export.

### What was done (all in src/app/inv/stock/page.tsx)
- **Search box** in the toolbar: filters rows by item name or SKU (case-insensitive) via new renderList memo; empty-state message adapts when searching.
- **fx bar cell ref**: now shows real Excel addresses (A4, F5?) via letterOf map instead of bare column names.
- **Variance column**: negative variance renders with a ???? flag next to the number (in addition to the existing red colouring).
- **Click-to-Add Item**: dashed footer row under the grid appends a new draft row (same as + ADD STOCK).
- **Import .XLSX**: file picker reads the first sheet (raw:false), finds the header row by scanning for an item/product column, maps columns by name (STOCK ITEM/ITEM/PRODUCT/SKU/CODE/CATEGORY/UNIT/UOM/SUPPLIER/PRICE/RECEIVED/DELIVERED/COUNTED/PHYSICAL/WASTE/NOTES). New items become draft rows (name/SKU/category/unit/supplier/price/notes pre-filled); RECEIVED/WASTE/COUNTED cells commit through the same commitCell engine as typing (auto-creates products, posts REAL ledger movements). Fixed a stale-closure bug in the multi-draft case (local nextIdx cursor).
- **Export .XLSX**: exports the full grid (computed cells as numbers, raw formulas as values) via the same dynamic xlsx import; button shows Exporting? state; flash summary of rows exported.
- Import/Export both use dynamic import('xlsx') (SheetJS 0.20.3 tarball pin in package.json ? prior session) and show importing/exporting state; errors flash to the error banner.
- Also removed a dead key === 'comments' branch and restored the missing gridAnchor ref declaration.

### Build-blocking fix (unrelated to the UI work)
- src/app/api/inventory/sheets/[id]/cells/route.ts:100 used query.select('*', { count: 'exact', head: true }) on a DELETE chain � supabase-js v2 types only allow 1 arg there, failing 
ext build's tsc step. Fixed: wait query.select('*') and count via deletedRows.length (PostgREST RETURNING). This file (and sheets/route.ts, migration 068) were untracked leftovers from the prior session � now committed.

### Verification
- Page + sheets API typecheck clean (temp tsconfig with strict:true, deleted after)
- 62/62 vitest passing; strict inventory tsc clean
- 
pm run build green (app compiles in 4.5min; global tsc step now passes too)
- Migration 068 already applied to prod by owner (sheets + cells tables live)
- Commit  a6d793 pushed to main (Vercel auto-deploy)

---

## Session: Stock Sheet Production Bug Fixes (2026-08-11) ? commit db0c5c7

### Objective
Fix 7 production bugs surfaced by owner screenshots 545?561 (another AI's advice was hallucinated: wrong table names inventory_ledger, @supabase/auth-helpers-nextjs, uom_id column on inventory_products ? ignored). AG Grid was uninstalled by the owner; its CSS imports removed from src/app/inv/layout.tsx.

### Bugs fixed (all verified against prod DB)
1. **uom_id PGRST106 schema error** (screenshots 553/554): stock page UNIT cell PATCHed { uom_id } onto inventory_products ? column does not exist (UOM links live in inventory_product_uoms, which was empty). Fix: products/[id]/route.ts handles uom_id in body by deleting + re-inserting the product's base/display UOM link (is_base+is_display+factor 1); uom_id removed from the products PATCH allowlist.
2. **WASTE transaction_type CHECK error** (561): page posted 	ransaction_type: 'WASTE' uppercase; ecordWaste() requires lowercase (waste, breakage, spillage, comp, expiry_loss, theft, donation). Fix: lowercase 'waste' (reason_type stays uppercase ? CHECK in migration 051 is uppercase).
3. **"Location not found: main"** (560): 	ransactions/route.ts POST passed location_id straight to createTransaction(); 'main' is an alias, not a UUID. Fix: route now calls esolveLocationId() (same as every other route).
4. **Daily-stock stuck on "Loading locations?"** (545): page checked Array.isArray(data) but the API returns the { data: [...] } envelope ? never an array. Fix: read json.data ?? json.
5. **"UNIT showing BASE"** (548): daily-stock/page.tsx rendered countUomName ?? 'base'. Fix: fallback 'units'.
6. **Category dropdown only Mixers + Spirits** (550?552): prod had 20 categories = 10x 'Mixers' + 10x 'Spirits' (import pollution). Migration 069 dedupes (earliest id per name kept, products remapped) + seeds 13 real categories: bar (Wines & Bubbles, Beers & Ciders, Liqueurs, Non-Alcoholic) + kitchen (Meat & Poultry, Seafood, Dairy, Produce, Dry Store, Sauces & Spices, Bakery, Frozen, Packaging). 15 categories live now, 1 each.
7. **Kitchen location missing** (546): migration 069 seeds Kitchen (code KITCHEN) with the Kitchen cost centre (NOT NULL since 066).

### Notes
- Migration 069 first attempt failed twice (CTE scope error; inverted delete condition) ? both rolled back transactionally, prod untouched; final version applied via supabase db push (069 marked applied local+remote).
- inventory_product_uoms is empty in prod; the UNIT select in the stock sheet PATCH now populates it per product.
- AG Grid: never used by any page; uninstalled (4 packages) to slim the build.

### Verification
- Temp tsconfig strict typecheck of 5 edited files clean; 62/62 vitest; strict inventory tsc clean; 
pm run build green; migration 069 live in prod (15 categories 1x each, Kitchen location with cost centre, 6 products remapped).
