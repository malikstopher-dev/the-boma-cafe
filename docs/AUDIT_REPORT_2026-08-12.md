# Supabase Egress & Full System Audit — 2026-08-12

Measured against the **production database** (`lyksqvqtiysjttwpgeyw`) and the live codebase
(`main` @ a6d793/db0c5c7 + this session's fixes). All row counts and storage sizes below were
queried directly from prod with the service-role key on 2026-08-12.

---

## Part 1 — What the actual egress drivers are (measured)

### Production data profile (small today)

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| inventory_transactions (ledger) | **47** | | orders | 48 |
| inventory_products | 18 | | quotes | 16 |
| product_balances | 24 | | bookings | 21 |
| menu_items | 146 (129 http-img, 11 static) | | notification_queue | 32 |
| gallery | **0** | | staff_notifications | 21 |
| background_jobs | 14 | | sheets / sheet_cells | 2 / 3 |

### Storage profile (all buckets, live)

| Bucket | Public? | Files | Total size |
|---|---|---|---|
| boma-images | public | 2 | 0.07 MB |
| staff-media | public | 2 (voice notes) | 0.35 MB |
| quotations | private | 9 (PDFs) | 0.88 MB |

**Conclusion: payload egress is NOT the problem today.** DB transfers and storage transfers
are each well under a megabyte. The Supabase egress meter is being fed by **request volume and
constant connections**, not by big downloads. There is however one **design-time bomb** that
will dominate egress the moment the ledger grows (see #1).

### Ranked egress contributors

1. **`src/inventory/engine/stock-sheet.ts` — 3 unbounded ledger scans per request (HIGH, design bomb)**
   - `rangeQuery` (up to 10,000 rows), `beforeQuery` (up to 10,000 rows, **no date floor** —
     re-downloads the product's entire lifetime movement on every call), `latestCosts`
     (up to 2,000 rows).
   - `/inv/stock` (`src/app/inv/stock/page.tsx:253-260`) calls this route **TWICE** (main +
     store) on every mount **and every week/tab/year switch** — so a single grid render =
     up to **6 ledger scans** (44,000-row worst case).
   - Today ledger = 47 rows so this is ~350 bytes; at scale (100k txns, a few months of
     minute-by-minute entries) this becomes the entire egress bill. It also **silently
     truncates** at the 10k caps, making the numbers wrong before it's ever big.

2. **Client Realtime sockets — table-level broadcast (MED-HIGH)**
   - `ChatWindow.tsx:124-136`, `MessageNotifications.tsx:129-136`, `StationDisplay.tsx:210-227`,
     `Sidebar.tsx:246-253` each hold a long-lived WebSocket (anon-key) with `postgres_changes`.
   - `Sidebar`'s channel subscribes to **all** `staff_messages` inserts (no filter) on every
     admin tab; `MessageNotifications` uses `incoming-{userId}` per tab. Every staff table
     insert is broadcast to every open tab — realtime egress is per-message × per-connection.

3. **Polling loops (MED)** — every browser tab that stays open makes DB-miss → API → DB round
   trips at fixed intervals:
   - StationDisplay / ChatWindow 15–30s fallback polls; waiter page 30s; trace-order;
     dashboard 60s; operations dashboard **300s** (biggest single payload); notifications 60s;
     background-jobs admin 60s; Sidebar unread badge 60s.
   - Each poll response is small (48 orders) but the *rate* compounds with open tabs (cafe
     computers + kiosks + phones).

4. **Background worker poll loop (LOW bytes, constant rate)** — Oracle VM polls
   `background_jobs` every 15s + scheduler every 30s (`src/jobs/worker.ts:7-8`): ~7,700
   requests/day, byte-tiny, but it is the largest single source of *request count* to the
   REST API.

5. **PDF signed-URL downloads (LOW)** — 9 PDFs totaling 0.88 MB; each admin "View PDF" and
   customer view streams through Supabase Storage (egress per byte). Will matter only if
   hundreds of quote views per day.

6. **Public menu (LOW)** — cached (`revalidate = 60`, `src/app/api/menu/public/route.ts:4`);
   146 items; images are mostly external http URLs, so storage CDN is not involved.

### Egress recommendations (priority order)

- **R1 — Kill the stock-sheet scan bomb.** Aggregate in SQL instead of downloading rows:
  ```sql
  select product_id, sum(quantity) from inventory_transactions
  where created_at < $start [and location_id = $loc]
  group by product_id
  ```
  (same for the range bucket sums). PostgREST supports `select("product_id,sum:quantity...")`
  style aggregation or a small `RPC`. Result: opening balance + movement become a handful of
  aggregated rows regardless of ledger size.
- **R2 — Filter the realtime subscriptions.** `Sidebar` unread channel should filter
  `recipient_id=eq.currentUser` (like the chat one does); note current user model is
  role-based (`'admin'`) so at minimum add the RLS/recipient filter to stop table-wide
  broadcast to every tab.
- **R3 — Coalesce admin pollers.** operations dashboard (300s) is the heaviest single
  payload; reduce to 1 route already combined — it is combined — and leave it; consider
  bumping Sidebar unread poll to 120s.
- **R4 — Leave worker loop as-is** (correctness beats bytes; 15s is needed) but ensure the
  VM is the only poller (confirmed: only one PM2 instance).
- **R5 (later)** — if quote views grow, serve PDFs from a small Vercel proxy with blob
  caching to take load off Supabase Storage egress.

---

## Part 2 — Full-system correctness audit (sweep of all inventory + booking surfaces)

### Bugs found & FIXED this session (all reproduced/verified against prod)

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | **Critical (prod)** | `saveCountItem()` `upsert` without `onConflict` → PostgREST targeted the PK, so **re-saving** an already-counted product in stock counts **and** daily stock threw `duplicate key ... inventory_stock_count_items_stock_count_id_product_id_key` → "Save failed" (verified live on session `e3701bdd…`, which is in_progress with 4 items) | `stock-counts.ts:97` — added `{ onConflict: 'stock_count_id,product_id' }` |
| 2 | **High (prod)** | `/inv/stock` COUNTED cell posts `{product_id, counted_units}` but `daily-stock/[sessionId]` route (zod) requires `{productId, counted}` → every count 400'd and the cell snapped back to zero | `inv/stock/page.tsx:480` — corrected payload keys |
| 3 | **Medium (prod)** | products PATCH with **only** `uom_id` (UNIT cell on existing product) swapped the UOM link in DB then returned 400 "No valid fields to update" | `products/[id]/route.ts:111` — return updated product when uom-only change |

Verification: inventory strict tsc clean, temp strict UI check clean, **62/62 vitest**,
no remnants. (Session also carried the earlier applied fixes: admin-dashboard envelope
`json.data ?? json` + products route `select('*')` on DELETE chain.)

### Known-good (audited, no action)

- **Ledger discipline**: all mutations via `createTransaction()`/`saveCountItem()`; no
  direct `inventory_transactions` inserts (verified by grep across `src/inventory/`).
- **Public menu caching**, **middleware protection** of `/api/:path*` + `/admin/:path*`,
  admin role checks on admin APIs and `supa-image` proxy.
- **Payload envelopes**: all inventory routes use `{ data }` / `{ error }` consistently;
  daily-stock page reads `json.data ?? json` (fix from `db0c5c7`).
- **Worker pipeline**: job lock/heartbeat/scheduler/backoff verified sound (9.7/10 subsystem);
  Oracle VM is the single running worker, no duplicate pollers.

### Pre-existing / out-of-scope (unchanged)

- `npm run lint` broken (next lint "Invalid project directory"), eslint flat-config hang —
  pre-existing, not introduced by this work.
- `inventory_count_profiles` empty → daily stock sheet uses "All Products" fallback
  (by design until profiles are configured).
- `inventory_daily_snapshots` empty (0 rows) — the R1 aggregation recommendation would
  instead use the ledger directly; snapshots remain a later optimization lever.

---

## Part 3 — Immediate next actions

1. Apply **R1** (stock-sheet SQL aggregation) — biggest forward-looking egress win, ~1h.
2. Apply **R2** (Sidebar unread realtime filter) — ~15m.
3. Re-check the Supabase egress meter after 24h: expected to drop from the worker/poll
   floor; payload should stay sub-1GB/mo at current volumes.