# Boma Full-System Functional Acceptance and Repair Audit

## Phase 1: Evidence and Repair Plan

Date: 2026-08-26

Repository checkpoint: `74964a6b4008f5a7ac721116a3ae2181ca3b0cde`

Production URL: `https://the-boma-cafe.vercel.app`

Scope: documentation-only audit; no runtime repair, migration, production mutation, push, or deployment

Verdict: **NOT ACCEPTED for unconditional production correctness**

## 1. Executive Summary

The application has substantial working functionality and several previously hardened paths: individual Admin RBAC, server-derived order stations, order-completion enqueue durability, inventory mutation tiers, scoped chat signals, atomic order deduction RPCs, atomic PO receiving, atomic import application, stock-count retry links, supplier banking isolation, public-menu payload protection, and dashboard alert consistency.

The audit nevertheless found correctness and authorization gaps that can expose customer order data, permit unauthorized staff-profile mutation, double-book venue capacity, silently skip or misplace inventory deductions, overstate supplier payments, and convert database failures into plausible zero-value business results. These are not cosmetic defects. They affect authoritative state or access control and must be addressed before the system can be accepted as convergent under failure, retry, concurrency, and hostile input.

Finding count:

| Severity | Count | Meaning |
|---|---:|---|
| Critical | 6 | Customer privacy, privilege integrity, booking uniqueness, or stock truth can be materially violated |
| High | 18 | Important authorization, financial, atomicity, delivery, or production reliability defect |
| Medium | 10 | Operational inconsistency, excessive fan-out, misleading state, or incomplete audit behavior |
| Low | 3 | Maintainability or bounded operational defect |
| **Total** | **37** | Evidence-backed source findings |

No repair batch was started. Production-mutating acceptance cases remain `UNRESOLVED` unless a prior mission-lock checkpoint contains a controlled live proof.

## 2. Method and Evidence Rules

The audit followed each system through this chain:

`UI -> API route -> validated identity/permission -> database mutation/query -> audit/ledger/event -> realtime invalidation -> downstream refetch`

Evidence classifications:

| Class | Meaning |
|---|---|
| Source-proven | Control flow, query, constraint, or consumer behavior is explicit in current tracked source |
| Test-proven | Current or prior checkpoint test directly covers the behavior |
| Live-proven | A prior mission-lock checkpoint records a controlled production probe and cleanup |
| Unresolved | A production mutation, provider response, browser/device behavior, or database condition cannot be proved in this documentation-only phase |

The audit does not reinterpret approved business semantics. In particular:

- `inventory_transactions` is quantity truth.
- `inventory_product_balances` is a display cache and not stock-validation authority.
- Physical count variance is separate from Stock Used.
- Physical location and `inventory_type` are independent.
- Realtime is invalidation only; consumers refetch authoritative state.
- Forecast and reorder may use sale-only demand unless the owner separately changes that rule.
- `/inv`, middleware behavior, login routing, applied migration history, and the three owner workbooks are protected.

## 3. Twenty-Three System Acceptance Matrix

| # | System | Authoritative state | Current result | Main evidence / gap |
|---:|---|---|---|---|
| 1 | Public site and public CMS reads | CMS tables and `site_settings` | **FAIL** | Public rendering works, but `/api/cms/public` serializes all settings, including notification email configuration (H-03) |
| 2 | Public menu and homepage menu | `menu_categories`, `menu_items` | **PASS WITH LIMITS** | U1-B explicit DTOs, no data URIs, split views, cache headers, and live measurements are recorded; future item counts above 300 are not paginated |
| 3 | Contact and inquiry flow | `contact_messages` | **RISK** | Public submit is rate-limited, but Kitchen and every Admin subrole can read/delete inquiries through broad guards (H-02) |
| 4 | Booking wizard and availability | `bookings`, `availability`, `blocked_dates` | **FAIL** | Submit does not perform a locked final availability decision; query errors fail open; cancellation writes an invalid availability status (C-02) |
| 5 | Quotes, customer portal, PDF, and email | `quotes`, `quote_items`, `background_jobs`, storage, notification outbox | **FAIL** | Enqueue RPC is durable, but quote acceptance and submission are non-atomic; outbox delivery remains at-least-once without a unique claim (H-01, H-14) |
| 6 | Admin authentication and accounts | `admin_accounts`, `admin_sessions` | **PASS WITH LIMITS** | Individual accounts, bcrypt, lockout, and fail-closed permission resolver exist; broad `requireAdmin()` callers still collapse subroles (H-02, H-04, H-15) |
| 7 | Admin authorization and configuration | Permission map plus route guards | **FAIL** | Inventory has explicit tiers, but CMS, pricing, background jobs, and booking configuration bypass matching permission keys |
| 8 | CMS editing, media, and gallery | CMS rows and Supabase Storage | **FAIL** | Two active UI upload paths write to deployment-local `public/`, which is not durable on Vercel; one has no size/type checks (H-16) |
| 9 | Staff shared-role and PIN sessions | `staff_profiles`, `staff_sessions` | **FAIL** | Database sessions persist one year but PIN cookies expire after eight hours; logout audit ordering loses the identity (M-01, M-09) |
| 10 | Staff profiles and waiter management | `staff_profiles` | **FAIL** | `/api/staff/profiles` lets any authenticated staff role upsert arbitrary profile roles and identities (C-03) |
| 11 | Staff chat, voice, and notifications | conversations, members, messages, notifications | **FAIL** | Message membership is checked, but conversation creation is non-atomic, global toast signals cause denied fetches, and voice upload lacks membership/type enforcement (H-17, M-03) |
| 12 | Public online ordering and offline queue | `orders`, localStorage queue | **FAIL** | Server pricing works, but mixed-cart detection trusts pre-enrichment station hints and the offline queue handles HTTP errors instead of network failures (H-05, H-07) |
| 13 | Waiter POS and table workflow | `orders`, staff identity | **FAIL** | Waiters fetch all waiter-source orders and can mutate any order allowed by the broad state machine; no waiter ownership boundary exists (H-06) |
| 14 | Kitchen operations board | station-scoped `orders` | **RISK** | Reads are server-pinned to Kitchen and transitions are guarded, but broad cancellation and unscoped signal consumption remain |
| 15 | Bar operations board | station-scoped `orders` | **RISK** | Reads are server-pinned to Bar and timers were repaired, but mixed-cart detection can fail before server station derivation |
| 16 | Admin orders, public tracking, and receipts | `orders`, `order_events` | **FAIL** | Sequential public references expose order details and authorize cancellation; `?verified=true` bypasses receipt phone verification (C-01) |
| 17 | Background jobs, worker, and scheduler | `background_jobs` | **FAIL** | Claim is compare-and-set, but scheduler reclaim can race an old worker's unguarded heartbeat/final update (H-13) |
| 18 | Products, UOMs, categories, locations, and suppliers | inventory catalog tables | **PASS WITH LIMITS** | CRUD and tiered mutation guards exist; duplicate-name catalog data makes name-based order-item matching ambiguous (H-12) |
| 19 | Inventory ledger, balance cache, cost, and audit | `inventory_transactions` | **FAIL** | Ledger insert, audit, and cache refresh are separate; audit/cache failures are suppressed; negative production bypasses stock validation (C-05, H-08) |
| 20 | Stock counts, daily stock, and reconciliation | stock-count tables plus ledger adjustments | **FAIL** | Approval retry links are strong, but expected stock becomes zero when snapshot/balance reads fail (H-09) |
| 21 | Purchase orders, receiving, invoices, and payables | PO/receipt/invoice/payment tables and ledger | **FAIL** | Atomic receiving RPC exists, but any RPC error falls back to non-atomic engine logic; payments lack permission, cap, lock, and transaction (H-10, H-11) |
| 22 | Recipes, production, waste, reservations, and order deduction | production/reservation tables plus ledger | **FAIL** | Atomic deduction RPC exists, but default location selection is unrelated to order station, no-location completes as zero, production is partial, and booking consumption failures are swallowed |
| 23 | Reports, forecast, reorder, analytics, dashboards, and realtime | ledger/cache/RPC projections plus signal table | **FAIL** | Dashboard alert scope is repaired, but movement classifications still conflict and multiple readers suppress query failures into empty/zero results (H-18, M-06, M-07) |

