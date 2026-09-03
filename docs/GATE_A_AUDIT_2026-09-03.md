# BOMA Gate A — Full Operational / Synchronization Audit (2026-09-03)

Mission: BOMA Full Operational Audit + Video Inventory Completion (single mission, two gates).
Gate A scope: functional + synchronization audit of the live production system
(`https://the-boma-cafe.vercel.app`, deployment `dpl_CLAn8b8w7P7TDnvwtWxhjvUJ8fwV`, commit `16edc72`).

Method: source-verified baseline (BOMA_FULL_SYSTEM_AUDIT.md, batches 1–4) layered with
live production probes using tagged, disposable data (every probe cleaned; final residue
checks returned zero for staff, orders, products, admins, transactions, count sessions,
background jobs). Tests are evidence, not acceptance. Audit classification:
LIVE VERIFIED / TEST VERIFIED ONLY / SOURCE VERIFIED ONLY / PARTIAL / BROKEN / NOT IMPLEMENTED / BLOCKED.

## 1. Functionality Matrix

| # | Workflow | Classification | Live evidence (2026-09-03) |
|---|---|---|---|
| Public homepage / menu | LIVE VERIFIED | homepage 200, 74 KB, no data URIs; full menu 19 categories/146 items/78 KB; homepage DTO 4 items; waiter DTO 146 items, no image field |
| Public booking config/availability | LIVE VERIFIED | config 200 (8 keys); availability 400 on missing params (fail-closed, not crash) |
| Public order tracking security (C-01) | LIVE VERIFIED | ref-only GET = 401 `requires_verification`; ref-only POST cancel = 401 |
| Booking atomic submit (C-02) | LIVE VERIFIED | submit 201 → booking+quote created; identical retry 200 `duplicate:true` (one booking, one quote) |
| Quote acceptance | SOURCE VERIFIED ONLY | route reads token/status checks correctly; `Promise.all` non-atomicity remains (H-01 remnant, MEDIUM — low-traffic path) |
| Admin login + accounts | LIVE VERIFIED | probe owner/full_manager/manager/assistant logins 200; sessions via `boma_admin_session` |
| Admin orders list | **BROKEN → FIXED this ship** | 500 for every admin-role GET since Batch 1 (`payment_method` column never existed on `orders`; explicit ADMIN_ORDER_COLUMNS inherited it from the PATCH allowlist). Fixed in this checkpoint; re-verify post-deploy |
| Admin background jobs | LIVE VERIFIED | list/stats 200; DTO redacted (no payload, no idempotency key) |
| Waiter PIN lifecycle | LIVE VERIFIED | create waiter 201 (employee_id+PIN), PIN login 200, wrong PIN 401, session cookie set |
| Waiter POS order | LIVE VERIFIED | menu-priced order 201 (total 250 = 2×125, server pricing), station=kitchen, source=waiter, status=pending |
| Waiter identity forgery (C-03) | LIVE VERIFIED | profile role/pin_hash forgery = 403, stored role unchanged |
| Waiter order read scope (H-06) | PARTIAL (open finding) | shared-cookie waiter sees ALL waiter orders; cross-waiter mutation of another waiter's order = 200 (see Findings) |
| Kitchen board | LIVE VERIFIED | station-pinned reads (spoofed ?station=bar ignored), board realtime order appearance 1,480 ms without reload, persists after reload |
| Bar board | LIVE VERIFIED (via API pinning) | bar list contains bar probe only, not kitchen probe |
| Cross-station mutation | PARTIAL (open finding) | kitchen cancelled a bar order = 200 (see Findings) |
| Order completion → deduction (F2/F3/E1-4) | LIVE VERIFIED | preparing→ready→completed; job enqueued BEFORE commit; REAL Oracle worker completed `{"deducted":1}`; SALE −2 at Main Bar (station-mapped), order_id+order_line_id attribution; balance 10→8; re-complete 409-conflict |
| Kitchen/bar inventory API RBAC | LIVE VERIFIED | kitchen cookie → `/api/inventory/products` = 403 |
| Inventory tier RBAC (Ship 3) | LIVE VERIFIED | assistant_manager tx POST = 403; manager count-approve = 403 |
| Stock count lifecycle | LIVE VERIFIED | create (7 stocked products in scope) → item (expected 50, physical 45, variance −5) → submit → approve → exactly one physical_count −5 → balance 45; re-approve idempotent (no duplicate rows) |
| Waste posting (admin persona) | **BROKEN → FIXED this ship** | 500 `invalid input syntax for type uuid: "GATEA full_manager"` — route passed `admin.displayName` into `performed_by` (UUID column). Fixed; re-verify post-deploy |
| Owner dashboard | LIVE VERIFIED | 200; KPI payload present; realtime refetch observed |
| Operations dashboard realtime | LIVE VERIFIED | stock.moved from probe receipt → dashboard refetch 200 within seconds |
| Stock Sheet COUNTED save | LIVE VERIFIED | browser cell edit → POST daily-stock 200, countedUnits 5 persisted |
| Reports/forecast/valuation | LIVE VERIFIED | all 200 for admin session |
| Public CMS allowlist (H-03/Batch 3) | LIVE VERIFIED | no operational/secret keys in public payload |
| Public staff roster (Batch 3) | LIVE VERIFIED | exactly id,name,role,has_pin |

## 2. Synchronization Matrix (verified live)

