# THE BOMA CAFE — ARCHITECTURAL SPECIFICATION BLUEPRINT

**Date:** 3 August 2026
**Purpose:** Standardize data models, API route patterns, state management, and visual design tokens across the platform so future development is consistent and modular.
**Status:** Living document — reflects the live production system as of commit `179f0d4`.

---

## 1. DATA MODELS

### 1.1 Order (core transactional entity)

```
orders
├── id              UUID PK
├── order_ref       TEXT UNIQUE NOT NULL        — "YYYYMMDD-NNN" (daily sequence)
├── customer_name   TEXT NOT NULL
├── phone           TEXT NOT NULL               — (optional for waiter orders)
├── order_type      TEXT NOT NULL               — 'dine-in' | 'pickup' | 'delivery'
├── requested_time  TEXT DEFAULT 'ASAP'
├── items_json      JSONB NOT NULL              — { items: EnrichedItem[], metadata: {} }
├── total           NUMERIC(10,2) NOT NULL      — server-authoritative
├── status          TEXT DEFAULT 'pending'      — see State Machine §3.1
├── station         TEXT                        — 'kitchen' | 'bar' | null
├── table_number    TEXT                        — dine-in only
├── delivery_address TEXT                      — delivery only
├── waiter_name     TEXT                        — waiter POS only
├── source          TEXT DEFAULT 'online'      — 'online' | 'waiter'
├── parent_order_id  UUID                       — split orders share a parent
├── idempotency_key  TEXT UNIQUE                — client-supplied UUID
├── payment_status  TEXT
├── payment_method   TEXT
├── payment_confirmed_at  TIMESTAMPTZ
├── payment_confirmed_by   TEXT
├── cancellation_reason  TEXT
├── estimated_prep_minutes  INT
├── prep_started_at  TIMESTAMPTZ
├── estimated_ready_at  TIMESTAMPTZ
├── actual_ready_at  TIMESTAMPTZ
├── created_at  TIMESTAMPTZ DEFAULT now()
└── updated_at  TIMESTAMPTZ DEFAULT now()
```

**EnrichedItem** (inside `items_json`):
```
{ menu_item_id, name, price, quantity, subtotal, station,
  selected_size?: { name, price },
  selected_add_ons?: [{ name, price }[]],
  notes?: string }
```

### 1.2 Booking (quotation system)

```
bookings
├── id              UUID PK
├── booking_reference  TEXT UNIQUE              — UUID for external linking
├── name, phone, email  TEXT NOT NULL
├── booking_date, booking_time  DATE / TIME
├── duration_hours  NUMERIC
├── adults, children  INT
├── booking_type_id  UUID FK → booking_types
├── venue_area_id    UUID FK → venue_areas
├── food_package_id  UUID FK → food_packages
├── drink_package_id UUID FK → drink_packages
├── addons_json       JSONB                     — [{ addon_id, quantity }]
├── special_requests  TEXT
├── company           TEXT
├── status            TEXT DEFAULT 'pending'    — see State Machine §3.2
├── portal_token      TEXT                      — for customer-facing quote view
└── created_at        TIMESTAMPTZ

quotes
├── id              UUID PK
├── booking_id      UUID FK → bookings
├── quote_number    TEXT UNIQUE                 — "BMC-YYYY-NNNN"
├── version         INT DEFAULT 1
├── storage_path    TEXT                         — Supabase Storage path
├── quotation_email_sent_at  TIMESTAMPTZ
├── pdf_version     INT
└── ...

background_jobs
├── id              UUID PK
├── job_type        TEXT NOT NULL                — 'pdf_generation' (extensible)
├── payload         JSONB NOT NULL
├── status          TEXT DEFAULT 'pending'       — pending|processing|completed|failed|dead_letter|cancelled
├── idempotency_key TEXT UNIQUE
├── retry_count     INT DEFAULT 0
├── max_retries     INT DEFAULT 3
├── scheduled_at    TIMESTAMPTZ
├── heartbeat_at    TIMESTAMPTZ
├── locked_by       TEXT
├── result          JSONB
├── error           TEXT
└── created_at, started_at, completed_at  TIMESTAMPTZ
```

### 1.3 Inventory (transaction-ledger engine)