## 4. Critical Findings

### C-01: Guessable order references authorize data access, cancellation, and receipt access

**Evidence:** `generateOrderRef()` returns `YYYYMMDD-NNN` from a daily count (`src/lib/pos/orderService.ts:202-218`). Public `GET /api/track-order` returns customer name, table/waiter, total, and `items_json` using only that reference (`src/app/api/track-order/route.ts:21-75`). Public cancellation also needs only the reference and updates without a status compare-and-set (`:78-128`). The receipt page treats the user-controlled query string `verified=true` as proof of phone verification (`src/app/receipt/[ref]/page.tsx:160-179`).

**Root cause:** the display reference is used as a bearer credential, and the receipt verification result is not signed or server-stored.

**Impact:** enumeration can reveal order/customer data, cancel unpaid orders, and display receipts without the phone challenge.

**Smallest repair:** issue a separate high-entropy tracking token, require reference plus token or normalized phone proof, store a short-lived HttpOnly verification cookie, and use a status CAS for cancellation. Keep the human reference for display only.

**Acceptance:** attempts with reference only fail; forged `verified=true` fails; correct token/phone succeeds; two concurrent cancellations produce one transition/event; responses expose only the approved public DTO.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** migration 107 adds `orders.tracking_token_hash` and a service-role-only `cancel_public_order()` RPC that row-locks the order and commits the compare-and-set cancellation plus `ORDER_CANCELLED` event once. New order creation generates a 256-bit token, stores only its SHA-256 hash, removes that hash from returned order objects, and returns the raw token only in the intentional creation response. The cart places the token in a URL fragment, not an API query. Public tracking/cancellation accepts the token header or a short-lived signed HttpOnly proof; known and unknown reference-only requests return the same 401. Receipt phone verification creates that proof, and `?verified=true` is ignored. Generic order list/sibling DTOs no longer use wildcard selects. Live production verification proved that creation returns the raw token once, the database stores only its hash, reference-only tracking returns 401, token tracking returns the explicit safe DTO, and atomic cancellation commits the canonical cancelled status. Focused verification: 24/24 order/security tests, strict inventory TypeScript, root TypeScript, and diff check passed.

### C-02: Booking availability is fail-open and not locked at final submission

**Evidence:** `POST /api/booking/submit` records the booking before `recordAvailability()` and ignores the returned boolean (`src/app/api/booking/submit/route.ts:141-225`). Availability helpers ignore query errors and return availability from nullable data (`src/lib/booking/availability.ts:99-189`). The overlap decision is not protected by a database lock/exclusion constraint. `releaseAvailability()` writes `cancelled` (`:221-226`), while migration 034 permits only `booked`, `blocked`, and `tentative` (`supabase/migrations/034_booking_system.sql:284-294`). Alternative-area calculation reuses the requested area's booking result for every alternative (`availability.ts:168-180`).

**Root cause:** availability is advisory application logic rather than one authoritative database transaction/constraint.

**Impact:** concurrent submissions can double-book; database errors can be shown as available; cancellations fail to release rows; alternatives can be falsely unavailable.

**Smallest repair:** create one service-role RPC that locks/checks blocked dates and overlaps, inserts booking/quote/availability/idempotency state atomically, and deletes or validly transitions availability on cancellation. Query errors must fail closed.

**Acceptance:** concurrent same-slot submissions yield one success and one conflict; simulated query error yields 503, not available; cancellation makes the slot available; boundary-time and alternative-area cases are deterministic.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** migration 108 adds service-role-only `submit_booking_atomic()`. It serializes exact-request retries, locks blocked-date and availability writes for the final conflict decision, validates active area/capacity/blocked dates/strict time overlap, allocates quote numbers under a transaction lock, and creates the customer, booking, quote, quote items, tentative hold, status history, and PDF job in one transaction. Existing failed/dead jobs are requeued against the original business rows instead of creating another booking. A booking-status trigger deletes holds transactionally on cancellation/refund. TypeScript availability readers now throw on source errors, use strict interval overlap, evaluate alternatives independently, and the public route maps read failures to 503. Live production verification selected an authoritative available Indoor slot, returned 201 for the first submission, returned an idempotent duplicate response for the identical retry, reused the original booking and quote IDs, and left exactly one booking and one quote. Focused verification: 11/11 atomic-submission/availability tests, strict inventory TypeScript, root TypeScript, and diff check passed.