| Source action → Authoritative write → Signal → Consumers → Result |
|---|---|
| Customer/waiter order → `orders` + order_events → `order.created` (station-scoped) → Kitchen/Bar board, admin, waiter | LIVE VERIFIED: probe order appeared on kitchen board in 1.48 s without reload |
| Status PATCH → status CAS + events → `order.preparing/ready/completed` → boards, waiter, owner | LIVE VERIFIED: ORDER_CREATED/READY/COMPLETED events + 3 station-scoped signals |
| Completion → enqueue-before-commit → worker `order_deduction` → SALE rows + `stock.moved` → dashboards/inventory | LIVE VERIFIED: real worker, correct location, attribution, balance |
| Booking submit → atomic RPC (booking+quote+hold+job) → `booking.confirmed` → waiter feed | LIVE VERIFIED: 201 + duplicate-retry convergence |
| Inventory receipt → `create_inventory_transaction` (ledger+audit+cache atomic) → `stock.moved` → ops dashboard | LIVE VERIFIED: receipt 201 → dashboard refetch 200 |
| Stock count approve → physical_count variance → balance + `stock.moved`/`stock.count.updated` | LIVE VERIFIED: exactly one −5 posting, idempotent re-approve |
| Waste → negative movement → `stock.moved` → waste report/owner KPI | BROKEN for admin persona (fixed this ship); re-verify post-deploy |
| Refresh/reconnect | LIVE VERIFIED: board state persists reload |

## 3. Defects Found (Gate A)

### D1 — CRITICAL: Waste posting broken for every admin-authenticated caller
- Workflow: POST `/api/inventory/waste` (both `/inv/waste` UI and Stock Sheet WASTE cell) with any admin session.
- Expected: 201 negative waste movement.
- Actual: 500 `Failed to create transaction atomically: invalid input syntax for type uuid: "GATEA full_manager"`.
- Root cause (verified): `src/inventory/api/waste/route.ts:66` passed `admin.displayName` as `performed_by`; the atomic RPC casts it `::UUID`. Pre-documented as INV-4A integration risk #3; never wired to the `admin_actor_*` convention the transactions route uses. Zero waste rows created (fail-closed — no partial state).
- Fix (this ship): route passes server-derived `admin_actor_id`/`admin_actor_name`, never displayName-as-UUID; `RecordWasteInput` carries the actor fields. 4 new regression tests (`waste-actor.test.ts`).
- Sync impact: waste report/owner wastage KPI silently misses admin-recorded waste.

### D2 — HIGH: Admin orders list broken for every admin/owner session (Batch-1 regression)
- Workflow: GET `/api/supabase/orders` with admin role (Admin Orders page, Admin Dashboard order list, waiter_stats independent).
- Expected: 200 order list.
- Actual: 500 — `column orders.payment_method does not exist`.
- Root cause (verified): Batch 1 (`8409ece`, 2026-08-26) replaced `select('*')` with explicit `ADMIN_ORDER_COLUMNS` that inherited `payment_method` from the PATCH allowlist; that column exists only on `payments` (migration 034), never on `orders`. Broken in production since 2026-08-26. Kitchen/bar/waiter lists (STAFF_ORDER_COLUMNS) unaffected — why boards kept working.
- Fix (this ship): removed `payment_method` from both the column list and the PATCH allowlist (it was always a silent no-op there).
- Sync impact: owners/admins could not load the admin orders surface at all.

### D3 — MEDIUM: No waiter/actor ownership boundary on order mutations (H-06 confirmed live)
- Live proof: shared-cookie waiter session marked ANOTHER waiter's order `served` (200); kitchen session cancelled a bar order (200).
- Boundary: this is a design decision (shared-password sessions carry no individual identity; PIN sessions do). The state machine intentionally allows cross-role `either` cancels for operational flexibility. Escalation-grade scoping (per-waiter ownership) needs owner sign-off on the operational model — reporting, not guessing.

### D4 — LOW: L-03 debug logging on every orders GET (console.log station/count) — pre-existing, unchanged.

### D5 — LOW/MEDIUM: quote acceptance non-atomic (H-01 remnant) — low-traffic path, source-verified only.

## 4. Repair Priority

1. D1 + D2 (this ship — both block safe inventory operations / admin visibility).
2. D3 (design decision: owner to approve waiter-ownership model — recommend PIN-session-scoped mutations).
3. D5, D4 (deferred, tracked).

## 5. Production state at audit time

Deployment `dpl_CLAn8b8w7P7TDnvwtWxhjvUJ8fwV` Ready; migrations 000–122 synchronized;
worker online. All tagged probe residue zero after every phase (verified by residue queries).
No production business data was modified. Owner XLSX files untouched.

## GATE A RESULT

Critical: 1 (D1 — waste admin persona; fixed)
High: 1 (D2 — admin orders 500; fixed)
Medium: 1 (D3 — order ownership boundary; reported, needs owner decision)
Low: 2 (D4, D5)

Functional workflows verified: 24 (see matrix)
Synchronization workflows verified: 7/8 live (waste re-verify post-deploy)
Broken workflows: 2 (both fixed in this checkpoint, pending deploy + re-verify)
Blocked workflows: 0

Gate A repair rule applied: both Critical/High defects fixed with the smallest change;
D3 requires an owner design decision and does not block Gate B (inventory receiving UX
sits on the ledger/receipt path, which is verified sound).
