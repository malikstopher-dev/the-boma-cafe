# MASTER MISSION LOCK — The Boma Cafe

> Single source of current truth. AGENTS.md holds the historical record; this file is the lock.
> Read this first at session start. Update this file (and AGENTS.md) at the end of every ship.

## Current production state (2026-08-19)

- P1a–P1e (Supplier Workflow) — COMPLETE
- F2 (Order → Inventory Deduction), F3 (Order Attribution) — COMPLETE
- E1-1 through E1-5 (Realtime Foundation → Dead-Anon-Realtime Fix) — COMPLETE
- E8 (Admin RBAC + individual logins), legacy shared-password scrapped — COMPLETE
- O1 Phase 1 (dashboard silent refresh + week picker) — COMPLETE
- O1 Phase 2 (admin layout spacing) — COMPLETE
- O1 Phase 3A (owner dashboard header: greeting, ledger subtitle, Go to Admin / View Website / Logout) — COMPLETE
- O1 Phase 3B (the /inv left sidebar on /dashboard — same navigation + styling, no route changes) — COMPLETE
- O4 (Forecast vs Reorder consistency — rule-less fallback in reorder suggestions) — COMPLETE (2026-08-16, commit 33804ac)
- R1 + R1.1 (staff nav + logout regression) — COMPLETE
- O5 (Food Products mismatch — `inventory_get_balance` RPC created, cache-backed display reader) — COMPLETE (2026-08-16, commits 826668e + 38497b2)
- O6 (Products counters mismatch — dashboard summary out/low counters now balance-derived, RPC 095) — COMPLETE (2026-08-16, commit 03b4c6d)
- E2 (Faster ordering — Repeat PO: prefill New PO form from any existing PO, supplier + line items) — COMPLETE (2026-08-16, commits 6390955 + 75a8c91)
- E1 (Excel exports — reports hub .XLSX export via `src/inventory/lib/export-xlsx.ts`; sheet-name sanitizer; tab-switch crash fix) — COMPLETE (2026-08-18, commits e225fb6, 4237026, 5d705c1)
- E3 (Kitchen portion inventory — Portion UOM seed, per-product display-UOM config on products API + detail UI, products list Balance in portions, daily stock input counts in portions; ledger untouched) — COMPLETE (2026-08-18, commits 13d6faa + ccc397a; migrations 096 + 097)
- E4 (Event-attributed POs — POs link to a confirmed booking/event; receiving costs to the event's cost centre; precedence: explicit receive-time cost_centre_id → PO cost_centre_id → location default; migration 098 + engine + API + UI) — COMPLETE (2026-08-18, commit 381056f; migration 098)
- E1A (Smart Product Import — best-effort parser: name-only rows import, priority price-column scan incl. BOTTLE PRICE, per-row create/update/skip, Undo Last Import, bulk edit on products list, Import Products dialog; migrations 099 + 100) — COMPLETE (2026-08-18, commit e960177; migrations 099 + 100)
- O1-D (Production ledger recovery — 61 evidenced pre-wipe transactions restored with original IDs/timestamps; balance cache rebuilt from ledger `SUM(quantity)`, 32 rows, 0 parity mismatches; PO reconciliation 6/6; gas tracker, daily sheet, owner KPIs, realtime (61 `stock.moved` events) all verified) — COMPLETE (2026-08-19, data restored in production; docs-only commit)
- Migrations 096–102 applied (local == remote, 000–102; 016a filename-skip benign)
- Supplier Data Integrity + Banking Details — COMPLETE (2026-08-19; migrations 103–104, commit 736ebc0)
- SYNC-2 Phase 2 (weekly location truth + explicit weekly errors + Kitchen label clarity) — COMPLETE (2026-08-20; commit 7e29500)
- SYNC-2 Phase 3 (canonical movement classification design) — COMPLETE (2026-08-20; documentation-only)
- 316/316 Vitest passing; inventory strict TypeScript clean
- Worker deployed on Oracle VM, PM2 `boma-worker`, online
- `/dashboard` = canonical Owner Dashboard (blue executive layout frozen)

## O1-D — Production Ledger Recovery (COMPLETE 2026-08-19)

**Production ledger `inventory_transactions` was wiped** between 2026-08-15 ~06:15 UTC and 2026-08-16 ~08:00 UTC (actor unknown; raw SQL bypasses engine audit). Recovery was executed from the surviving `inventory_audit_log` — the ONLY surviving evidence source (Supabase Free Plan: no scheduled backups, no PITR, no recoverable backup source — owner-confirmed).

### Verified production result (2026-08-19)

- `inventory_transactions`: **64 → 125 rows**; **61 evidenced pre-wipe transactions restored** with original IDs/timestamps (single atomic INSERT; duplicate/collision checks re-run immediately before the write)
- `inventory_product_balances`: rebuilt from ledger `SUM(quantity)` — 32 rows, **0 parity mismatches** vs the ledger
- PO reconciliation: **6/6 passed** (cff5f01e/fd9c3482/281a74bb/47f04a87 = R4100 each, 48518f4f = R2500, 5b6c31e7 = R0, 5f8b0398 = R0)
- Gas tracker: **passed** (Main Bar: 1kg=12, 2kg=6, 9kg=7, 19kg=2, 48kg=7; Store-Room: 19kg=4)
- Daily sheet: **passed** (Main Bar, 22 products, ledger-backed)
- Owner KPIs: **passed** (this_week 168,150 / 0 / 92,113 — post-wipe rows unchanged; last_7 + this_month now include restored rows)
- Realtime: **61 `stock.moved` events emitted** (trigger fired per inserted row)
- Rollback artifacts preserved at `C:\BOMA\o1d-restore\` (61-ID manifest + pre-restore 64-row txn export + 32-row balance export + rollback/execute scripts)

### Documented recovery limitations (preserved)

- 36/61 restored transactions have recovered `unit_cost`; 25 remain faithfully NULL (incl. the owner's 9 no-cost receives; P0-verified fish R200 / mango R25 costs were not in the audit log)
- Approximately **R73,800 of historical purchases and additional consumption had no surviving audit evidence and remain unrecoverable**
- Supabase Free Plan provided **no backup/PITR recovery source**
- Cache-only values without ledger backing were **removed by the ledger-derived rebuild** (owner-approved `SUM(quantity)` semantics; preserved in the pre-restore export)

## Frozen rules (do not break)

- Do not re-audit completed work. Do not touch P1/F2/F3/E1 unless fixing a proven regression.
- Do not merge or remove `/inv`. Do not change middleware. Do not change login routing.
- Do not rewrite migrations. Do not edit applied migration history — replay via CREATE OR REPLACE in a new migration.
- Break nothing: ledger parity, audit logs, RBAC, validation wording, API signatures.
- Additive changes only. Leave production clean. End every session with Stop.
- Never touch, import, delete, rename, stage, or commit the three untracked owner XLSX files.
- **STANDING RULE (2026-08-16, owner directive):** Autonomous multi-ship runs must re-read MASTER_MISSION_LOCK.md before activating each subsequent ship. Never rely on the queue remembered from the previous ship. Max four ships per autonomous run; stop after the fourth ship even if more work is queued, and wait for owner permission.

## Active ship

### U1 — Vercel and Supabase Usage Audit (ACTIVE 2026-08-19)

**Objective:** establish measurable, code-traced evidence for unusually high Vercel usage and Supabase egress, then apply only confirmed, functionality-preserving reductions. Investigation precedes implementation; do not guess.

**Phase U1-A — Investigation only (COMPLETE 2026-08-19):**

- Audit Vercel/Next.js request volume, function execution, cache behavior, image/file delivery, frontend refetching, and route response sizes.
- Audit Supabase query shapes, selected columns, pagination, realtime subscriptions, storage requests, polling, and request/response transfer.
- Trace every suspected hotspot through the current code and gather measurable read-only evidence where available.
- Report verified causes and the smallest safe remediation plan before changing runtime behavior.

**Verified evidence:**

- `/api/menu/public` is 15,088,777 bytes uncompressed and 11,290,125 bytes over gzip. Its 146 menu items carry 15,021,455 image characters; six PNG data URIs account for 15,010,784 characters. One origin execution reads 15,094,796 bytes from Supabase and returns 15,088,777 bytes through Vercel.
- The route is a 60-second prerender. A request after staleness was observed invoking the serverless origin, followed by a cache hit. At the current payload size, about 695 stale regenerations equal 10.48 GB of Vercel Fast Origin Transfer and roughly the same Supabase Database Egress.
- `menu_items` is 17 MB for only 151 rows and has 1,205 sequential scans in the current 69-day PostgreSQL statistics window. The base64 image column is the table-size and transfer outlier.
- One read-only `getOwnerDashboard('this_week')` execution against production made 101 Supabase requests, transferred 69,184 response-body bytes, and took 34.7 seconds. `/dashboard` repeats it every 60 seconds without visibility gating and separately polls recent audit activity every 60 seconds.
- PostgreSQL statistics show 105,197 legacy worker pending-job polls, 58,474 current projected-column polls, and 18,324 scheduler scans in the 69-day statistics window. These dominate request count but return tiny empty bodies, so they are not the primary GB-scale egress cause.
- Kitchen, bar, admin orders, and open chat retain 15/30-second REST polling even when their `realtime_events` subscriptions are healthy.
- Supabase Storage currently contains 13 objects totaling 1,365,556 bytes (largest 318,649 bytes). Storage volume is not the current primary egress cause. Vercel static `gallery.mp4` is 20,636,261 bytes but is immutable-cached and affects Fast Data Transfer, not the confirmed Fast Origin/database transfer defect.
- Vercel Hobby currently includes 100 GB Fast Data Transfer, up to 10 GB Fast Origin Transfer, 1 million invocations, 4 CPU-hours, and 360 GB-hours provisioned memory. Supabase Free includes 5 GB uncached and 5 GB cached egress.

**Phase U1-B — Menu transfer remediation (COMPLETE AND VERIFIED LIVE 2026-08-19):**

- Implement only confirmed fixes: caching/revalidation, request deduplication, pagination/selective queries, reduced or visibility-gated polling, and avoided database/storage transfers.
- Preserve functionality, data, ledger parity, realtime behavior, RBAC, and API contracts.
- Verify locally and with non-destructive measurements. Do not deploy or mutate production data without explicit owner approval.

**Smallest safe remediation order:**

1. Menu transfer emergency fix: move the six inline PNGs out of `menu_items.image` into ordinary optimized image objects/files, replace the data URIs with short URLs/paths using a rollback manifest, and prevent future public menu responses from serializing inline image data. Keep the exact images and existing menu behavior. This requires explicit approval for the production data update and later deployment.
2. Owner dashboard aggregation: replace the 101-request fan-out with a database aggregation RPC/batched query path, reuse already-loaded transactions, remove supplier/product N+1 reads, and use realtime plus a visibility-gated conservative fallback instead of two unconditional 60-second polls.
3. Realtime fallback correction: while subscribed, stop 30-second full-list polling on kitchen, bar, admin orders, and chat; retain visibility-return refresh, manual refresh, reconnect refresh, and a slower visibility-gated safety poll.
4. Secondary request reductions: batch product balances/display UOMs, throttle admin session `last_active_at` writes, make marketing autosave dirty-state based and paginate versions, collapse duplicate public CMS fetches, and paginate/select explicit columns on growing APIs.
5. Verify each change by re-measuring route bytes, Supabase calls/body bytes, cache transitions, hidden-tab behavior, and desktop/mobile functionality before any production deployment.

**Menu transfer production result (2026-08-19):**

- Six production PNG data URIs were read without mutation, backed up locally with SHA-256 rollback hashes, and converted deterministically to six WebP assets (11,257,981 bytes -> 700,698 bytes; 93.776% reduction; SSIM 0.976938-0.982653).
- `scripts/menu-image-migration/manifest.json` maps each item ID/current value type to its deployed file/path and exact rollback source/hash. `productionMutationPerformed` is `true`.
- `/api/menu/public` no longer selects inline image values with item metadata. A second explicit `id,image` projection excludes `%data:%`; known migrated IDs resolve to manifest paths; unknown inline images fail closed to `null`; a final recursive response guard strips any future data URI.
- Consumer routes are split while retaining 60-second revalidation and `stale-while-revalidate=300`: full menu 146 items/19 categories, homepage four featured items only, waiter 146 orderable items with seven required fields and no images.
- Measured full-menu response: 15,088,777 -> 78,293 bytes; gzip 11,290,125 -> 13,179; Supabase bytes 15,094,796 -> 90,804. All three new route variants regenerating once total 118,292 response bytes and 132,826 Supabase bytes (99.216% / 99.12% reductions versus one old regeneration).
- No response contains `data:`. Six optimized assets have immutable cache headers. Exact PNG rollback files are excluded from Vercel uploads.
- Verification: 311/311 Vitest passing with 20-second timeout for existing slow bcrypt/XLSX tests; inventory strict TypeScript clean; root TypeScript clean; `next build` green; route handlers return HTTP 200 with expected cache headers and measured payloads.
- Commit `bcc22ed` was pushed and deployed to Vercel before database mutation. Migration 101 was then applied and its hash-guarded RPC updated exactly six `menu_items.image` values atomically; verification found six expected paths and zero remaining inline images.
- Live results: full route 78,293 raw / 13,179 gzip; homepage 1,179 / 617; waiter 38,820 / 10,358; authenticated CMS 15,103,996 -> 93,532 raw (99.381% reduction); full-route Supabase path 15,094,796 -> 91,464 bytes (99.394% reduction).
- All six static WebPs return 200 with matching SHA-256 and immutable caching. Desktop/mobile homepage, waiter food menu, and public menu render without horizontal overflow. Existing authenticated CMS returns 200 with 19 categories/146 items and zero data URIs.
- Rollback remains ready: external 15,011,653-byte pre-cutover row export SHA-256 `4eecf34af6b72f79c62fa88002ef6f6c15ceb79166412f32f7f6bb7f30e8000c`, six committed original PNGs/hashes, and atomic service-role rollback RPC.
- U1-B stop gate reached. Do not automatically start Owner dashboard or 15/30-second polling remediation; broader U1 remains active for separately approved checkpoints. S1 and SYNC-1C remain blocked.

**U1-C — Owner dashboard and operational polling (COMPLETE AND VERIFIED LIVE 2026-08-19):**

- Owner dashboard now uses `owner_dashboard()` (migration 102): 101 Supabase reads -> 1, 69,184 -> 6,594 aggregate response bytes, and 34.7s baseline -> 500ms live RPC. The separate audit fetch was folded into the response; the visible safety interval is 300 seconds and hidden tabs make zero periodic reads. `wss://*.supabase.co` was added to CSP so the existing invalidation channel is live.
- Kitchen, Bar, Admin Orders, and open Chat no longer run 15/30-second full-list polls. They retain initial/manual loads, realtime invalidation, reconnect refresh, visibility return, and a 300-second visible-only safety reconciliation. A 35-second no-event production browser probe observed exactly one initial list fetch for each surface and left zero probe rows.
- Commits `f786fa3`, `e7805b4`, and `30f40d1` are pushed and deployed. U1 secondary reductions remain separate future work; this approved checkpoint is closed.

### SYNC-1 — Unified Application Synchronization Program (PLANNED 2026-08-19)

**Goal:** make Admin, Owner, Waiter, Kitchen, Bar, Orders, Bookings, Inventory, supplier operations, and management statistics convergent views of one authoritative database state. Realtime delivers invalidation/change signals; it never becomes authoritative. Clients must recover by refetching authoritative state after missed, duplicate, delayed, or reconnect events.

**Lock status:** the owner advanced the U1 gate and explicitly activated SYNC-1C. SYNC-1C is complete below; no later SYNC checkpoint is active.

**Planned checkpoints:**

1. `SYNC-1A` — system-wide authoritative-state/dependency audit, duplicate-calculation map, polling/realtime/cache/auth inventory, and measurable baseline (investigation only).
2. `SYNC-1B` — explicit synchronization contracts for Orders, Inventory, Bookings, Menu/Products, and Dashboard Statistics; schema and authorization risk review (design only).
3. `SYNC-1C` — smallest shared realtime invalidation/reconciliation foundation with reconnect, visibility, deduplication, and scoped authorization (local implementation; separately activated).
4. `SYNC-1D` — Orders plus Kitchen/Bar/Waiter/Admin/Owner convergence and valid concurrent state transitions (local implementation; separately activated).
5. `SYNC-1E` — Inventory mutation/log atomicity plus Admin/Owner convergence; trace the actual existing inventory log/audit source before any schema decision (local implementation; separately activated).
6. `SYNC-1F` — Bookings and Menu/Product invalidation while preserving all U1-B DTO/image/payload protections (local implementation; separately activated).
7. `SYNC-1G` — Owner/Admin aggregate convergence, eliminate the measured 101-request Owner fan-out, and remove aggressive polling with resilient safety reconciliation (local implementation; separately activated).
8. `SYNC-1H` — multi-client, reconnect, duplicate-event, concurrent-update, authorization, cache, and performance acceptance suite (local verification; production actions separately approval-gated).

**Non-negotiable contract:** `authorized mutation -> server/database transaction -> authoritative tables -> committed state -> scoped signal/cache invalidation -> affected clients reconcile`. No dashboard-to-dashboard synchronization, giant realtime payloads, wildcard subscriptions, client-authoritative copies, stale-write-last updates, or hidden-tab hammering.

**SYNC-1A / SYNC-1B audit checkpoint (DOCUMENTATION COMPLETE 2026-08-19):**

- Authoritative dependency map, duplicate-calculation inventory, current polling/realtime/auth map, target contracts, phased implementation gates, and acceptance scenarios are recorded in `docs/SYNC_1_ARCHITECTURE_AND_CONTRACTS.md`.
- Highest-priority prerequisites are authorization and transaction correctness, not subscription cosmetics: unmatched routes can trust client-supplied internal role headers; most service-role inventory mutations are authenticated but not explicitly RBAC-gated; completion-to-deduction enqueue is not atomic; booking status has competing writers; ledger audit/cache/signal ordering is not atomic; arbitrary RPC errors can downgrade to non-atomic fallbacks.
- Realtime currently has no cursor/catch-up/version protocol, uses multiple browser clients, exposes a global anonymous signal feed, and retains aggressive polling on key operational screens. Migration-derived source-table RLS/publication state conflicts with the original E1 documentation and must be live-verified before schema design.
- `inventory_logs` does not exist in tracked schema/code. Quantity truth is `inventory_transactions`; inventory history sources are `inventory_audit_log` and `admin_audit_log`; `realtime_events` is invalidation only.
- SYNC-1A/1B were documentation-only. The owner subsequently advanced U1 and explicitly activated SYNC-1C.

**SYNC-1C — shared authentication and realtime foundation (COMPLETE AND VERIFIED LIVE 2026-08-19):**

- Reserved identity headers are stripped at middleware ingress. Authorization now resolves from validated cookies/sessions only; `/api/admin/auth` no longer accepts `x-admin-*`, and unresolved admin identity fails closed instead of receiving legacy full access.
- Inventory APIs are management-only at the middleware boundary. Live proof: a Kitchen session receives 403 from `/api/inventory/products` while `/admin/kitchen` remains 200; a forged owner-header request to `/api/admin/auth` now returns `{ authenticated: false }`.
- Browser Supabase access is a window singleton. The generic realtime refresh hook now tracks the existing monotonic `realtime_events.id`, deduplicates a bounded signal history, catches up on subscribe/reconnect/visibility/online, and preserves consumers' authoritative refetch behavior.
- Live production checks: anonymous `realtime_events` cursor query is 200 with only id/event/table/entity/timestamp fields; `orders` returns no rows; direct `staff_messages` currently returns a 500 infinite-RLS-recursion error and is not used as a transport. A disposable Owner browser received a real `stock.low` event and refreshed `/dashboard` (3 -> 4 owner API requests) with no realtime errors; all probe records were deleted.
- Commit `1060ba2` is pushed and deployed. SYNC-1D and later checkpoints remain approval-gated.

### SYNC-2 Phase 2 — Inventory Truth Consistency (COMPLETE 2026-08-20)

- Fixed the verified weekly `location_id=main` alias defect by resolving aliases through `resolveLocationId()` before UUID filtering; explicit UUID behavior remains unchanged.
- Weekly detail and yearly summary now surface Supabase query errors instead of converting failures into business zeros. The weekly UI displays the error state.
- Clarified `/inv/stock` wording from `Kitchen Stock` to `Kitchen / Food Stock (Main Bar)` without changing location or inventory-type semantics.
- Production Week 34 verification: `main` and the explicit Main Bar UUID both return Delivered Qty `1,465` and Delivered Value `R168,150`; both responses match.
- Stock Sheet and owner/location dashboard production reads returned HTTP 200. No production business rows were changed.
- Realtime architecture was unchanged; this was a calculation/error-handling checkpoint.
- Commit `7e29500` was pushed and deployed to Vercel Production; cloud TypeScript/build completed successfully.
- Local verification: weekly tests 4/4, inventory strict TypeScript passed, root TypeScript passed, and `git diff --check` passed. The local build reached compilation/TypeScript but exceeded the machine timeout; the Vercel production build completed successfully.

### SYNC-2 Phase 3 — Canonical Movement Classification Design (COMPLETE 2026-08-20)

Documentation-only checkpoint. No runtime code, production data, configuration, tests, build, migration, or deployment changed.

Approved canonical movement definitions for the next implementation checkpoint:

- **Inbound / Received:** `purchase`, `return`, `transfer_in`
- **Sold / Customer Usage:** `sale`, `sale_bottle`
- **Internal Consumption:** `comp`, `staff`, negative `production`, `gas_usage`
- **Waste / Loss:** `waste`, `breakage`, `spillage`, `expiry_loss`, `theft`, `stolen`, `donation`
- **Adjustment:** explicit `adjustment` only
- **Physical Count Variance:** `physical_count`, remaining separate from generic adjustment
- **Total Outflow:** Sold + Internal Consumption + Waste/Loss

Locked business rules:

- Wastage remains separate from operational Used; waste is not double-counted as Used and Wastage.
- Physical-count variance is not silently classified as a generic adjustment.
- Physical location and `inventory_type` remain independent dimensions.
- Current Stock Value remains a current balance metric; movement metrics remain period-based ledger metrics.
- Shared classification centralizes business meaning without forcing unrelated KPIs to display identical numbers.

### SYNC-2 Phase 4 — Canonical Movement Classification (APPROVED, NOT ACTIVE)

Expected smallest implementation:

- Add `src/inventory/lib/movement-classification.ts`.
- Centralize canonical transaction-type definitions and classification helpers.
- Update applicable TypeScript consumers and add parity/regression tests.
- Preserve ledger authority and the balance-cache architecture.
- Do not redesign SQL/RPCs unless separately proven necessary.
- Do not retire `/inv` or redesign unrelated UI.

Model recommendation: GPT-5.6 Luna Low. If an implementation question is not covered by the approved definitions, stop and report rather than inventing a business rule. Phase 4 must not activate automatically.

### SYNC-1 Ship 1 — Completion→Deduction Intent Durability (COMPLETE 2026-08-25)

- Fixed the audit's Critical finding: order completion committed terminally BEFORE the `order_deduction` job was enqueued; an enqueue failure was logged-and-ignored, silently losing the deduction intent forever ('completed' cannot be re-transitioned).
- `src/app/api/supabase/orders/route.ts` PATCH: `enqueue_background_job('order_deduction')` now runs BEFORE the compare-and-set status update whenever `status==='completed'`. RPC error/throw aborts completion with 503 — the order keeps its prior status and can be retried safely (idempotency key replaces dead slots; concurrent completers converge on one job; a lost CAS race hands the job to the winner via the shared key). Post-enqueue delivery unchanged (worker retry/dead-letter, E1-4). Non-blocking hooks (push notifications, order_events) preserved.
- 6 regression tests (`src/inventory/__tests__/order-completion-deduction-enqueue.test.ts`): enqueue-before-update ordering, 503-no-update on RPC error and throw, zero RPC on non-completion transitions, notification-failure non-blocking precedent, `already_queued` convergence.
- 5 type-only corrections surfaced by first pulling the orders route + libs into the strict inventory graph (route errors[0]! + null-narrow; push.ts forEach param types + token guard; orderService optional menu_item_id guard). Zero behavior change. Single completion writer confirmed by grep (this route only).
- Verification: new tests 6/6; full suite 326/326 (33 files); inventory strict tsc clean; root tsc clean; next build green. Live requests: 0.
- Race note: a worker claim in the ms-gap before commit hits `deduct_order_items`' "Only completed orders" guard and succeeds on its existing backoff retry once the commit lands. A queued job dead-letters only if the order genuinely never completes — visible signal, never silent loss.

### SYNC-1 Ship 2 — Station Authority, Scoped Reads, Split Integrity (COMPLETE 2026-08-25)

- **Server-side station derivation** (`orderService.enrichItems`): resolvable `bar_items` row → bar; menu_item whose category has `is_bar=true` (migration 028's existing signal, surfaced through `getMenuItemsByIds`) → bar; otherwise kitchen. The client-supplied `station` field is still accepted for API compatibility but never trusted. Food-menu cocktails keep bar routing via their category. Legacy not-found wording preserved verbatim.
- **Station-scoped reads** (`orders/route.ts` GET list): kitchen sessions pinned to `station=kitchen`, bar to `bar`, regardless of query params; admin/waiter unaffected (waiter ownership-scoping remains a later checkpoint, noted in-code).
- **Split integrity**: mixed carts enrich once and split ENRICHED lines with per-part subtotals; a failed second-station insert compensating-deletes the first order (order_events cascade via migration 009 FK) and reports loudly if the rollback itself fails; error preserves the client-parsed `'first order created'` phrase.
- **Symmetric siblings**: `getSiblingOrders()` and the `?sibling_of=` endpoint resolve the group from ANY member (root = own group id); a root query previously returned [].
- Dead raw-station splitter `splitItemsByStation` removed (zero callers). No migration; middleware untouched; API signatures unchanged.
- Verification: new 12-test suite `order-station-integrity.test.ts` (spoof attempts both directions, cocktail regression guard, derived-split subtotals + parent pointer, rollback with zero survivors, sibling symmetry, role-pinned reads incl. admin passthrough); full suite **338/338** (34 files); inventory strict tsc clean; root tsc clean; next build green. Live requests: 0.

### S1 — Sensitive Supplier Banking Details (COMPLETE 2026-08-19)

- Inspect supplier schema, APIs, UI, and authorization boundaries during U1-A planning.
- Add optional bank name, account holder/name, account number, account type, branch code, and payment/reference information using the smallest additive design.
- Treat banking data as sensitive business data: never expose it through public/client-facing endpoints, logs, analytics, realtime payloads, or unauthorized UI.
- Implementation was approved after U1 acceptance and deployed with the supplier-integrity cutover.

**Investigation result / proposed security design:**

- Do not add plaintext bank columns to `inventory_suppliers`: its list/detail/archived and mutation-return routes use `select('*')` or unqualified `.select()` and would leak new columns into unrelated browser pages.
- Use a separate service-role-only, RLS-enabled `inventory_supplier_bank_details` table with an application-encrypted payload, account last-four metadata, key version, timestamps, and updating admin ID. Keep the encryption key only in server environment configuration.
- Use a dedicated owner-only API and separately loaded owner-only supplier-detail panel. Require a resolved individual owner identity; deny staff, assistant manager, manager, full manager, missing identity, and legacy/unresolvable contexts.
- Return masked explicit DTOs only; never return ciphertext or include banking data in supplier list/options, reports, exports, analytics, realtime, console logs, or audit before/after JSON.
- Record only sanitized audit events (created/updated/revealed/deleted, supplier ID, actor, changed field names). Never log account number, branch code, encrypted payload, IV, tag, or submitted request bodies.
- Before S1, replace supplier wildcard selects with explicit existing-column lists and add a minimal `{id,name}` options endpoint. Existing supplier routes are broadly authenticated but do not currently enforce supplier-specific admin RBAC; banking routes must not inherit that weakness.

### S1 production result

- Migration 103 installed `inventory_supplier_merge_log`, the controlled consolidation RPC, and rollback RPC. It did not execute consolidation during migration.
- Migration 104 installed the isolated service-role-only `inventory_supplier_bank_details` table and encrypted banking RPCs. No banking rows remain after verification cleanup.
- Vercel Production key `SUPPLIER_BANK_ENCRYPTION_KEY_V1` was generated as a fresh 32-byte base64 key and configured only for Production; the value was never printed or committed.
- Controlled merge RPC executed once with merge ID `d6b9ace1-d53a-4f55-8806-0e1d39bd8c40`: 7 source suppliers archived, 2 survivors active.
- Pre-merge references were preserved: 8 products, 8 purchase orders, 12 receipts, 1 invoice, 0 payments, 0 imports, 0 mappings, 0 reorder rules, and 0 price-history rows. Post-merge counts reconciled exactly.
- Live RBAC: owner/full_manager banking reads and writes succeeded; manager/assistant_manager were denied; only owner deletion succeeded.
- Live leakage checks found no plaintext banking value in the encrypted table, audit values, generic supplier APIs, public menu, or staff API responses.
- Probe admin accounts, audit rows, and banking rows were deleted. Merge log and rollback metadata remain intentionally preserved.
- Commit `736ebc0` was pushed to `main`; Vercel Production deployment was Ready and aliased to `the-boma-cafe.vercel.app`.

## Deferred queue (in order)

- SYNC-1D onward — Unified Application Synchronization Program (approval-gated).
- SYNC-2 broader metric-convergence work — approval-gated; Phase 2 only is complete.
- SYNC-2 Phase 4 — Canonical Movement Classification — approved but not active.
- Supplier Data Integrity + Banking Details — COMPLETE; no follow-up supplier mission is active.
- Optional (future consolidation): `/inv` retirement (6 INV-ONLY capabilities + 5 dashboard links must be ported first).
- (O1-D ledger-warning banner — MOOT: ledger restored 2026-08-19, no longer applicable.)
- (O2 — dashboard refresh — SUPERSEDED by the O1 stream per owner decision.)

## Architecture decisions (locked)

- Transaction ledger is the single truth; balance cache is read-only; never bypass ledger/audit/validation.
- **Balance display convention (O5, migration 094):** `inventory_get_balance(p_product_id, p_location_id)` — SECURITY DEFINER, service-role only — reads the engine-maintained balance cache; `getCurrentBalance()` prefers it with a ledger-sum fallback. Display surfaces read the cache; **validation (createTransaction insufficient-stock) and cache refreshes stay ledger-sum based** (`ledgerSum()` — the F2/E1-4 rule). The cache is ledger-lockstep in the healthy steady state. (O1-D: ledger restored 2026-08-19 — sources re-converged; the cache is fully ledger-backed, 0 parity mismatches.)
- **Product counter convention (O6, migration 095):** dashboard summary counters are balance-derived from the same cache the Products views read — out-of-stock = balance ≤ 0 (missing cache row = 0), low = 0 < balance ≤ reorder_threshold; `totalProducts` = active count (archive sets `is_active=false` + `deleted_at` together). Products pages are the reference for these counters.
- Reservations: stock reserved on confirm, released on cancel, consumed (SALE) only on completion.
- Background jobs: enqueue RPC `enqueue_background_job()`; worker polls `background_jobs`; idempotency keys; dead-letter + scheduler reclaim.
- Realtime: signal table `realtime_events` + SECURITY DEFINER triggers; consumers refetch, never payload-render; WALRUS filters MUST be unquoted.
- Orders: completion enqueues `order_deduction` job (F2 RPC `deduct_order_items`, F3 attribution columns).
- Cost centres resolved from location (migration 066); every movement carries cost via `resolveProductCost()` (083).
- Admin auth: individual accounts only (admin_accounts, bcrypt); staff role shared passwords (kitchen/bar/waiter) gate boards/PWA; waiter PIN for PWA.
- Owner landing: `/dashboard` for owner role; admins → `/admin/dashboard`; staff Dashboard buttons → `/staff/*` per role.
- E1-5 principle: consumers refetch authoritative data; payloads minimal (no PII to waiter clients).

## Current owner decisions

- `/dashboard` is the permanent canonical Owner Dashboard; `/inv` stays intact until a future retirement ship (6 INV-ONLY capabilities + 5 dashboard links must be ported first).
- O1 stream COMPLETE (Phases 1–3B); O4, O5, O6, E2, E1, E3, E4, E1A COMPLETE — autonomous run ended (max 4 ships reached), queue empty (above).
- O1-D recovery COMPLETE (2026-08-19): restore was executed per owner-approved sequence with rollback manifest preserved; no further recovery work queued; remaining unrecoverable amounts (~R73,800 purchases + additional consumption) accepted as documented loss.
- Event purchasing (E4): POs optionally link to a confirmed booking; the event's cost centre governs receiving unless overridden at receive time; booking picker shows confirmed/in_progress/completed only.
- **Smart Best-Effort Import (E1A, owner directive):** import whatever is actually present on each row — never require a complete row, never fabricate missing data. "Import first. Enrich later." Price sources: all recognized price columns are candidates, scanned by priority (bottle/shot → unit/generic → old/makro/solly/ultra; per-case columns excluded), first real value per row wins. Missing fields highlight in the preview but never block. Products get `unit_cost` (migration 100) so imported prices persist on the product record.
- Keep all KPI cards, boards, alerts, activity, charts exactly where they are on /dashboard.
- Verify at desktop/laptop/tablet/mobile before every UI ship; headless Edge probes + probe admin accounts (deleted after, audit rows cleaned).
- Staff shared passwords unchanged: BomaKitchen0884 / BomaBar0884 / BomaWaiter0884.

## Completion review — FIVE GATES (owner process, applies from 2026-08-16 onward)

The completion report is NECESSARY but NOT SUFFICIENT. Every ship is accepted only after a five-gate review:

1. **Mission scope** — only the active ship changed; no stray edits.
2. **Mission lock** — no frozen architecture/rule violated.
3. **Evidence** — the commands/outputs actually support every claim (no inference presented as fact).
4. **Repo state** — clean working tree, or documented exceptions (e.g., untracked owner files).
5. **Deployment state** — always distinguish **pushed** (git), **deployed** (vercel --prod), and **verified live** (probe/headless against prod). Never collapse them into one claim.

Reports must state these explicitly. Owner applies the gates before accepting a ship.