### C-03: Any staff role can upsert arbitrary staff identities and roles

**Evidence:** all methods in `src/app/api/staff/profiles/route.ts` require only `getRequestRole()`. `POST` accepts client `user_id`, `name`, and `role`, then upserts on `user_id` (`:28-48`). GET returns `select('*')` to every role (`:7-25`).

**Root cause:** a presence/status profile endpoint also acts as an unrestricted identity administration endpoint.

**Impact:** Kitchen, Bar, or Waiter credentials can corrupt identity records, change a profile role, and affect future PIN sessions; `select('*')` also exposes PIN/session metadata to staff callers.

**Smallest repair:** remove role and identity creation from the staff self-service route; require `waiter.write` or a dedicated staff permission for management; derive self profile ID from the session; return an explicit safe DTO.

**Acceptance:** each non-management role can update only its own presence-safe fields; role/user/employee/PIN fields are rejected; manager-tier tests follow the permission map; response contains no PIN/session fields.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** `/api/staff/profiles` now separates session-derived self-presence from staff identity administration. Kitchen, Bar, and Waiter callers can update only `online`, `on_duty`, and `avatar_url` on their resolved profile; client identity, role, employee, PIN, and session fields are rejected. Management reads require `view:staff_management`; safe presence updates require `waiter.write`; identity creation remains exclusively under `/api/waiters`. Responses are mapped through an explicit safe DTO. A production waiter PIN session attempted to forge `role=owner` and replace `pin_hash`; the route rejected the request and the stored role/hash remained unchanged. Focused verification: 14/14 tests, strict inventory TypeScript, and diff check passed.

### C-04: Completed orders can deduct from the wrong location or complete with no deduction

**Evidence:** `autoDeductCompletedOrder()` selects the first active inventory location without using order station or configured station-location mapping, and returns `{deducted:0, skipped:0}` if none exists (`src/inventory/engine/order-items.ts:417-431`). The worker treats that result as successful (`src/jobs/handlers/order-deduction.ts:40-55`).

**Root cause:** the order-to-inventory contract has no authoritative station/location field or resolver.

**Impact:** Kitchen and Bar sales can be posted to the same arbitrary location, or a job can complete while stock remains untouched.

**Smallest repair:** persist/resolve an explicit station-to-location mapping before enqueue; include the resolved location in the job payload; no location must throw and retry/dead-letter, never return success.

**Acceptance:** Kitchen and Bar test orders deduct only their mapped location; absent/inactive mapping leaves the job failed and visible; replay is idempotent; F3 order/line/recipe attribution remains intact.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** migration 109 adds an explicit unique `inventory_locations.order_station` mapping for `kitchen` and `bar`, seeds only the existing canonical Kitchen/Main Bar locations when present, and exposes the mapping through existing location configuration APIs/UI. Order completion resolves the active mapping before enqueue and persists both station and location in the durable job payload; mapping failure returns 503 before enqueue/status commit. The worker now requires both fields and always deducts from the persisted location, while the legacy auto-deduct helper also resolves by station and throws rather than returning a successful zero. F2/F3 deduction RPC and attribution behavior are unchanged. Live production verification proved unique `bar -> Main Bar` and `kitchen -> Kitchen` mappings; a food-menu line spoofed as Kitchen but authoritatively classified as Bar, completed through the normal state machine, and queued a durable deduction payload pinned to `station=bar` and the Main Bar location UUID. Focused verification: 34/34 station/enqueue/worker/recipe tests, strict inventory TypeScript, root TypeScript, and diff check passed.

### C-05: Negative production consumption bypasses stock validation and production completion is partial

**Evidence:** `production` is absent from `DECREASE_TYPES` (`src/inventory/engine/ledger.ts:7-15`), and insufficient-stock validation only runs for those types when caller quantity is nonnegative (`:120-133`). Production passes a negative quantity (`src/inventory/engine/production-runs.ts:179-199`) and processes each item independently, preserving partial writes when later items fail (`:177-214`).

**Root cause:** one bidirectional transaction type is also used as a decrease without an explicit decrease-validation contract; completion is an engine loop rather than a transaction.

**Impact:** ingredient balances can become negative, and a failed run can remain partially consumed/produced.

**Smallest repair:** implement one atomic production-completion RPC with signed quantity checks and item idempotency; alternatively add an explicit `validateDecrease` path before every negative production movement, but atomic completion remains required.

**Acceptance:** insufficient ingredient stock creates zero rows; successful completion creates all consumed/output rows and item links in one commit; retry creates no duplicates; concurrent completion has one winner.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** migration 110 adds service-role-only `complete_production_run()`. It row-locks the run and every movement item, validates the aggregated remaining consumed quantity per product against authoritative ledger sums before the first write, then commits signed consumed/produced production movements, transaction audits, balance-cache refreshes, item transaction links, run completion, and run audit atomically. Completed/concurrent retries return the existing links without new movements; cancelled, empty, invalid-quantity, inactive-location, and insufficient-stock cases raise before completion. The TypeScript engine has no partial fallback. `createTransaction()` now also validates negative `production` calls explicitly, closing the signed decrease bypass outside this workflow. Migration 110 is installed in production. Destructive production concurrency/failure injection was intentionally not run against live business data; the zero-write insufficient-stock case, all-or-none success, retry idempotency, and concurrent-winner behavior passed in the focused 25/25 production/ledger tests, along with strict inventory TypeScript, root TypeScript, and diff check.

### C-06: Booking completion can silently partially consume reservations

