# MASTER MISSION LOCK — The Boma Cafe

> Single source of current truth. AGENTS.md holds the historical record; this file is the lock.
> Read this first at session start. Update this file (and AGENTS.md) at the end of every ship.

## Current production state (2026-08-16)

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
- Migration 095 applied (local == remote, 000–095)
- 262/262 Vitest passing; inventory strict TypeScript clean
- Worker deployed on Oracle VM, PM2 `boma-worker`, online
- `/dashboard` = canonical Owner Dashboard (blue executive layout frozen)

## OPEN ISSUE — O1-D (investigation only, NO code committed)

**Production ledger `inventory_transactions` is EMPTY (0 rows)** — wiped between 2026-08-15 ~06:15 UTC and 2026-08-16 ~08:00 UTC. Products/locations/suppliers/POs/receipts/stock-counts/balance-cache all intact. Zeros on both dashboards are FAITHFUL (API == ledger == /dashboard == /inv). Actor unknown.
→ Owner-side action required: restore `inventory_transactions` from Supabase backup/PITR or re-import. Optional additive guard (ledger-warning banner) proposed, NOT implemented — awaiting approval.
→ O5 note: while the ledger is empty, the Food Products view shows the balance CACHE (engine-maintained `inventory_product_balances` — the pre-wipe truth: ESSAIE 50 @ Main Bar, CHICKEN 4 @ Kitchen, TEST 50 @ Dry Store) via the new `inventory_get_balance` RPC. Ledger-based KPI surfaces (alerts, valuation, deductions) stay at faithful zeros until the ledger is restored; the two sources re-converge automatically once it is.
→ O6 note: dashboard summary product counters (`totalProducts`/`lowStockCount`/`outOfStockCount`) now read the same balance cache the Products views read (migration 095 replay + engine). `totalProducts` stays active-count (archive sets `is_active=false` AND `deleted_at` together — invariant holds, no filter needed). `lowStockCount`/`outOfStockCount` were hardcoded/threshold-flagged before; now balance-derived (out = balance ≤ 0, low = 0 < balance ≤ threshold, missing cache row = 0).

## Frozen rules (do not break)

- Do not re-audit completed work. Do not touch P1/F2/F3/E1 unless fixing a proven regression.
- Do not merge or remove `/inv`. Do not change middleware. Do not change login routing.
- Do not rewrite migrations. Do not edit applied migration history — replay via CREATE OR REPLACE in a new migration.
- Break nothing: ledger parity, audit logs, RBAC, validation wording, API signatures.
- Additive changes only. Leave production clean. End every session with Stop.

## Active ship

**E2 — Faster ordering workflow.** NOT started.

## Deferred queue (in order)

1. E2 — Faster ordering workflow
2. E1 — Excel exports
3. E3 — Kitchen portion inventory
4. E4 — Event-only purchasing
(O2 — dashboard refresh — SUPERSEDED by the O1 stream per owner decision.)

## Architecture decisions (locked)

- Transaction ledger is the single truth; balance cache is read-only; never bypass ledger/audit/validation.
- **Balance display convention (O5, migration 094):** `inventory_get_balance(p_product_id, p_location_id)` — SECURITY DEFINER, service-role only — reads the engine-maintained balance cache; `getCurrentBalance()` prefers it with a ledger-sum fallback. Display surfaces read the cache; **validation (createTransaction insufficient-stock) and cache refreshes stay ledger-sum based** (`ledgerSum()` — the F2/E1-4 rule). The cache is ledger-lockstep in the healthy steady state; only external ledger data loss (O1-D) separates them, and they re-converge when the ledger is restored.
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
- O1 stream COMPLETE (Phases 1–3B); O4, O5, O6 COMPLETE — queue above (E2 next).
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