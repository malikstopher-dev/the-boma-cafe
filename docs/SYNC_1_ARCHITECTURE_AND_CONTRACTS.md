# SYNC-1 Architecture and Synchronization Contracts

Status: SYNC-1A/1B documentation and SYNC-1C shared foundation complete on 2026-08-19. No later checkpoint is active.

## 1. Purpose

This document maps the current synchronization architecture and defines the contract for making Admin, Owner, Waiter, Kitchen, Bar, Orders, Bookings, Inventory, suppliers, and dashboards converge on committed database state.

This is a design and audit artifact. It does not authorize code changes, migrations, production queries, deployment, or production mutation.

Evidence classes used below:

| Class | Meaning |
|---|---|
| Code-traced | Verified from current source and tracked migrations |
| Locally measured | Verified by existing local tests/builds or recorded local measurements |
| Live measured | Previously verified against production and recorded in the mission history |
| Live verification required | Migration-derived or code-derived conclusion that must be checked against the production catalog/configuration before implementation |

## 2. Non-Negotiable Model

The required end-to-end contract is:

```text
authorized mutation
  -> one authoritative server/database transaction
  -> authoritative tables committed
  -> required audit and derived state committed
  -> scoped invalidation signal emitted
  -> affected clients reconcile from authorized APIs
  -> conservative visibility/reconnect safety reconciliation
```

Rules:

1. The database is authoritative. Browser state, realtime payloads, caches, dashboards, and background-job state are not substitutes for authoritative rows.
2. Realtime is an invalidation transport. It must not carry or become the authoritative business object.
3. A client must converge after a missed, delayed, duplicated, or out-of-order event.
4. A mutation route using a service-role client must enforce explicit authorization itself. Middleware authentication alone is insufficient.
5. A business mutation, its required audit, its correctness-critical derived state, and its invalidation signal must commit consistently.
6. A fallback may not silently replace an atomic path with a weaker non-atomic path after an arbitrary RPC failure.
7. Existing U1-B public menu DTO and image protections are frozen and must survive later synchronization work.

## 3. Authoritative-State Matrix

| Domain | Authoritative state | Derived/supporting state | Audit/history | Signal | Main readers |
|---|---|---|---|---|---|
| Orders | `orders` | `order_items`, `background_jobs` | `order_events` | `realtime_events` order events | Kitchen, Bar, Waiter, Admin Orders, Admin dashboard |
| Order stock consumption | `inventory_transactions` | `inventory_product_balances`, `order_items.transaction_id/deducted_at` | `inventory_audit_log` | `stock.moved` | Inventory and owner/operations dashboards |
| Bookings | `bookings`, `quotes`, `quote_items`, `payments` | `availability`, `inventory_reservations`, `waiter_booking_view` | `booking_status_history`, `admin_audit_log` | `realtime_events` booking events | Admin Bookings, Waiter booking feed |
| Food menu | `menu_categories`, `menu_items` | Public DTO caches, migrated static image files | No complete mutation audit | No menu signal | Homepage, public menu, waiter, CMS |
| Bar menu | `bar_categories`, `bar_items` | `bar_item_inventory_links`, `bar_product_config`, `bar_items.has_inventory` | Partial inventory audit only | No menu signal | Bar menu, waiter, menu integration |
| Inventory catalog | `inventory_products`, product UOM/category/supplier links | Search/list DTOs | `inventory_audit_log` | No general catalog signal | Products, imports, menu links, stock sheets |
| Inventory quantity | `inventory_transactions` ledger sum | `inventory_product_balances` display cache | `inventory_audit_log` | `stock.moved` | Products, reports, forecast, reorder, dashboards |
| Purchase workflow | Purchase orders/items and receipts/items | Supplier invoices, price history, balance cache | Inventory/admin audit where explicitly written | `po.received`, `stock.moved` | PO pages, receiving, payables, dashboards |
| Supplier payables | Supplier invoices and payments | Derived payable totals/status | Partial admin/inventory audit | No supplier/payment signal | Payables, reports, owner dashboard |
| Owner dashboard | No dashboard authority; calculated from ledger, cache, invoices, payments, snapshots | Browser state | Separate management-activity request | No canonical-owner subscription | `/dashboard`, `/inv` |
| Operations dashboard | `combined_dashboard()` calculation or TypeScript fallback | `inventory_dashboard_cache` is currently not the read source | None | Inventory signals | `/admin/operations/dashboard` |