**Evidence:** `consumeReservationsForBooking()` catches every per-reservation failure and continues (`src/inventory/engine/reservations.ts:188-203`). Booking status commits first, calls the consumer, and suppresses any outer failure (`src/app/api/booking/status/route.ts:53-95`). Auto-reservation likewise suppresses individual creation failures (`reservations.ts:248-275`).

**Root cause:** reservation side effects are explicitly non-blocking without durable intent, reconciliation status, or dead-letter visibility.

**Impact:** a booking can be `completed` with only some or none of its inventory consumed; confirmation can reserve only part of a package without warning.

**Smallest repair:** enqueue idempotent reservation lifecycle jobs before terminal booking transitions, or perform a database transaction where practical; store expected/processed counts and expose failures.

**Acceptance:** one failed reservation prevents a falsely successful lifecycle result or creates a visible retry job; retry completes missing reservations only; cancelled and consumed races converge; partial counts are surfaced.

**Batch 1 result (`FIXED - VERIFIED`, 2026-08-26):** migration 111 replays the immutable enqueue RPC with the registered `reservation_lifecycle` job type added. The canonical booking-status route now enqueues an idempotent `reserve`, `cancel`, or `consume` intent before its guarded status update and returns 503 without changing status when enqueue fails; the generic bookings PATCH can no longer bypass that authority. The worker validates booking state, recreates/reuses missing expected package reservations, processes every relevant reservation, treats already-reached terminal states as idempotent success, and throws `ReservationLifecycleError` whenever any item remains incomplete. Completed jobs persist `{expected, processed, failed, failures}` in `result`; retries/dead letters persist the same structured counts under `error.details`, and the Background Jobs page surfaces those counts. Per-reservation SALE idempotency remains enforced by migration 077. Live production verification transitioned a probe booking through confirmation and completion: the real Oracle worker completed both reserve and consume jobs with exact nonzero expected/processed counts, zero failures, active reservations after reserve, consumed reservations after completion, and exactly one signed SALE per reservation. Focused verification: 43/43 reservation/enqueue/handler tests passed, including a 1-of-2 partial consume and no-duplicate retry.

## 5. High Findings

| ID | Finding and evidence | Impact | Smallest repair and acceptance |
|---|---|---|---|
| H-01 | Booking submit writes booking, quote, quote link, items, audit, availability, then job separately; early idempotency depends on the job row created last (`booking/submit/route.ts`). Quote acceptance runs three independent operations in `Promise.all` and does not inspect Supabase result errors (`booking/accept/route.ts:54-64`). | Partial booking/quote state and duplicate retry rows | Atomic booking-submit and quote-accept RPCs; inject failure after every step and require all-or-none state |
| H-02 | CMS/menu/events/settings/gallery/inquiries writers use `requireAdminOrKitchen()` even though `cms.write`, `bar_menu.write`, and `settings.write` exist. `requireAdmin()` also treats every individual Admin subrole as generic `admin`. | Kitchen or permission-ineligible admins can change/delete public content and inquiries | Apply exact permission keys; explicitly decide Kitchen's narrow menu capability; role-matrix tests for every mutating route |
| H-03 | `getPublicCMSData()` selects every `site_settings` key/value and `/api/cms/public` returns it; booking notification email keys share this table. | Public operational email/config disclosure and future secret leakage | Public setting allowlist DTO; test forbidden keys recursively absent |
| H-04 | Pricing PATCH permits any client `field` on four tables and uses only `requireAdmin()` (`admin/pricing/route.ts:64-91`). Blocked-date mutations also use generic Admin. | Unauthorized non-price changes and bypass of `pricing.write`/settings policy | Field allowlist plus `pricing.write`/`settings.write`; reject name/status/foreign-key fields |
| H-05 | Mixed-order decision checks raw client `item.station` before `enrichItems()` (`supabase/orders/route.ts:180-205`). A mixed cart with omitted/spoofed station can be created as one station order despite server derivation inside creation. | Kitchen or Bar misses part of a customer order | Always enrich once, then split authoritative enriched lines; tests with no station and spoofing in both directions |
| H-06 | Waiter list returns every waiter-source order; PATCH has no actor ownership check; cancellation transitions are `either` for all roles (`order-state-machine.ts:50-55`). | A waiter/station can alter or cancel another actor's order | Ownership/station predicates before transition; manager override only; cross-waiter/station tests return 403 |
| H-07 | Network exceptions occur before `enqueueOrder()`, while every non-2xx response, including permanent 400 validation, is queued (`CartButton.tsx:188-201`). Queue retries five times and silently deletes; localStorage write failures are ignored (`offline-queue.ts:19-22,47-82`). | Real offline orders are lost; invalid orders hammer the API then disappear | Queue only transport/503 failures, persist explicit failed state, confirm storage write, and display operator recovery; offline/reload/4xx tests |
| H-08 | `createTransaction()` inserts ledger, then best-effort audit, then best-effort cache refresh (`ledger.ts:154-213`); `writeAuditLog()` suppresses failures. | Ledger can exist without audit/cache parity | Atomic ledger RPC/outbox for audit and cache invalidation; failure injection proves one commit or visible repair state |
| H-09 | Stock-count expected balance defaults to zero when snapshot transaction or historical balance cannot be read (`stock-counts.ts:79-95`); `getBalanceAtTime()` returns zero on query error (`ledger.ts:59-76`). | Approval can post a false full-stock variance | Propagate query errors and block count submission/approval; DB-error test creates no count item/adjustment |
| H-10 | Receiving, import apply, and order deduction fall back to non-atomic engine loops for any RPC error, including business, permission, or schema defects (`receive/route.ts:36-66`, `imports/[id]/apply/route.ts:56-110`, `order-items.ts:219-250`). | Atomic guarantees disappear precisely during defects | Fallback only for explicit function-not-found in a declared compatibility window, otherwise surface the RPC error; tests for business/permission errors prove no fallback |
| H-11 | Supplier invoice/payment routes have no `requireInventoryPermission`; payment read-sum-insert-status writes are not locked/atomic and do not cap amount (`payables.ts:230-290`). | Any management session can post payments; concurrent/oversized payments can overpay and desynchronize status | Dedicated finance permission and atomic payment RPC with remaining-balance lock/cap; concurrent and overpayment tests |
| H-12 | `order_items` is unique on `(order_id,item_name)` (`migration 059:23`), while sync keys only by name and updates the row per parsed line (`order-items.ts:154-203`). Unmatched lines count as skipped, and name lookup chooses one duplicate product. | Same-name size/add-on lines collapse or under-deduct; unmatched sold items silently consume no stock | Persist stable source line IDs/menu IDs, distinguish customization lines, fail/reconcile unmatched inventory-required lines; duplicate-line tests |
| H-13 | Worker claim is guarded, but heartbeats and final status update filter only by job ID (`worker.ts:95-103,192-203`). Scheduler can reset a stale job, after which the old worker can overwrite the retry's state. | Concurrent handler execution and stale completion/error overwrite | Lease token/version in heartbeat/final predicates; scheduler rotates lease; stale owner update must affect zero rows |
| H-14 | `notification_queue` has no unique recipient/type/key constraint (`migration 034:263-277`). A crash after Resend accepts the email but before `status='sent'` causes a resend; lookup failure deliberately sends without a gate (`pdf-generation.ts:142-176,268-279,328-395,473-489`). | Duplicate customer/admin email and concurrent duplicate claim rows | Unique outbox key, provider idempotency key if supported, CAS claim state, and delivery-attempt record; concurrent/crash tests bound behavior explicitly to at-least-once |
| H-15 | Background-job create/retry/cancel routes use generic `requireAdmin()`; create accepts arbitrary type/payload/retries and job reads expose full payloads (`background-jobs/route.ts`, `[id]/route.ts`). | Assistant/manager roles can queue email/PDF work, cancel/retry jobs, and read customer PII in payloads | Dedicated job read/operate permissions, job-type/payload schemas, redacted list DTO, audit all actions |
| H-16 | CMS and gallery upload UI paths write synchronously to `process.cwd()/public` (`cms/upload/route.ts`, `upload/gallery/route.ts`), which is not persistent deployment storage. Gallery upload has no size or MIME checks; CMS accepts empty MIME values. | Production upload failure/loss and unsafe files on non-Vercel hosts | Replace both with one Supabase Storage route, MIME signature/size checks, permission key, rollback orphan on metadata failure |
| H-17 | Voice upload requires only any role, accepts arbitrary conversation ID/filename, does not verify membership or `file_type`, and can create a public bucket (`staff/voice-upload/route.ts`). | Authenticated storage abuse and public arbitrary content under another conversation path | Resolve identity, require conversation membership, server-generate path/extension, validate bytes/size, private signed reads |
| H-18 | Push register accepts client `user_id`; unregister can deactivate any known token and ownership is not checked (`push/register/route.ts`, `push/unregister/route.ts`). | Subscription hijack or unwanted deactivation | Derive user ID from identity aliases and scope update/deactivation to owner; cross-user tests return 403 |

