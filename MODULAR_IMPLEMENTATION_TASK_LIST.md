# THE BOMA CAFE — MODULAR IMPLEMENTATION TASK LIST

**Date:** 3 August 2026
**Purpose:** Breakdown of all outstanding work from the live API audit into independently deployable, modular tasks. Each task ships independently, follows the governing architecture (transaction-ledger engine, admin cookie auth, manager-first UI), and verifies before merge.
**Reference docs:** `SYSTEM_AUDIT_AND_OPERATOR_MANUAL.md` (Known Bugs #1-17), `ARCHITECTURAL_SPECIFICATION_BLUEPRINT.md`.

---

## PRIORITY ORDER

| Task | Severity | Est. | Depends on |
|------|----------|------|-----------|
| Task 1 — Core Order Channel Fixes | Critical | 1-2h | — |
| Task 2 — Deploy Background Worker | Critical | 2-4h | — |
| Task 3 — Sidebar Hierarchy Pass | Medium | 1-2h | — |
| Task 4 — Menu Integration Hardening | Medium | 2-3h | Task 1 |
| Task 5 — Import UX / Data Quality | Medium | 3-4h | — |
| Task 6 — Pagination & Retention | Medium | 2-3h | — |
| Task 7 — Security Hardening | High | 3-4h | — |

---

## TASK 1 — CORE ORDER CHANNEL FIXES (Critical)

**Fixes live-bug #13 and #14 from the audit.** These block real customer ordering for mixed-station (food + drinks from the food menu) orders and hide actionable error feedback.

### 1.1 Expose real order errors to the client (Bug #13)

**File:** `src/app/api/supabase/orders/route.ts` (lines 202-210)

**Current behavior:** The catch block blanket-sanitizes all non-duplicate errors to `"Failed to create order"`.

**Required change:** Replace the blanket sanitization with an allow-list of safe client-facing messages produced by `createOrder()` / `splitAndCreateOrders()`:

- `Bar item not found: <id>` (strip the raw UUID → `"Bar item not found"`)
- `Menu item not found: <id>`
- `Invalid price for item: <name>` / `Invalid price for bar item: <name>`
- `Size "<X>" not found for item: <name>`
- `Invalid total`
- `Duplicate submission detected — please wait`
- `First order created (<ref>) but second failed: <reason>` (split partial failure — keep, it's already informative)

Anything else → log full message server-side (already done via `console.error`), return `"Failed to create order"`.

**Acceptance:**
- A deliberate bad `menu_item_id` returns the real error message, not `"Failed to create order"`.
- A deliberate bad `bar_item_id` returns the real error message.
- Server logs still contain the full error + stack.
- All existing order tests still pass.

### 1.2 Station-split for food-menu bar items (Bug #14)

**Files:** `src/lib/pos/orderService.ts` (`enrichItems`, `getBarItemsByIds`), `src/lib/pos/types.ts`

**Current behavior:** `enrichItems()` routes any item with `station: "bar"` into `getBarItemsByIds()` (queried against `bar_items`). Food-menu items (`menu_items_supabase`) with `station: "bar"` are NOT in `bar_items` — their UUID is a `menu_items_supabase` UUID. The lookup fails → `"Bar item not found: <uuid>"`.

**Fix design:**
1. In `enrichItems()`, an item with `station:"bar"` AND no `bar_item_id` should be resolved against `menu_items_supabase` (the food-menu lookup, like a kitchen item), then assigned `station: "bar"` in the enriched output so the order is still routed/dispatched to the bar station.
2. An item with `station:"bar"` AND a real `bar_item_id` keeps the existing `bar_items` path (authentic bar menu items, purchasing sizes single/bottle/glass/shot).
3. If the item has `station:"bar"` but `menu_item_id` and the menu lookup ALSO fails, return `"Menu item not found: <id>"` (not `"Bar item not found"`).

**Acceptance:**
- Mixed-station order: `[{menu_item_id:"<food-menu-bar-uuid>", station:"bar"}, {menu_item_id:"<kitchen-uuid>"}]` → creates TWO orders (bar + kitchen), both succeed.
- Pure bar-order with `bar_item_id` still resolves the `bar_items` path.
- A real `"Bar item not found"` error still surfaces when the item truly doesn't exist anywhere.
- TypeScript strict clean, vitest green.

### 1.3 Add regression tests

- Test: food-menu item with `station:"bar"` + kitchen item → split creates both orders (mock DB).
- Test: error surfacing — a bad UUID returns the specific message from the route.
- Test: authentic `bar_item_id` still uses bar pricing path.

---

## TASK 2 — DEPLOY BACKGROUND WORKER (Critical, operational)

### Problem
Booking submit queues `pdf_generation` jobs into `background_jobs` (verified working: `b6b13b91` completed in local test). No worker runs anywhere in production — all queued jobs stay `pending` forever. Customers never get quotation PDFs/emails.

### Steps
1. Read `oracle-runbook.md` (root) for the deployment playbook.
2. Deploy worker to Railway/Fly/Render: start command `node dist/jobs/index.js`, build `npm run build:worker`.
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HOSTNAME`, `RESEND_API_KEY`, notification emails.
4. Verify live: create a test booking → confirm a job transitions `pending → processing → completed` in `< 10s`; confirm PDF + email generated.
5. (Recommended) Add a lightweight health-check endpoint on the worker (readiness probe) so the host restarts it if unhealthy.

### Acceptance
- `GET /api/background-jobs/stats` shows jobs completing in production.
- New bookings deliver PDF + email within ~30s.
- Scheduler reclaims any stuck `processing` job within 60-90s.

---

## TASK 3 — SIDEBAR HIERARCHY PASS (High)

### Goal
Align the admin sidebar to the manager-first model + fix any orphaned links from the operations restructure.

### Review items
- Verify every nav link in `src/components/admin/Sidebar.tsx` resolves to an existing page (grep for 404s during a manual click-through).
- Operations sub-groups: Open / Inventory / Purchasing / Production / Records / Reports / Settings.
- Move "Notifications" badge-URL to the new `/admin/operations/records/notifications` if the href is stale.
- Add deprecated-link redirects in `next.config.js` where a path changed.

### Acceptance
- No 404s when clicking every sidebar item.
- Sidebar groups match the blueprint in §5.1.

---

## TASK 4 — MENU INTEGRATION HARDENING (High)

### Goal
Fix data drift between `bar_items`, `menu_items_supabase`, and `inventory_products`, and make the menu-integration UI robust to the station-split issue (Task 1.2).

### Items
1. **Reconcile `station` on food-menu items** — audit which `menu_items_supabase` rows have `station:"bar"`; confirm they consistently link to an inventory product so the bar can deduct stock on consumption (`order-items` sync).
2. **Bulk backfill `bar_item_id`** — where a food-menu item with `station:"bar"` ALSO has a matching `bar_items` entry by name, backfill the `bar_item_id` on the client side so pricing uses the authoritative bar price. (Optional enhancement; Task 1.2 fix makes this unnecessary for ordering to work.)
3. **Validation UX** — when linking a menu item to an inventory product, warn if the product has `inventory_type` BEVERAGE but the menu item is `station:"kitchen"` (and vice versa).

### Acceptance
- All food-menu `station:"bar"` items produce working bar orders (with Task 1.2).
- Autolink/batch-link flows still pass their existing tests.

---

## TASK 5 — IMPORT UX / DATA QUALITY (Medium)

### Goal (from Known Bug #16)
The Excel import matched only 2/429 rows on a real stock sheet, producing 437 errors with no guidance.

### Items
1. **Improve match diagnostics** — when `unknownCount > 0`, show the top ~10 unknown row names and a hint ("Add these products first, or fix the product name match").
2. **Enable `importMode: 'delivery'` vs `'reconcile'` clarity** — clarify in the UI that delivery imports create purchase ledger transactions, reconcile imports create `physical_count` adjustments.
3. **Column header auto-detection** — if the template headers don't match, show exactly which columns were expected vs found.

### Acceptance
- A fresh import with mismatched names produces an actionable error list, not an opaque 437.
- No engine changes (ledger stays the source of truth).

---

## TASK 6 — PAGINATION & RETENTION (Medium)

### Items
1. `GET /api/supabase/orders` already supports `limit/offset`; ensure the admin orders page actually pages (or caps at ~500 with a "load more").
2. Add a retention policy for `order_events` (archive/delete > 90 days) — a scheduled SQL function or the background worker.
3. Confirm `contact_messages` and `bookings` lists have pagination.

### Acceptance
- Orders API stays fast past 10k rows.
- `order_events` stops growing unbounded.

---

## TASK 7 — SECURITY HARDENING (High)

### Items (from Known Bugs #10, #11 + blueprint §6)
1. **Login rate limiting on `/api/admin/auth`** — 5 attempts/IP/minute with incremental backoff. (Currently NO rate limiting — brute-forceable.)
2. **Authenticated waiter order endpoint** — validate `waiter_name` against a live staff session, or reject mismatched waiter names on the existing `/api/supabase/orders`.
3. **CMS upload folder whitelist** — close path-traversal (`../`) in `/api/cms/upload`.
4. **Move filesystem uploads to Supabase Storage** — gallery/CMS uploads currently write to Vercel's ephemeral filesystem (lost on redeploy/scale-to-zero).

### Acceptance
- Brute-force test: 6 rapid bad logins → 429.
- Path traversal attempt on CMS upload → 400.
- Uploads survive a redeploy.

---

## VERIFICATION GATE (every task)

```powershell
npx tsc --noEmit -p src/inventory/tsconfig.json   # strict inventory type-check (~30s)
npx vitest run                                     # 61+ tests
npm run build                                       # ~2.6 min (Vercel gate)
```

Then: `git add -A`, commit with a message, push. Never write to sibling typo folders. Apply SQL migrations via `npx -y supabase@2.111.0 migration repair --status applied VER` when schema changes ship.

---

*End of Modular Implementation Task List*