There is no tracked `inventory_logs` table, view, type, or route. The relevant sources are `inventory_transactions`, `inventory_audit_log`, `admin_audit_log`, and `realtime_events`.

## 4. Current Dependency Maps

### 4.1 Orders, Kitchen, Bar, Waiter, and Admin

```text
public/waiter cart
  -> POST /api/supabase/orders
  -> validateOrderRequest()
  -> orderService creates one order or sequential kitchen/bar split rows
  -> orders INSERT trigger emits order.created
  -> Kitchen/Bar/Admin/Waiter consumers refetch

status action
  -> PATCH /api/supabase/orders
  -> application state machine + compare-and-set status update
  -> orders UPDATE trigger emits mapped order event
  -> order_events best-effort write
  -> on completed: enqueue_background_job(order_deduction)
  -> Oracle worker polls background_jobs
  -> order-deduction handler
  -> syncOrderItems()
  -> deduct_order_items() RPC, with engine fallback
  -> inventory_transactions + audit + balance cache
  -> stock.moved
  -> inventory/dashboard reconciliation
```

Key files:

| Responsibility | File |
|---|---|
| Main order API | `src/app/api/supabase/orders/route.ts` |
| Pricing and split persistence | `src/lib/pos/orderService.ts` |
| Transition rules | `src/lib/order-state-machine.ts` |
| Kitchen/Bar board | `src/components/StationDisplay.tsx` |
| Admin orders | `src/app/admin/orders/page.tsx` |
| Waiter order surfaces | `src/app/waiter/page.tsx`, `src/app/staff/waiter/orders/page.tsx` |
| Signal mapping | `supabase/migrations/080_realtime_events.sql`, `081_order_cancelled_event.sql` |
| Queue RPC | `supabase/migrations/092_order_deduction_job.sql` |
| Worker handler | `src/jobs/handlers/order-deduction.ts` |
| Normalization/deduction engine | `src/inventory/engine/order-items.ts` |
| Atomic deduction RPC | `supabase/migrations/091_order_attribution_columns.sql` |

Current correctness gaps:

| Severity | Finding |
|---|---|
| Critical | Order completion commits before the deduction job is enqueued. Enqueue failure is logged and still returns success; terminal completion cannot naturally replay the transition. |
| High | Mixed Kitchen/Bar order creation is two sequential inserts, not one transaction. |
| High | Split siblings are asymmetric: only the child points to the root, while sibling readers require/return the wrong side of the relationship. |
| High | Customer cancellation uses a separate direct writer without the main status compare-and-set guard. |
| High | Station assignment is accepted from the client instead of being derived authoritatively from menu/category data. |
| High | Online Bar tickets expose a UI action whose transition is not allowed for the Bar role by the state machine. |
| High | Deduction defaults every order to the first active inventory location; there is no station-to-location contract. |
| High | Different orders can concurrently pass ledger balance checks for the same product/location because the deduction RPC does not serialize that balance decision. |
| Medium | `order_events` is best-effort and incomplete; non-status mutations and real actor identities are generally absent. |
| Medium | Confirmed, packing, and rejected states have no realtime event; some screens depend on polling to observe them. |
| Medium | `order_items` uniqueness by `(order_id,item_name)` can collapse same-name variants/add-ons. |

### 4.2 Inventory, Suppliers, and Purchase Orders

```text
authorized inventory mutation
  -> one of four ledger writers
  -> inventory_transactions
  -> inventory_audit_log
  -> inventory_product_balances
  -> stock.moved
  -> products/reports/forecast/reorder/dashboard reconciliation
```

Current direct ledger writers:

| Writer | Primary path | Fallback |
|---|---|---|
| Central movement writer | `src/inventory/engine/ledger.ts:createTransaction()` | None |
| PO receipt | `receive_purchase_order()` in migration 098 | `src/inventory/engine/purchase-orders.ts:receiveItems()` |
| Import apply | `apply_import_batch()` in migration 075 | `src/inventory/import/ImportExecutor.ts` |
| Completed-order deduction | `deduct_order_items()` in migration 091 | `src/inventory/engine/order-items.ts` |

Balance contract today:

| Purpose | Source |
|---|---|
| Stock validation | Ledger sum |
| Display balance | `inventory_product_balances` through `inventory_get_balance()`, ledger fallback on RPC error |
| Cache rebuild after `createTransaction()` | Ledger sum, written after ledger commit |
| Products/forecast/reorder/notifications/gas | Predominantly balance cache |
| Reports/reconciliation/stock sheet | Predominantly ledger aggregates |

Current correctness gaps:

| Severity | Finding |
|---|---|
| Critical | `/api/inventory/*` requires only some authenticated role in middleware. Most inventory handlers then use the service-role client without route-level RBAC, so Kitchen/Bar/Waiter credentials can potentially call supplier, PO, payment, approval, destructive, and ledger mutation endpoints. |
| High | `createTransaction()` performs ledger insert, audit write, cache refresh, and signal-related effects across separate requests. Audit/cache failures can leave incomplete derived state. |
| High | `stock.moved` fires on ledger insert before the TypeScript writer refreshes the balance cache. A cache-backed refetch can race and retain stale data. |
| High | RPC callers fall back on any RPC error, not only a verified missing-function compatibility error. Unknown/network/business failures can silently downgrade atomic operations to non-atomic engines. |
| High | Central stock validation is check-then-insert without a product/location lock. Concurrent decreases can overdraw. |
| High | PO engine fallback can leave receipt, receipt-items, ledger, invoice, and PO status partially synchronized. |
| High | Supplier payment is a multi-request read-sum/insert/update flow without request idempotency or a transaction lock. |
| High | Raw/service-role ledger inserts can bypass the balance cache because cache parity is conventional, not trigger-enforced. |
| Medium | `inventory_daily_snapshots` has readers but no tracked application writer. `inventory_dashboard_cache` has a writer but is not the current dashboard read source. |
| Medium | Supplier and PO mutation audit coverage is incomplete, and unsupported inventory audit action values can be silently rejected by the database constraint. |

### 4.3 Bookings and Availability

```text
public booking submit
  -> customer
  -> booking draft
  -> quote + quote items
  -> booking quote_sent
  -> tentative availability
  -> booking status history
  -> PDF/email background job

admin booking transition
  -> PATCH /api/booking/status
  -> application transition map + compare-and-set booking status
  -> confirmed: create reservations
  -> cancelled/refunded: release availability + cancel reservations
  -> completed: consume reservations into SALE ledger rows
  -> booking/admin audit
  -> booking status trigger
  -> waiter feed reconciliation
```

Key files:

| Responsibility | File |
|---|---|
| Submission | `src/app/api/booking/submit/route.ts` |
| Canonical transition API | `src/app/api/booking/status/route.ts` |
| Transition map | `src/lib/booking/validation.ts` |
| Legacy generic API | `src/app/api/supabase/bookings/route.ts` |
| Availability | `src/lib/booking/availability.ts` |
| Reservation engine | `src/inventory/engine/reservations.ts` |
| Waiter signal/view | `supabase/migrations/082_booking_lifecycle_events_waiter_view.sql` |

Current correctness gaps:

| Severity | Finding |
|---|---|
| Critical | `PATCH /api/booking/status` is outside the current middleware matcher, while `requireAdmin()` trusts `x-user-role` before cookie validation. A client-supplied internal header may satisfy the route unless the hosting edge strips it. This is code-derived and requires live verification. |
| High | `/api/supabase/bookings` is a second mutation authority that can change status without transition validation, availability hooks, reservation hooks, or audit parity. |
| High | Booking status commits before reservation/availability hooks; hook failures are swallowed. `completed` does not guarantee inventory consumption. |
| High | Availability release writes `status='cancelled'`, but the tracked availability CHECK permits only `booked`, `blocked`, and `tentative`. |
| High | Submission performs no final server-side availability lock/check and the schema has no overlap exclusion; concurrent requests can create overlapping holds. |
| High | Quote acceptance updates quote, booking, and history with unchecked multi-request results and bypasses the transition map. |
| Medium | Confirmation does not convert tentative availability to booked. Hard deletion can leave an orphan tentative hold. |
| Medium | Legacy public booking POST uses obsolete `pending`, which is absent from the tracked booking status CHECK. |
| Medium | Admin Bookings fetches on mount only; changes from customers or another admin can remain stale. |

### 4.4 Menu and Inventory Products

```text
CMS mutation
  -> menu_categories/menu_items or bar_categories/bar_items
  -> page-path revalidation only
  -> public DTO cache expires/regenerates
  -> open clients do not automatically reconcile

completed order
  -> parse items_json
  -> resolve product/link/recipe using current names/configuration
  -> order_items
  -> inventory deduction
```

Current local U1-B public menu contract:

| Consumer | Route | Payload |
|---|---|---|
| Full menu | `/api/menu/public` | Explicit full-menu DTO, safe image references, categories |
| Homepage | `/api/menu/public/homepage` | Four featured items only |
| Waiter | `/api/menu/public/waiter` | Seven required item fields, no image payload |

U1-B constraints:

1. Metadata projections must never select inline image data.
2. Unknown data URIs must fail closed to `null`.
3. Final responses must retain the recursive data-URI guard.
4. The six optimized static files and rollback manifest must not be changed without U1 approval.
5. Public route caches remain 60 seconds with `stale-while-revalidate=300` until a separately approved cache contract change.

Current correctness gaps:

| Severity | Finding |
|---|---|
| High | Food-menu deduction is name-based at completion. Original menu IDs are discarded by normalization, so a rename/configuration change can change or prevent deduction. |
| High | Bar links are modeled M:N, but deduction uses only the first link. Link-table and `has_inventory` flag updates are separate writes. |
| High | Menu/product/link/recipe configuration is resolved at completion rather than snapshotted at order creation. |
| High | Authenticated `/api/cms/menu` still uses `menu_items.select('*')` and transfers the six production data URIs until the separately approved U1 row migration. |
| Medium | CMS mutations revalidate page paths, not the three public API cache keys/tags. Open clients never refetch automatically. |
| Medium | The homepage fetches the new featured DTO but the visible signature dishes are still hard-coded. |
| Medium | A stored Supabase storage path can be returned unchanged by `resolvePublicMenuImage()`, even though public rendering may require a resolved URL/proxy path. |

### 4.5 Dashboards and Statistics

| Surface | Main authority | Automatic refresh |
|---|---|---|
| Canonical Owner `/dashboard` | `getOwnerDashboard()` plus separate admin audit API | Two unconditional 60-second timers; no realtime |
| Legacy Owner `/inv` | Same owner-dashboard API, sometimes twice per load | Manual refresh only |
| Operations dashboard | `combined_dashboard()` RPC, arbitrary-error TypeScript fallback | Realtime invalidation + visible 300-second poll |
| Operations landing | Checklist, reconciliation, combined dashboard | Mount only |
| Admin dashboard | Browser calculations over orders plus CMS and stock-count requests | Partial realtime event set; no timed fallback |

Live measured baseline:

| Measurement | Result |
|---|---|
| One `getOwnerDashboard('this_week')` execution | 101 Supabase requests, 69,184 response-body bytes, 34.7 seconds |
| Canonical owner refresh | Every 60 seconds plus separate 60-second audit refresh, not visibility-gated |
| Kitchen/Bar/Admin Orders/Open Chat fallback | Full REST refetch every 30 seconds when subscribed and 15 seconds otherwise |

Duplicate calculations:

| Concept | Duplicate implementations |
|---|---|
| Owner movement buckets | Three loops inside `owner-dashboard.ts`, plus independent weekly and stock-sheet classification sets |
| Operations combined data | SQL `combined_dashboard()` and TypeScript `dashboard.ts` fallback |
| Inventory value | Owner current value, owner boards, operations SQL, operations TypeScript, valuation report |
| Order KPIs | Browser calculations in Admin dashboard separate from order/report engines |
| Owner presentation | Separate DTO mappings and controls in `/dashboard` and `/inv` |

Current consistency gaps:

| Severity | Finding |
|---|---|
| High | One dashboard response can mix balance-cache counters with ledger alerts and differently scoped/location-valued calculations. |
| High | Operations inventory-type tabs do not filter inventory value in either SQL or fallback path. |
| High | Operations summary today counts are all-location while the displayed transaction list is location-scoped. |
| High | Owner KPIs/stock value are global, but alert resolution and displayed location can be default-location scoped. |
| High | SQL and TypeScript fallback semantics can drift; any RPC error silently changes the calculation implementation. |
| Medium | Previous owner stock value reads one snapshot row instead of aggregating all product/location snapshots. |
| Medium | Admin order metrics use a 500-row client window, UTC date-prefix grouping, and status/payment semantics that differ from other surfaces. |

## 5. Cross-Cutting Realtime and Authorization Map

### 5.1 Current realtime transport

```text
authoritative table trigger
  -> SECURITY DEFINER insert into realtime_events
  -> anonymous browser postgres_changes subscription
  -> local event application or authorized API refetch
```

Current wrappers:

| Wrapper | Purpose |
|---|---|
| `src/inventory/lib/use-realtime-refresh.ts` | Generic debounced refetch hook |
| `src/inventory/lib/order-status.ts` | Waiter order payload application plus refetch |
| `src/inventory/lib/chat-events.ts` | Chat invalidation |
| `src/inventory/lib/booking-status.ts` | Waiter booking feed updates |

Current infrastructure gaps:

| Severity | Finding |
|---|---|
| High | `realtime_events` is globally readable by anonymous clients and exposes all event names, source tables, entity IDs, and timing without station/location/user scope. |
| High | Consumers discard the monotonic event ID. There is no cursor, catch-up query, reconnect reconciliation, or out-of-order version protection. |
| High | `createBrowserClient()` creates a new Supabase client per wrapper, allowing multiple sockets per page/window. |
| High | Source tables remain in the realtime publication even though current browsers use the signal table. Migration-derived anonymous SELECT policies for orders/messages conflict with `docs/E1_REALTIME_CONTRACT.md`; production grants/RLS require live verification. |
| Medium | Duplicate suppression is module-local channel-name suppression, not event-ID deduplication. |
| Medium | Some subscription health values are non-reactive local booleans. |
| Medium | Retention is prune-on-next-write, not a scheduled 24-hour guarantee. |

### 5.2 Polling map

| Surface | Poll | Visibility-aware |
|---|---:|---:|
| Kitchen/Bar station board | 30s subscribed, 15s disconnected | No |
| Admin Orders | 30s subscribed, 15s disconnected | No |
| Open Chat | 30s subscribed, 15s disconnected | No |
| Canonical Owner data | 60s | No |
| Canonical Owner activity | 60s | No |
| Operations dashboard | 300s | Yes |
| Operations notifications | 300s | Yes |
| Inventory sidebar badge | 300s | Yes |
| Waiter Done | 300s | Yes |
| Background jobs admin page | 60s, two requests | No |
| Public order tracking | 30s until terminal | No |
| Worker pending jobs | 15s | Server process |
| Worker stuck-job scheduler | 60s | Server process |

### 5.3 Authorization boundary

Current request model:

```text
middleware verifies cookie/session on matched routes
  -> injects x-user-role/x-admin-* headers
  -> route helper trusts headers
  -> handler often uses service-role Supabase client
```

Required precondition before broader synchronization:

1. Never trust externally supplied internal auth headers without a middleware-authenticated marker or direct session validation.
2. Every API route that uses header-based authorization must be in the matcher or validate the cookie/session directly.
3. Every service-role mutation endpoint must enforce an explicit permission, not merely an authenticated top-level role.
4. Inventory permissions must distinguish read, operational movement, configuration, approval, payment, and destructive actions.
5. Kitchen/Bar order mutations must be station-scoped; Waiter mutations must be assignment/ownership-scoped.
6. Protected documents such as quotation PDFs must not be publicly cacheable.
7. Production RLS, grants, publication members, and waiter-view privileges must be verified live before migration design.

## 6. Target Synchronization Contracts

### 6.1 Shared event envelope

The target invalidation record must support catch-up and scope without containing business data:

| Field | Contract |
|---|---|
| `id` | Monotonic cursor |
| `event_name` | Constrained logical event name |
| `entity_type` | Constrained source/domain type |
| `entity_id` | Authoritative row/group ID |
| `entity_version` | Committed version or authoritative `updated_at` token |
| `scope_type` | Station, location, recipient, role, or global management scope |
| `scope_id` | Nullable scope identifier |
| `created_at` | Commit-time timestamp |

No customer PII, message text, pricing, account data, notes, or full row payload belongs in this table.

### 6.2 Shared browser reconciliation contract

Every live surface must:

1. Use one shared browser Supabase client per window.
2. Fetch authoritative initial state and its cursor/version.
3. Subscribe before or alongside initial reconciliation without leaving a race window.
4. On subscription, reconnect, visibility return, network restoration, or channel recovery, fetch events/state after the stored cursor.
5. Deduplicate by event ID.
6. Reject stale local updates by entity version.
7. Coalesce bursts and prevent overlapping refetches.
8. Poll only while realtime is unhealthy, plus a documented slow visible safety interval.
9. Expose degraded/reconnecting state where operational correctness depends on freshness.

### 6.3 Orders contract

1. The server derives station and authoritative item identity.
2. Split rows share a symmetric immutable group ID.
3. Order creation and all split rows commit in one transaction.
4. All status transitions use one server/database transition authority with compare-and-set or row locking.
5. Status, order history, deduction outbox/job, and signal commit together when required.
6. Completion guarantees a durable deduction intent. Deduction remains asynchronous and idempotent.
7. Station-to-inventory-location mapping is explicit.
8. Kitchen, Bar, Waiter, and Admin reads are server-scoped and paginated; clients do not download broad datasets and filter authority locally.

### 6.4 Inventory and purchasing contract

1. `inventory_transactions` remains immutable quantity truth.
2. Every movement is created through one atomic database primitive or transactionally equivalent family sharing the same invariants.
3. Product/location balance validation is serialized against concurrent decreases.
4. Ledger, audit, balance cache, attribution, and signal commit together.
5. Cache rows include a ledger/version freshness marker and have a scheduled parity check/rebuild path.
6. Atomic RPC failures are surfaced. Compatibility fallback is allowed only for a verified missing-function state during a bounded rollout.
7. PO receive and supplier payment requests have request-level idempotency keys.
8. Supplier/PO/payment endpoints enforce explicit admin permissions.

### 6.5 Bookings contract

1. One transition authority owns all booking status changes.
2. Quote acceptance uses that authority rather than writing status independently.
3. Status, availability, reservation changes, history, admin audit, and signal commit consistently.
4. Submission performs a final server-side conflict check under a database lock/exclusion strategy.
5. Availability uses a valid state machine with no orphan active holds.
6. Waiter reads remain through a minimal server-side DTO/view with no PII.
7. Booking inventory consumption failures remain durably retryable and visible, not swallowed.

### 6.6 Menu/products contract

1. Public DTOs remain explicit and cacheable; authenticated mutation DTOs remain explicit and non-public.
2. Menu mutations invalidate the actual API cache tags and emit a scoped catalog invalidation.
3. Open public/staff clients reconcile on catalog version change without receiving giant payloads over realtime.
4. Order snapshots retain stable menu/bar item IDs and the deduction mapping/version needed at sale time.
5. Bar link and denormalized flag changes commit atomically or the flag is removed as a second authority.
6. Immutable static image paths change when bytes change.