## 6. Medium Findings

| ID | Finding | Evidence | Acceptance direction |
|---|---|---|---|
| M-01 | PIN session persistence contradicts the one-year policy | DB expiry is one year in `staff/session.ts:6,33-50`, but PIN and role cookies use eight hours in `staff/pin-login/route.ts:74-100` | Cookie and DB expiry agree; browser remains authenticated across the approved period |
| M-02 | Public staff roster exposes names, role, employee ID, duty/online state | `/api/staff/list` has no auth and returns these fields | Document public need or return only a login-safe opaque selector; privacy test |
| M-03 | Chat creation/message notification is partially transactional and global toasts overfetch | Conversation insert precedes member inserts; message notification inserts are separate; `subscribeToChatEvents` is global and each client fetches by ID | Atomic conversation/member create; message send/outbox transaction; recipient-scoped signal or notification IDs |
| M-04 | Online cart notes are collected but omitted from item and order payload | `CartButton.tsx:159-186` does not include item notes or `customerInfo.notes` | Server receives and stores both; public/order-board DTO tests |
| M-05 | Order realtime contract omits some visible transitions and station boards ignore station scope | Event list lacks confirmed/rejected; `StationDisplay` does not pass `scopeId` (`StationDisplay.tsx:203-213`) | Emit all UI-visible transitions and subscribe station boards by station scope |
| M-06 | Movement classifications contradict the owner-approved canonical definitions | Owner dashboard Used includes waste and inbound omits `transfer_in`; weekly Used includes waste and omits negative production; stock sheet sends transfers/counts to adjustments; daily report groups every non-sale/purchase as adjustment | Activate the separately approved canonical classifier only with owner approval; parity tests across all consumers |
| M-07 | Multiple readers suppress query failures into plausible zeros/empty state | Examples: `getSupplierPayables()` catches all and returns disabled zeros (`payables.ts:62-193`); forecast/reorder queries ignore errors; multiple dashboard queries use nullable data | Standard result/error envelope; errors render visibly; injected failures never become business zero |
| M-08 | Operational event/audit delivery is best-effort with no reconciliation | `logOrderEvent()` catches all (`orderService.ts:240-258`); booking lifecycle/audit and inventory audit are separate | Durable event/audit outbox or periodic parity check; mutation success defines required audit behavior |
| M-09 | Staff logout audit is attempted after session termination | Session DELETE calls `endSession()`, then `validateSession()`, which excludes signed-out rows (`staff/session/route.ts:85-97`) | Resolve identity before ending session; audit row records the actor on logout |
| M-10 | Admin upload/media operations can leave storage/database orphans and bypass subrole permissions | Storage upload occurs before media insert; delete ignores storage removal errors; routes use generic `requireAdmin()` | Transactional compensation, explicit media permission, and orphan-cleanup acceptance test |

## 7. Low Findings

| ID | Finding | Evidence | Repair |
|---|---|---|---|
| L-01 | Offline listener cleanup removes a different function than the one registered | Anonymous `offline` handler added, `handler` removed (`ConnectionStatus.tsx:11-29`) | Use stable callbacks and remount leak test |
| L-02 | Public `/api/waiters/active` reads the legacy `waiters` table and has no tracked consumer | `waiters/active/route.ts`; only middleware references the path | Remove after usage proof or point to a safe `staff_profiles` DTO |
| L-03 | Orders list logs station and count on every request | `supabase/orders/route.ts:127-132` | Structured debug logging disabled in production |

