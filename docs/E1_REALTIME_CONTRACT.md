# E1 Realtime Event Contract (E1-1)

Single source of truth for the realtime refresh architecture introduced by Ship E1-1.
Transport is **Supabase Realtime `postgres_changes`** — no new framework, no event bus,
no broadcast channels.

## Why a signal table

All admin/staff browsers connect with the **anon key** (auth is cookie/PIN based — there
is no Supabase Auth session), so RLS decides what `postgres_changes` can deliver:

| Table | RLS for anon | Direct subscription |
|-------|--------------|---------------------|
| `orders` | INSERT only (policy `orders_public_insert`, migration 003) | ✗ blocked |
| `bookings` | INSERT only | ✗ blocked |
| `staff_messages` / `staff_notifications` | policy requires `current_setting('app.staff_user_id')` | ✗ blocked |
| `inventory_*` (039+) | no RLS enabled | ✓ open |

Implication (audit finding, E1-A): the pre-existing browser subscriptions to
`orders`/`staff_messages` (StationDisplay, chat, admin orders, waiter board) receive
**no events as anon** — the fallback polls do the work. Later ships will address those
surfaces; E1-1 routes everything through one anon-readable signal table instead.

## The signal table

`public.realtime_events` (migration 080):

| column | type | notes |
|--------|------|-------|
| `id` | bigint identity PK | |
| `event_name` | text | logical event name (contract below) |
| `table_name` | text | source table |
| `entity_id` | uuid | source row id |
| `created_at` | timestamptz | rows pruned >24h by the emitter |

- Payload is **minimal by construction**: no customer data, prices, deposits, admin
  notes, or internal fields ever leave the DB in a realtime payload (E1-5 principle).
- Writes happen only from **SECURITY DEFINER triggers**; `REVOKE ALL` on the table for
  anon/public/authenticated (SELECT only) so events can never be forged by clients and
  public INSERT flows are unaffected.
- Table is added to the `supabase_realtime` publication (idempotent DO block).

## Event contract

| Logical event | Emitted when | Emitter (migration 080) | Consumed by (E1-1) |
|---------------|--------------|-------------------------|--------------------|
| `order.created` | `orders` INSERT | `trg_realtime_order_created` | owner dashboard |
| `order.preparing` | `orders` UPDATE status → `preparing` | `trg_realtime_order_status` | owner dashboard |
| `order.ready` | `orders` UPDATE status → `ready` | `trg_realtime_order_status` | owner dashboard |
| `order.completed` | `orders` UPDATE status → `served`/`completed` | `trg_realtime_order_status` | owner dashboard |
| `order.cancelled` | `orders` UPDATE status → `cancelled` | `trg_realtime_order_status` (added in migration 081, E1-2) | waiter PWA (E1-2) |
| `booking.confirmed` | `bookings` UPDATE status → `confirmed` (manager action, not creation) | `trg_realtime_booking_confirmed` | future (E1-3) |
| `po.received` | `inventory_purchase_orders` UPDATE → `partial`/`received` | `trg_realtime_po_received` | operations dashboard |
| `stock.moved` | `inventory_transactions` INSERT (any ledger movement) | `trg_realtime_stock_moved` | operations dashboard |
| `stock.count.updated` | `inventory_stock_counts` INSERT/UPDATE (create/submit/approve/cancel) | `trg_realtime_stock_count` | operations + owner dashboard |
| `stock.low` | `staff_notifications` INSERT with type `inventory_low_stock`/`inventory_out_of_stock` | `trg_realtime_stock_low` | notifications page + sidebar badge |

## Hook

`src/inventory/lib/use-realtime-refresh.ts` — one channel per page
(`e1-ops-dashboard`, `e1-owner-dashboard`, `e1-sidebar-inventory`, `e1-notifications`),
single `postgres_changes` binding filtered `event_name=in.(...)`, leading-edge debounce
(≈2s coalescing window, first event of a burst fires immediately ⇒ <1s propagation),
cleanup removes the channel and cancels pending timers, module-level guard prevents
duplicate channel registration. Existing 300s visibility-gated polls are untouched
(no polling regression — they remain as fallback if realtime is unavailable).