### 6.7 Dashboard contract

1. Each metric has one documented definition, scope, timezone, and source.
2. SQL aggregation is authoritative for expensive multi-table dashboards; no semantically different TypeScript fallback runs on arbitrary errors.
3. One owner-dashboard request is bounded to a small fixed number of database calls and reads one consistent snapshot where practical.
4. Inventory type/location filters apply consistently to every metric in a response.
5. Realtime events invalidate only affected aggregate scopes.
6. Polling is visible, slow, jittered, and used as safety reconciliation rather than the primary transport.

## 7. Implementation Checkpoints

No checkpoint below is active. Each requires explicit owner activation after U1 advances or closes.

### SYNC-1C: Shared foundation

Scope:

1. Close internal-header trust gaps and add explicit permission gates before expanding event-driven behavior.
2. Live-verify final RLS/grants/publication/view privileges.
3. Introduce one browser realtime client and one reconciliation primitive with reactive health, cursor catch-up, visibility/network reconciliation, in-flight control, and event-ID deduplication.
4. Add schema constraints/scope fields only through a new additive migration.
5. Keep current polls as fallback until each consumer passes acceptance.

Exit evidence:

- Header-forgery tests fail closed.
- Staff roles cannot invoke unauthorized inventory mutations.
- A client disconnected across multiple events catches up after reconnect.
- Duplicate/out-of-order events do not regress state.
- One page/window uses one browser realtime connection.

### SYNC-1D: Orders convergence

Scope:

1. Canonical station derivation and station-scoped authorization.
2. Transactional split-order creation with symmetric group identity.
3. Canonical transition/outbox path for status, history, signal, and deduction intent.
4. Correct full status signal set and scoped order reconciliation.
5. Explicit station-to-inventory-location mapping.

Exit evidence:

- Two browsers on Kitchen/Bar/Admin/Waiter converge under concurrent actions.
- Customer cancellation loses a race cleanly with 409 rather than overwriting a later status.
- Completion always has exactly one durable deduction job/intention.
- Split siblings always resolve the complete group.
- An online Bar order can complete its intended workflow.

### SYNC-1E: Inventory and supplier convergence

Scope:

1. Atomic movement primitive and serialized balance validation.
2. Audit/cache/signal commit ordering.
3. Remove arbitrary-error non-atomic fallback behavior.
4. Payment and receipt idempotency.
5. Cache parity monitor/rebuild and explicit freshness version.

Exit evidence:

- Concurrent decreases cannot overdraw.
- Injected failure rolls back ledger/audit/cache together.
- Duplicate receipt/payment requests are idempotent.
- Ledger and cache parity is zero after all mutation paths.
- Admin and Owner reconcile to the same committed quantity/value definitions.

### SYNC-1F: Bookings and menu/products

Scope:

1. One atomic booking transition authority with durable inventory hooks.
2. Server-locked availability conflict prevention and valid availability states.
3. Menu cache-tag invalidation and catalog-version reconciliation.
4. Stable order-time menu/product mapping while preserving all U1-B payload protections.

Exit evidence:

- Concurrent booking submissions cannot reserve the same capacity/time.
- Confirm/cancel/complete updates availability, reservations, audit, waiter feed, and inventory consistently.
- Menu edits appear on intended clients within the SLA without inline image transfer.
- Public/waiter DTO field sets and U1-B byte limits remain unchanged or improve.

### SYNC-1G: Dashboard aggregation and polling reduction

Scope:

1. Freeze one metric dictionary covering movement classifications, value, dates, locations, and inventory types.
2. Replace Owner 101-call fan-out with bounded database aggregation.
3. Remove semantic SQL/TypeScript duplication or make fallback explicitly equivalent and tested.
4. Convert 15/30/60-second full-list polling to realtime-primary, visibility/reconnect refresh, and slow visible safety reconciliation.