## 8. Authoritative State and State-Machine Review

### Orders

Authoritative row: `orders`. Supporting rows: `order_events`, `order_items`, `background_jobs`, ledger transactions.

Expected chain:

`pending -> confirmed -> preparing -> ready -> served/completed`

`pending/confirmed/preparing/ready/served -> cancelled` under scoped authority

Current concurrency protection:

- Status PATCH uses a compare-and-set on the previous status.
- Completion enqueues deduction before terminal status.
- Job enqueue and deduction RPCs are idempotent.

Acceptance gaps:

- Actor ownership/station is not checked on mutation.
- Mixed-cart split decision is made before authoritative station derivation.
- Public cancellation is reference-authorized.
- Completed deduction location is not tied to station.
- Some event/audit writes are best-effort.

### Bookings and Quotes

Authoritative rows: `bookings`, `quotes`, `availability`, reservation tables.

Current booking transitions are validated and status PATCH uses CAS. The transition's required side effects are not part of the same durable contract. Quote acceptance bypasses the canonical transition function, and availability uniqueness is not enforced by the database.

### Purchase Orders

Expected chain:

`draft -> approved -> ordered -> partial -> received`

Open states may transition to `cancelled`.

The primary receive RPC is atomic and contains identity, over-receive, shortage, invoice, payment-term, and cost-centre behavior. The route weakens this guarantee by falling back on every RPC error.

### Stock Counts

Expected chain:

`in_progress -> submitted -> approving -> approved`

`in_progress/submitted -> cancelled`

Approval has claim-first status and per-item transaction links/unique protection. Snapshot-read failure handling remains unsafe.

### Background Jobs

Expected chain:

`pending -> processing -> completed`

Failure: `processing -> pending(backoff) -> dead_letter`

Initial worker claim is guarded. Lease ownership after scheduler reclaim is not guarded.

### Production and Reservations

Production: `planned -> in_progress -> completed/cancelled`. Per-item links allow retry, but completion is not atomic and stock validation is bypassed for negative production.

Reservations: `active/partially_consumed -> consumed/cancelled`. Per-reservation sale uniqueness is strong, but booking-level loops suppress failures and do not establish all-or-none or durable retry intent.

## 9. RBAC Acceptance Matrix

Legend: `R` read, `W` permitted mutation, `D` destructive/final approval, `-` denied, `!` current overreach.

| Surface | Anonymous | Kitchen | Bar | Waiter | Assistant | Manager | Full manager | Owner |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Public site/menu/contact submit | R/W-public | R | R | R | R | R | R | R |
| Public order tracking/cancel | **! R/W by ref** | ! | ! | ! | ! | ! | ! | ! |
| CMS content/settings/gallery | - | **! W** | - | - | **! W via generic admin** | ! W | W | W |
| Pricing/blocked dates | - | - | - | - | **! W** | **! W** | W | W |
| Inventory reads | - | - | - | - | R | R | R | R |
| Inventory config/operations | - | - | - | - | - | W | W | W |
| Inventory final approval | - | - | - | - | - | - | D | D |
| Inventory destructive | - | - | - | - | - | - | W except locked owner actions | D |
| Supplier banking read/write/delete | - | - | - | - | - | - | R/W | R/W/D |
| Supplier invoices/payments | - | - | - | - | **! W** | **! W** | ! W | ! W |
| Staff profile upsert | - | **! W** | **! W** | **! W** | ! | ! | ! | ! |
| Background jobs | - | - | - | - | **! R/W** | **! R/W** | R/W | R/W |
| Order station reads | - | Kitchen | Bar | all waiter orders | all | all | all | all |
| Order mutations | public cancel by ref | broad station actions | broad station actions | broad waiter actions | admin actions | admin actions | admin actions | admin actions |

The target matrix must be implemented at route level. UI button hiding is not an authorization control.

## 10. Canonical Movement Metric Map

Owner-approved definitions already recorded in the mission lock:

| Metric | Canonical transaction types |
|---|---|
| Inbound / Received | `purchase`, `return`, `transfer_in` |
| Sold / Customer Usage | `sale`, `sale_bottle` |
| Internal Consumption | `comp`, `staff`, negative `production`, `gas_usage` |
| Waste / Loss | `waste`, `breakage`, `spillage`, `expiry_loss`, `theft`, `stolen`, `donation` |
| Adjustment | `adjustment` only |
| Physical Count Variance | `physical_count`, separate |
| Total Outflow | Sold + Internal Consumption + Waste/Loss |

Current divergence:

| Consumer | Current behavior | Conflict |
|---|---|---|
| Owner dashboard TS + RPC 102 | Inbound excludes `transfer_in`; Used includes waste/loss; Wastage also includes most waste | Waste double-counted as Used and Wastage; inbound incomplete; `stolen` inconsistent |
| Weekly | Delivered is canonical; Used includes waste/loss and omits negative `production` and `stolen` | Not canonical Total Outflow or Internal Consumption |
| Stock sheet | Received excludes `transfer_in`; negative production is Used; structural/count/transfer/unknown becomes Adjustment | Transfers and physical count misclassified |
| Daily report | Every type except purchase/sale becomes Adjustment | Waste, production, physical counts, and transfers collapse into adjustment |
| Dashboard today/fast/slow | Several queries use only `purchase` or `sale` | Omits `return`, `transfer_in`, or `sale_bottle` depending on card |
| Waste report | Includes `comp`; omits theft/stolen/donation | Conflicts with approved Waste/Loss set |
| Forecast/reorder | Sale and sale_bottle demand only | **No defect under current lock**; intentionally narrower than Total Outflow |

Phase 4 canonical movement implementation is separately approved but remains inactive. This report does not activate it.

## 11. Realtime and Reconciliation Matrix

