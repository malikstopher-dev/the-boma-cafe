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
- R1 + R1.1 (staff nav + logout regression) — COMPLETE
- Migration 093 applied (local == remote, 000–093)
- 247/247 Vitest passing; inventory strict TypeScript clean
- Worker deployed on Oracle VM, PM2 `boma-worker`, online
- `/dashboard` = canonical Owner Dashboard (blue executive layout frozen)

## OPEN ISSUE — O1-D (investigation only, NO code committed)

**Production ledger `inventory_transactions` is EMPTY (0 rows)** — wiped between 2026-08-15 ~06:15 UTC and 2026-08-16 ~08:00 UTC. Products/locations/suppliers/POs/receipts/stock-counts/balance-cache all intact. Zeros on both dashboards are FAITHFUL (API == ledger == /dashboard == /inv). Actor unknown.
→ Owner-side action required: restore `inventory_transactions` from Supabase backup/PITR or re-import. Optional additive guard (ledger-warning banner) proposed, NOT implemented — awaiting approval.

## Frozen rules (do not break)

- Do not re-audit completed work. Do not touch P1/F2/F3/E1 unless fixing a proven regression.
- Do not merge or remove `/inv`. Do not change middleware. Do not change login routing.
- Do not rewrite migrations. Do not edit applied migration history — replay via CREATE OR REPLACE in a new migration.
- Break nothing: ledger parity, audit logs, RBAC, validation wording, API signatures.
- Additive changes only. Leave production clean. End every session with Stop.

## Active ship

**O4 — Forecast vs Reorder mismatch.** NOT started.

## Deferred queue (in order)

1. O5 — Food Products mismatch
2. O6 — Products counters mismatch
3. E2 — Faster ordering workflow
4. E1 — Excel exports
5. E3 — Kitchen portion inventory
6. E4 — Event-only purchasing

(O2 — dashboard refresh — SUPERSEDED by the O1 stream per owner decision.)

## Architecture decisions (locked)

- Transaction ledger is the single truth; balance cache is read-only; never bypass ledger/audit/validation.
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
- O1 stream continues one uninterrupted thread: Phase 3B next, then O4… queue above.
- Keep all KPI cards, boards, alerts, activity, charts exactly where they are on /dashboard.
- Verify at desktop/laptop/tablet/mobile before every UI ship; headless Edge probes + probe admin accounts (deleted after, audit rows cleaned).
- Staff shared passwords unchanged: BomaKitchen0884 / BomaBar0884 / BomaWaiter0884.