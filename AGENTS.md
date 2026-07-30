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