Exit evidence:

- Owner request count has a fixed target of no more than five database round trips, preferably one aggregate RPC plus one management-audit request.
- Owner request latency and bytes are remeasured against the U1 baseline.
- Hidden tabs generate zero periodic application reads.
- SQL/API/UI totals agree for the same scope and timestamp.

### SYNC-1H: Multi-client acceptance

Required scenarios:

| Scenario | Required result |
|---|---|
| Duplicate mutation request | One committed business effect |
| Two concurrent status writers | One winner; loser receives conflict and reconciles |
| Realtime disconnect during three updates | Catch-up returns all affected state |
| Duplicate/out-of-order event delivery | No state regression or duplicate side effect |
| Hidden tab for 30 minutes | No background poll traffic; immediate authoritative refresh on return |
| Cache update failure injection | Mutation rolls back or durable repair is queued and surfaced |
| Worker crash after handler effect | Retry is idempotent |
| Kitchen credential calls supplier/payment mutation | Forbidden |
| Waiter requests another station/order scope | Forbidden |
| Menu image row contains data URI | No public or waiter response serializes it |
| Dashboard same-scope comparison | SQL/API/Admin/Owner definitions agree |

## 8. Required Live Verification Before SYNC-1C

These items are not safe to infer from migration files alone:

1. Current production RLS policies and grants on `orders`, `staff_messages`, `bookings`, `realtime_events`, and inventory tables.
2. Current `supabase_realtime` publication membership.
3. Effective privileges and security mode of `waiter_booking_view`.
4. Whether the hosting edge strips externally supplied `x-user-role`, `x-admin-*`, and `x-auth-*` headers.
5. Current rate and source distribution of realtime events and fallback polling after U1-B deployment decisions.
6. Current ledger/cache parity and whether any external scheduler writes daily snapshots.

All checks must be read-only unless the owner separately approves a controlled probe and cleanup plan.

## 9. Documentation Corrections Required During Implementation

`docs/E1_REALTIME_CONTRACT.md` records the original intended RLS matrix, but later tracked migrations appear to permit anonymous SELECT on `orders` and `staff_messages`. Before implementation, documentation must distinguish:

1. Original intended policy.
2. Migration-derived end state.
3. Live-verified production state.
4. Current browser subscription source.
5. Source tables that remain in the realtime publication.

## 10. SYNC-1C Result

The owner advanced U1 and explicitly activated SYNC-1C on 2026-08-19.

- Middleware strips `x-user-role`, `x-auth-valid`, `x-user-scope`, `x-admin-*`, and `x-user-staff-id` from caller input before authenticated branches attach fresh values.
- `getAdminContext`, `getRequestRole`, `requireAdminPermission`, and the admin-auth session endpoint now use validated cookie/session identity only. Missing or unresolvable identity fails closed.
- `/api/inventory/*` is admin-only because every handler uses the service-role client and many expose or mutate ledger, supplier, PO, payable, or approval state.
- `createBrowserClient()` is a browser-window singleton. `useRealtimeRefresh()` maintains a bounded event-ID dedup cursor and reconciles the minimal `realtime_events` signal feed on subscription, reconnect, visible-tab return, and browser-online events.
- No schema change was required: `realtime_events.id` already provides the monotonic cursor and anonymous signal-only SELECT is live.

Live production verification:

1. Forged `x-admin-*` identity headers on `/api/admin/auth` return `{ authenticated: false }`.
2. Kitchen receives 403 from inventory products while its Kitchen board remains available.
3. Anonymous cursor reads on `realtime_events` return exactly the minimal signal fields. Anonymous `orders` returns no rows. Direct anonymous `staff_messages` currently fails with an infinite RLS-recursion error, confirming it must not be used as a transport.
4. A disposable Owner browser reconciled a real `stock.low` signal with no WebSocket/realtime error; all probe rows were deleted.

## 11. Current Gate

SYNC-1C is complete. `SYNC-1D` and later checkpoints require explicit owner activation. Preserve U1-B protections and the three owner XLSX files until then.