```
inventory_products
├── id, name, sku, barcode, category_id
├── inventory_type  TEXT          — FOOD|BEVERAGE|CLEANING|PACKAGING|GENERAL
├── base_uom_id     UUID FK → inventory_uoms
├── reorder_threshold  NUMERIC
├── container_type_id  UUID FK
├── units_per_container  INT
├── is_active, deleted_at
└── ...

inventory_transactions  (LEDGER — append-only, single source of truth)
├── id              UUID PK
├── product_id      UUID FK → inventory_products
├── location_id     UUID FK → inventory_locations
├── transaction_type TEXT          — purchase|sale|adjustment|transfer_in|transfer_out|physical_count|production|waste|opening|return
├── quantity        NUMERIC         — signed (negative = decrease)
├── unit_cost       NUMERIC         — for weighted average cost on purchases
├── cost_centre_id  UUID FK → cost_centres  NOT NULL
├── reason_type     TEXT            — BREAKAGE|WASTE|STAFF_MEAL|PROMOTION|EXPIRED|THEFT|DONATION|COMP|TRANSFER|ADJUSTMENT|SALE|BOOKING|RETURN|OPENING|CLOSING|PRODUCTION|SPILLAGE|DELIVERY
├── reason_notes, manager_note, note_author  TEXT
├── reference_type  TEXT            — purchase_order|stock_count|production_run|pos_order|booking|import
├── reference_id    UUID
├── container_quantity, container_type_id
├── created_by, created_at
└── ...
```

**Rule:** No direct INSERT into `inventory_transactions` — all writes go through `createTransaction()` in `src/inventory/engine/ledger.ts`.

### 1.4 Bar Menu (separate from food menu)

```
bar_items
├── id, name, category_id FK → bar_categories
├── single_price, bottle, glass_price, shot_price, price  NUMERIC (nullable)
├── is_available, is_alcohol, available_for_pickup, has_inventory
├── order_index  INT
└── ...

bar_item_inventory_links
├── bar_item_id       UUID FK → bar_items
├── inventory_product_id  UUID FK → inventory_products
├── pour_size_ml      NUMERIC
└── UNIQUE(bar_item_id, inventory_product_id)

bar_product_config
├── product_id  UUID FK → inventory_products UNIQUE
├── bottle_size_ml, pour_size_ml  NUMERIC
└── display_as  TEXT
```

**Known issue:** Food menu items (`menu_items_supabase`) with `station: "bar"` are not in `bar_items`. See Known Bug #14.

---

## 2. API ROUTE PATTERNS