| Domain | Signal | Scope in table | Main consumer | Authoritative refetch | Gap |
|---|---|---|---|---|---|
| Orders | created/preparing/ready/completed/cancelled | station | Kitchen/Bar/Admin/Waiter | `/api/supabase/orders` | confirmed/rejected absent; StationDisplay omits station scope ID |
| Booking | confirmed/in_progress/completed/cancelled | global | Waiter booking feed | `/api/staff/bookings` | booking side-effect failures have no lifecycle signal/job state |
| Chat | `chat.message` | conversation | ChatWindow | `/api/staff/messages` | global toast consumer fetches every message ID before membership denial |
| Inventory | `stock.moved`, `stock.count.updated`, `stock.low` | global | dashboard/sidebar/notifications | inventory APIs | ledger/audit/cache commits are not one contract |
| Purchase orders | `po.received` | global | dashboard | owner/inventory dashboard API | engine fallback can commit partial receipt state |
| Staff notifications | `notification.new` | global | limited/no direct dedicated surface | notification API | push subscription ownership not enforced |

The generic cursor/catch-up/dedup hook is a sound foundation. Domain-level scope and event completeness still need acceptance tests.

## 12. Error-Suppression and Misleading-Zero Matrix

| Path | Current suppression | Business risk |
|---|---|---|
| Historical balance | Query error -> `0` | False stock-count variance |
| Supplier payables | Any exception -> empty disabled totals | Financial obligations appear absent |
| Forecast/reorder/dashboard helpers | Several Supabase errors ignored | Healthy/empty state shown during outage |
| Booking availability | Query errors ignored | Slot appears available |
| Reservation batch consume/create | Per-item errors ignored | Partial reservation lifecycle appears successful |
| Order item sync/deduction fallback | Several update/insert errors not inspected | Sold line can be marked/skipped incorrectly |
| Inventory audit/cache | Errors swallowed | History/cache drift without alert |
| Order event/push | Fire-and-forget/catch | Mutation succeeds without operational trace/notification |
| Offline localStorage | Write failure ignored | UI believes order is queued when it is not |

Target rule: authoritative query failure must never be converted into a plausible business zero. Optional presentation data may degrade, but the response must declare partial/unavailable state.

## 13. Proposed Repair Batches

### Batch 1: Critical authority and stock-truth barriers

Status: **FIXED - VERIFIED (2026-08-26)**

Scope:

1. Replace reference-only order access/cancel and query-param receipt verification.
2. Add atomic fail-closed booking slot submission/cancellation.
3. Lock down staff profile mutation and safe DTOs.
4. Establish station-to-location order deduction; no-location fails visibly.
5. Make production completion atomic with signed decrease validation.
6. Add durable booking reservation lifecycle intent/retry visibility.

Exit gate: all Critical acceptance cases pass under concurrency and injected failure with zero production probe residue.

Local gate (2026-08-26): migrations 107-111 were the exact pending migration set in the linked dry run; 450/450 inventory tests passed; inventory strict TypeScript and root TypeScript passed; the standalone worker bundle built at 108.71 KB; linked schema lint reported only the pre-existing `consolidate_approved_supplier_duplicates.v_rows` unused-variable warning; `git diff --check` passed apart from line-ending notices; and the full Next production build compiled, typechecked, and generated all 187 pages.

Production gate (2026-08-26): migrations 107-111 applied; commits `8409ece` and `f53b8e9` pushed; Vercel Production built successfully and is aliased to `https://the-boma-cafe.vercel.app`; the Oracle `boma-worker` was rebuilt/restarted and remained online. Controlled probes passed C-01 token security and atomic cancellation, C-02 atomic submission/idempotent retry, C-03 waiter identity-field rejection, C-04 authoritative Bar/Main Bar mapping and persisted deduction scope, and C-06 real-worker reserve/consume convergence. C-05 destructive live injection was intentionally omitted; its atomic failure/concurrency contract was verified locally. Final residue was zero for tagged probe admin accounts, staff, bookings, orders, jobs, and transactions.

### Batch 2: Transaction and financial atomicity

Status: **IMPLEMENTED - LOCAL GATE PASSED; PRODUCTION CUTOVER PENDING (2026-08-27)**

Scope:

1. Ledger/audit/cache contract.
2. Stock-count fail-closed historical balance.
3. Remove arbitrary RPC downgrade to engine loops.
4. Atomic capped supplier payments plus finance permission.
5. Worker lease fencing and outbox uniqueness/provider idempotency.
6. Stable order line identity and unmatched-line reconciliation.

Local result (2026-08-27): migrations 112-115 are the exact pending set in the linked dry run. Migration 112 makes the central ledger write, inventory audit row, and balance-cache refresh one serialized transaction. Stock-count source reads now fail closed before creating a session/item or approving a false variance. PO receiving, import apply, and order deduction no longer downgrade RPC failures to non-atomic TypeScript loops. Migration 113 adds a locked, capped, idempotent supplier-payment RPC with dedicated admin attribution; supplier finance read/write is restricted to owner and full_manager. Migration 114 adds rotating worker lease tokens plus a unique logical notification outbox, retryable delivery-attempt record, and stable Resend idempotency keys. Migration 115 persists source line/type/item identity, preserves duplicate/customized lines, refuses arbitrary duplicate-name product matching, and blocks required unmatched lines before atomic deduction.

Local evidence: 471/471 inventory tests passed, including focused fail-closed, concurrency-contract, finance-RBAC, duplicate-line, lease-fence, and outbox tests; inventory and root TypeScript passed; the worker bundle built at 105.06 KB; linked schema lint reported only the pre-existing `consolidate_approved_supplier_duplicates.v_rows` warning; `git diff --check` reported only line-ending notices; and the full Next production build compiled, typechecked, and generated all 187 pages. No migration, commit, push, Vercel deployment, worker restart, provider call, or production business-row mutation has occurred for Batch 2.

### Batch 3: Route-level RBAC and privacy

Status: **NOT STARTED**

Scope:

1. CMS/settings/pricing/media exact permission keys and field allowlists.
2. Background-job schemas, permissions, redacted DTO, and audit.
3. Voice-upload membership/private storage.
4. Push subscription identity ownership.
5. Public CMS settings allowlist and staff roster minimization.

