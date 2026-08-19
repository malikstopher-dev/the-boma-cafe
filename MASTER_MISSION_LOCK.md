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
- Migrations 096–100 applied (local == remote, 000–100; 016a filename-skip benign)
- 284/284 Vitest passing; inventory strict TypeScript clean
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
- **STANDING RULE (2026-08-16, owner directive):** Autonomous multi-ship runs must re-read MASTER_MISSION_LOCK.md before activating each subsequent ship. Never rely on the queue remembered from the previous ship. Max four ships per autonomous run; stop after the fourth ship even if more work is queued, and wait for owner permission.

## Active ship

O1-D (Production Ledger Recovery) COMPLETE (2026-08-19). **No active ship — BOMA is in waiting state.** Await owner direction before starting anything new.

## Deferred queue (in order)

- Optional (future consolidation): `/inv` retirement (6 INV-ONLY capabilities + 5 dashboard links must be ported first).
- Optional (future data ship): supplier dedup migration (six "National Beverage Co" rows + 1 archived, E2 finding).
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