### 2.1 Public (unauthenticated) routes

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/menu/public` | Full food menu (items, sizes, add-ons) | None |
| GET | `/api/bar/public` | Full bar menu | None |
| GET | `/api/cms/public` | Public page content + gallery | None |
| POST | `/api/supabase/orders` | Create order (dine-in/pickup/delivery) | None (rate-limited) |
| POST | `/api/supabase/contact` | Contact form submission | None |
| POST | `/api/booking/submit` | Booking/quotation request | None (Zod-validated) |
| GET | `/api/booking/config` | Booking types, venue areas, packages | None |
| GET | `/api/track-order?ref=...` | Order status tracking | None |
| POST | `/api/admin/auth` | Admin/station login (sets cookie) | None |

### 2.2 Admin (cookie-authenticated) routes

All routes under `/api/admin/*`, `/api/supabase/*` (GET/PATCH/DELETE), `/api/inventory/*` require the `boma_admin_auth` cookie set by `POST /api/admin/auth`.

Middleware matcher (`src/middleware.ts`):
```
/admin/:path*
/api/admin/:path*
/api/inventory/:path*
/api/supabase/:path*  (GET/PATCH/DELETE only; POST orders is public)
/api/staff/:path*
/api/background-jobs/:path*
```

### 2.3 Standard response envelope

**Success:**
```json
{ "data": ..., "meta": { "cursor": "...", "hasMore": true, "total": 42 } }
```

**Error:**
```json
{ "error": "Human-readable message", "fields": [{ "field": "name", "message": "..." }] }
```

**Order create (special):**
```json
{ "success": true, "order": {...}, "orders": [...], "duplicate": false, "split": true }
```

### 2.4 Pagination

- Cursor-based for inventory lists: `?cursor=<iso>&page_size=20`
- Offset-based for orders: `?limit=100&offset=0` (max 500)
- Default page size: 20–100 depending on endpoint

### 2.5 Idempotency

- Orders: client supplies `idempotency_key` (UUID). Duplicate key → returns original order with `duplicate: true`, HTTP 200.
- Bookings: `idempotency_key` = `booking-submit:{email}:{date}:{time}:{venue_area_id}`. Rpc `enqueue_background_job()` handles race-safe deduplication.

---

## 3. STATE MACHINES

### 3.1 Order status (`src/lib/order-state-machine.ts`)

```
pending → confirmed → preparing → ready → completed
    ↘ rejected
confirmed → cancelled (with reason)
preparing → cancelled (with reason)
```

Transitions validated server-side via `canTransition()`. Payment confirmation required for `pending → confirmed` (`paymentRequiredForTransition()`).

### 3.2 Booking status

```
pending → confirmed → completed
    ↘ cancelled
    ↘ refunded
```

Lifecycle hooks (`src/app/api/booking/status/route.ts`):
- → `confirmed`: `autoReserveForBooking()` — reserves stock from `drink_package_products × guest count`
- → `cancelled`/`refunded`: `cancelReservationsForBooking()` — releases reservations
- → `completed`: `consumeReservationsForBooking()` — creates SALE ledger transactions, deducts stock

### 3.3 Background job status

```
pending → processing → completed
                    ↘ failed → (retry with backoff) → pending
                    ↘ dead_letter (max retries exhausted)
pending → cancelled (manual)
processing → pending (scheduler reclaim if heartbeat > 60s)
```

Backoff: `2^N * 60s` (1m, 2m, 4m). Max retries: 3 (default).

### 3.4 Inventory stock count

```
draft → in_progress → submitted → approved (creates physical_count transactions)
                          ↘ cancelled
```

### 3.5 Purchase order

```
draft → approved → ordered → partial → received
                                  ↘ cancelled (from any open status)
```

---

## 4. VISUAL DESIGN TOKENS

### 4.1 Color palette (CSS modules in `src/inventory/components/` and admin pages)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#1A1610` | Dark page background |
| `--color-surface` | `#2A2420` | Card/panel background |
| `--color-surface-alt` | `#3A332D` | Hover/active surface |
| `--color-border` | `#3D362F` | Subtle borders |
| `--color-text` | `#F5F0E8` | Primary text |
| `--color-text-muted` | `#A8A09A` | Secondary text |
| `--color-gold` | `#C9A961` | Brand accent, headers, active |
| `--color-gold-dark` | `#9B8542` | Hover gold |
| `--color-success` | `#4A7C59` | Available, completed, ok |
| `--color-danger` | `#C85450` | Occupied, rejected, error |
| `--color-warning` | `#D4A444` | Bill pending, warning |
| `--color-info` | `#5B8FB9` | Info badges |

### 4.2 Badge variants

```
success → green bg   (available, completed, approved)
danger  → red bg     (rejected, cancelled, dead_letter)
warning → amber bg   (pending, bill_pending, partial)
info    → blue bg    (processing, ordered)
neutral → gray bg    (draft, cancelled-soft)
```

### 4.3 Table color codes (orders page)

```css
--row-available: green tint    /* table is free */
--row-occupied:  red tint      /* table has active order */
--row-bill:      amber tint    /* order ready, awaiting bill */
```

---

## 5. FILE ORGANIZATION

### 5.1 App Router structure

```
src/app/
├── (public)/                    — customer-facing pages (no auth)
│   ├── page.tsx                 — landing
│   ├── menu/                    — food menu
│   ├── bar/                     — bar menu
│   ├── booking/                 — booking form
│   └── track-order/
├── admin/
│   ├── orders/                  — POS/KDS dashboard
│   ├── bookings/                — booking management
│   ├── operations/              — inventory/operations (renamed from inventory)
│   │   ├── checklist/           — landing page (morning opening checklist)
│   │   ├── dashboard/           — inventory dashboard
│   │   ├── products/            — products list
│   │   ├── food/                — food-specific views
│   │   ├── beverage/            — beverage-specific views
│   │   ├── purchases/           — POs, receiving, suppliers
│   │   ├── production/          — recipes, runs, waste, order items
│   │   ├── records/             — locations, transactions, imports, notifications
│   │   ├── reports/
│   │   └── settings/
│   ├── messages/                — staff chat
│   └── staff/
├── api/
│   ├── menu/public/route.ts
│   ├── bar/public/route.ts
│   ├── supabase/orders/route.ts — POST (public) + GET/PATCH (admin)
│   ├── booking/submit/route.ts  — public
│   ├── booking/status/route.ts  — admin
│   ├── admin/                   — admin auth, analytics, quotes
│   ├── inventory/               — 60+ proxy routes → src/inventory/api/
│   ├── background-jobs/
│   └── staff/
```

### 5.2 Inventory engine (strict-typed, framework-agnostic)

```
src/inventory/
├── engine/                      — pure business logic (no Next.js)
│   ├── types.ts                 — all types (strict + noUncheckedIndexedAccess)
│   ├── ledger.ts                — createTransaction, getBalance
│   ├── conversion.ts            — UOM conversion
│   ├── dashboard.ts             — 8 dashboard sections
│   ├── reports.ts               — 6 report functions
│   ├── timeline.ts              — activity timeline
│   ├── stock-counts.ts
│   ├── reservations.ts
│   ├── recipes.ts
│   ├── production-runs.ts
│   ├── waste.ts
│   ├── order-items.ts
│   ├── forecasting.ts
│   ├── notifications.ts
│   ├── analytics.ts
│   ├── checklist.ts
│   ├── reconciliation.ts
│   └── purchase-orders.ts
├── api/                         — route handlers (imported by App Router proxies)
├── import/                      — Excel import pipeline (9 modules)
├── lib/                         — db, audit, errors, id, location resolver
└── components/                  — shared design-system components
    ├── products-view.tsx
    ├── reconciliation-view.tsx
    ├── settings-views.tsx
    └── count-card.tsx