### Batch 4: Convergence, metrics, offline, and UX

Status: **NOT STARTED**

Scope:

1. Activate canonical movement classifier only under the existing approval gate.
2. Replace misleading-zero suppression with explicit errors/partial states.
3. Complete/scoped realtime event coverage.
4. Repair offline queue semantics and operator recovery.
5. Align PIN cookie persistence, logout audit, note persistence, and upload storage.
6. Run desktop/laptop/tablet/mobile and multi-client reconnect acceptance.

## 14. Acceptance Test Catalog

| Test ID | Scenario | Required result |
|---|---|---|
| A-01 | Enumerate daily order refs anonymously | No PII/order body; no cancellation capability |
| A-02 | Append `?verified=true` to receipt URL | Verification form remains; no receipt data |
| A-03 | Two concurrent booking submits for same area/time | Exactly one booking/availability success |
| A-04 | Inject blocked-date/availability query error | 503/unavailable, no booking writes |
| A-05 | Kitchen/Bar/Waiter calls staff profile create/change-role | 403; profile unchanged |
| A-06 | Complete Kitchen and Bar orders | Each deducts only its configured location |
| A-07 | Complete order with missing station mapping | Status/job remains retryable/failed; no silent success |
| A-08 | Complete production with one insufficient ingredient | Zero production ledger/item/run completion writes |
| A-09 | Consume booking with one failing reservation | Durable failed/retry state; booking not falsely converged |
| A-10 | Mixed cart omits/spoofs station | Server creates correctly split Kitchen and Bar tickets |
| A-11 | Waiter A reads/mutates Waiter B order | 403 or absent from scoped list |
| A-12 | Browser is offline during submit | Order is durably queued, visible, and syncs once after reconnect |
| A-13 | Server returns 400 validation | Order is not queued; error remains actionable |
| A-14 | Audit/cache write fails after ledger attempt | Atomic rollback or visible repair state; no silent drift |
| A-15 | Historical balance query fails in count | Count save/approval blocked; expected stock never becomes zero |
| A-16 | Receive/import/deduct RPC returns business error | No legacy engine fallback executes |
| A-17 | Two concurrent payments equal remaining invoice balance | Total payments never exceed invoice; status correct |
| A-18 | Scheduler reclaims job while old worker resumes | Old lease cannot heartbeat or finalize |
| A-19 | Two workers claim same email outbox key | One claim row; provider idempotency behavior recorded |
| A-20 | Same item name with two sizes/add-ons | Two stable lines and correct aggregate deduction |
| A-21 | Kitchen edits settings/pricing/CMS outside explicit permission | 403 and audited denial where required |
| A-22 | Staff uploads voice to another conversation/arbitrary file | 403/415; no storage object |
| A-23 | Register push token for another user | 403; subscription owner unchanged |
| A-24 | Supabase report query fails | UI shows unavailable/error, not zero/healthy |
| A-25 | All canonical transaction types seeded locally | Owner/weekly/stock-sheet/report parity matches approved definitions |
| A-26 | Realtime disconnect, missed events, reconnect | Cursor catch-up refetches authoritative final state once |
| A-27 | Desktop/laptop/tablet/mobile functional pass | No overlap, inaccessible action, hidden error, or horizontal overflow on critical flows |

## 15. Unresolved Evidence

The following cannot be claimed as accepted in this documentation-only phase:

- Live concurrent booking, cancellation, payment, production, and worker lease races.
- Provider-side Resend idempotency/delivery behavior.
- Actual production RLS/grants beyond prior mission-lock probes.
- Full browser/device/PWA behavior across desktop, laptop, tablet, and mobile.
- Network-loss/reload persistence of offline orders.
- Production database conditions needed to quantify unmatched order lines, partial reservation consumption, overpayments, or missing audit/cache rows.
- Deployment-to-commit mapping for checkpoints where Vercel did not expose a source SHA.

These are marked `UNRESOLVED`, not assumed healthy.

## 16. Phase 1 Five-Gate Closeout

| Gate | Result |
|---|---|
| Mission scope | Documentation-only report and permitted mission-lock checkpoint only |
| Mission lock | Frozen rules preserved; Phase 4 not activated; `/inv`, middleware, auth routing, migrations, and owner workbooks untouched |
| Evidence | Findings cite current source or prior recorded live/test evidence; prohibited live mutations remain unresolved |
| Repository state | Expected final diff: this report plus the checkpoint entry; three protected XLSX files remain untracked |
| Deployment state | No commit, push, production deployment, or production mutation performed in Phase 1 |

## 17. Batch 1 Five-Gate Closeout

| Gate | Result |
|---|---|
| Mission scope | Only C-01 through C-06, their migrations, deployment, worker update, controlled probes, cleanup, and evidence documentation were performed |
| Mission lock | Additive migration history preserved; ledger/reservation/order authorities preserved; no Batch 2 work or unrelated redesign started |
| Evidence | 450/450 tests plus focused failure/concurrency suites, TypeScript, worker/Next builds, live token/booking/staff/station/reservation probes, and worker health all passed |
| Repository state | Runtime work is committed in `8409ece` and `f53b8e9`; only the three protected owner XLSX files remain untracked |
| Deployment state | Migrations 107-111 live; Vercel Production Ready; Oracle worker online; zero tagged probe business/job/identity residue |

### Rollback readiness

- No rollback was required. Migrations 107-111 are additive/replayed-function migrations and remain recorded in synchronized local/remote history.
- A Vercel code rollback is operationally available, but reverting C-01/C-03 would reintroduce security defects and reverting C-02/C-04/C-06 must be coordinated with their live schema/job contracts.
- A worker rollback must not occur while `reservation_lifecycle` jobs are pending because the previous registry cannot process that job type. Forward repair is the preferred response to any regression.

## Stop Point

Batch 1 is complete and `FIXED - VERIFIED`. Batch 2 has passed its local implementation gate but is not production-verified. **Do not commit, push, apply migrations 112-115, deploy Vercel, restart the Oracle worker, or run live probes without explicit owner approval.**