## E1-5 product rule (recorded for E1-3 — Booking → Waiter Operational Feed)

Waiter visibility is gated on **manager confirmation**, never booking creation:

| Booking status | Waiter visibility |
|----------------|-------------------|
| Pending | Hidden |
| Confirmed | Visible |
| Cancelled | Removed |
| Completed | Historical (optional) |

Waiter-visible fields only: booking date, arrival time, guest count, area/table,
operational service notes, booking reference (optional). **Never sent to waiter
clients:** customer name, phone, email, price, deposit, payment status, internal
admin notes. Enforcement is at the endpoint/payload level — the realtime payload
must only contain approved fields; front-end hiding is never relied on.
`realtime_events` already complies (minimal payloads); E1-3 must apply the same
principle when it exposes booking data to staff devices.

## Latency expectations

- Realtime delivery after commit: ~100–500 ms (Supabase infra).
- Debounce: first event of a burst → immediate refetch (no waiting).
- Combined-dashboard refetch (1 RPC): ~100–300 ms.
- End-to-end worst case for a burst: ≈2 s (trailing catch-up). Single event: <1 s.

## Verification checklist (post-deploy, at E1-1 verification)

1. `supabase db push` applies migration 080; `realtime_events` in
   `pg_publication_tables` for `supabase_realtime`.
2. Open ops dashboard + notifications in one browser, owner dashboard in another;
   record a waste/PO receive/stock count movement → both update <1 s.
3. Sidebar badge increments on a new `stock.low` event without touching the page.
4. Devtools network: no duplicate subscription frames per page (one `realtime_events`
   channel each; sidebar adds its own).
5. Poll fallback intact: stop the realtime connection (airplane mode) → 300s polls
   still refresh; reconnect → realtime resumes.
6. Regression: kitchen/bar boards, waiter flows, chat unchanged (no code touched).
7. Rollback if broken: drop migration 080 objects; pages keep working via polls.

## Waiter consumer (E1-2)

`src/inventory/lib/order-status.ts` — payload-carrying sibling of the admin hook
(subscriptions on the same signal table / transport / unquoted filter). The waiter PWA
needs the payload to apply status changes immediately:

- `/waiter` Done screen (`e1-waiter-done`): every order status event applies the new
  status to the tracked order refs instantly (badge flips without waiting for the
  fetch), then a debounced refetch rebuilds the authoritative map + cancel cards.
  The old 30s cancel-only poll is no longer primary; a visibility-gated 300s poll
  remains as the conservative fallback when realtime is unavailable.
- `/staff/waiter/orders` (`e1-waiter-active-orders`): replaced the dead
  `postgres_changes` channel on `orders` (anon + RLS → no delivery) with the signal
  table; every `order.preparing/ready/completed/cancelled` event triggers a silent
  refetch. Manual Refresh + mount load remain as fallback.

`event_to_status` mapping: `order.preparing → preparing`, `order.ready → ready`,
`order.completed → served` (contract emits `order.completed` for both `served` and
`completed`; the refetch carries the authoritative status), `order.cancelled → cancelled`.

## Files

- `supabase/migrations/080_realtime_events.sql` — table, policies, grants, publication, emitters, triggers
- `supabase/migrations/081_order_cancelled_event.sql` — `order.cancelled` emitter case (E1-2)
- `src/inventory/lib/use-realtime-refresh.ts` — the hook
- `src/inventory/lib/order-status.ts` — waiter live-status subscription + pure helpers (E1-2)
- `src/inventory/lib/realtime-debounce.ts` — leading-edge debouncer (pure, tested)
- `src/app/admin/operations/dashboard/page.tsx`, `src/app/admin/dashboard/page.tsx`,
  `src/components/admin/Sidebar.tsx`, `src/app/admin/operations/notifications/page.tsx` — consumers
- `src/app/waiter/page.tsx`, `src/app/staff/waiter/orders/page.tsx` — waiter consumers (E1-2)
- `src/inventory/__tests__/realtime-debounce.test.ts` — debounce behavior tests
- `src/inventory/__tests__/order-status.test.ts` — E1-2 waiter live-status tests