```

### 5.3 Background worker (standalone Node.js process)

```
src/jobs/
├── index.ts                     — entry: Promise.all([startWorker(), startScheduler()])
├── worker.ts                    — polling loop (5s), job locking, heartbeat (10s)
├── scheduler.ts                 — stuck-job reclaim (30s), dead-letter
├── registry.ts                  — job_type → handler map
├── handlers/
│   └── pdf-generation.ts        — PDF + email + admin notification (transactional outbox)
└── utils/
    ├── logger.ts                — structured JSON logger
    └── retry.ts                 — exponential backoff
```

Build: `npm run build:worker` (tsup → `dist/jobs/index.js`, 94 KB bundle).

---

## 6. SECURITY BOUNDARIES

### 6.1 Authentication

- Admin/station auth: `POST /api/admin/auth` with `{password, role}` → sets `boma_admin_auth` cookie (httpOnly, 7-day expiry).
- Cookie validated by `requireAuthenticated()`, `requireAdmin()`, `getRequestRole()` in `src/lib/auth/requireRole.ts`.
- Middleware enforces route protection at the edge (no route handler bypass).

### 6.2 Input validation

- Orders: `validateOrder()` (Zod-style) checks customer_name, phone regex, order_type enum, items array, table_number (dine-in), delivery_address (delivery).
- Bookings: `bookingFormSchema` (Zod) validates UUIDs for booking_type_id, venue_area_id, and required fields.
- Inventory: all API routes validate input server-side; engine functions are typed (strict TypeScript).

### 6.3 Server-authoritative pricing

- Order prices are NEVER trusted from the client. `enrichItems()` re-fetches prices from the DB and computes totals server-side.
- Booking totals are computed server-side from `booking_types`, `venue_areas`, `food_packages`, `drink_packages`, and `addons` tables.

### 6.4 Supabase client

- Public routes use the anon key (RLS-protected).
- Admin routes use `getAdminClient()` (service-role key, bypasses RLS) — never exposed to the client.

---

## 7. DEPENDENCIES & INFRASTRUCTURE

| Component | Service | Tier |
|-----------|---------|------|
| Web app | Vercel | Hobby (10s function limit) |
| Database | Supabase (PostgreSQL) | Free tier |
| File storage | Supabase Storage | Free tier |
| Email | Resend | Free tier |
| PDF generation | `@react-pdf/renderer` (worker) | — |
| Background worker | Railway/Fly/Render (NOT deployed yet) | $5-7/mo |
| Realtime | Supabase Realtime (WebSocket) | Free tier |

**Critical constraint:** Vercel Hobby 10s function timeout — all long-running work (PDF, email, Excel) must be deferred to the background worker.

---

*End of Architectural Specification Blueprint*
