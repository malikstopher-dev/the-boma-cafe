# THE BOMA CAFE — SYSTEM AUDIT & OPERATOR MANUAL

**Date:** 3 August 2026 (originally 15 June 2026; refreshed)
**Platform:** Next.js 14.2.3 (App Router) + Supabase (PostgreSQL) + Resend + Vercel
**Repository:** github.com/malikstopher-dev/the-boma-cafe
**Latest Commit:** `179f0d4` — menu-items refactor (centered modal, auto-link, batch-link)

> **Live API Audit (3 August 2026):** All 30+ public and admin API endpoints tested via curl against production. Every endpoint returned correct HTTP status, auth-protected routes reject unauthenticated requests, idempotency works (duplicate submissions return `duplicate:true` with the original record), booking submit queues a background job with correct quote line items, and order tracking resolves correctly. Two logic-layer bugs found (see Known Bugs #13-14): order error sanitization hides real DB errors, and station-split fails for food-menu items with `station:"bar"`. Full findings in sections 11 and 12 below.
>
> **What has changed since the original June 2026 audit:**
> - Full inventory / operations platform built (M1–M5, migrations 039–061): transaction-ledger engine, UOMs, locations, suppliers, purchase orders, stock counts, recipes, production runs, waste, order-items, forecasting, analytics, notifications, container tracking, reorder, price history, checklist, reconciliation.
> - Admin routes restructured `/admin/inventory/*` → `/admin/operations/*` (manager-first; opening checklist is the landing page).
> - Background job queue (migrations 038 + 060): booking PDFs + emails handled by a standalone worker; `enqueue_background_job()` RPC is race-safe and idempotent.
> - Bar menu `is_alcohol` flag (migration 061): alcoholic items blocked for pickup/delivery; waiter field removed for public dine-in.
> - POS/KDS UX refactor (commit `17fc5db`): 24h auto-archive, fixed-urgency timers, empty-column collapse, color-coded table grid, single-row order cards.
> - Admin UX pass (commit `550f812`): sidebar section headers + gold rail, menu edit scroll-to-top, imports sticky bottom bar + sticky thead, chat dark theme + truncation.
> - Menu integration (commit `179f0d4`): centered overflow-safe modal, category accordions, auto-link (fuzzy name match), batch-link by category, pour-size inheritance from `bar_product_config`.
> - Tests: 61 passing across 6 files. Inventory engine strict-typed. TypeScript clean. `npm run build` succeeds (~2.6 min).
>
> The original audit findings below are retained as a historical baseline. Several have since been fixed; see the "Status" column and the update notes inline.

---

## TABLE OF CONTENTS

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Admin Audit](#2-admin-audit)
3. [Orders System Audit](#3-orders-system-audit)
4. [Kitchen Audit](#4-kitchen-audit)
5. [Waiter Audit](#5-waiter-audit)
6. [Tracking System Audit](#6-tracking-system-audit)
7. [Security Audit](#7-security-audit)
8. [Database Audit](#8-database-audit)
9. [Production Readiness Scorecard](#9-production-readiness-scorecard)
10. [Staff Training Manual](#10-staff-training-manual)
11. [Known Bugs](#11-known-bugs)
12. [Recommended Improvements](#12-recommended-improvements)

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### High-Level Stack

```
┌─────────────────────────────────────────────┐
│                  Browser                      │
│  (React 18 SPA + Server Components)          │
├─────────────────────────────────────────────┤
│           Next.js 14 App Router              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages    │  │  API      │  │ Middleware│  │
│  │ (RSC)     │  │  Routes   │  │ (Edge)   │  │
│  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────┤
│              Supabase (PostgreSQL)           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Orders│ │CMS   │ │Auth  │ │Realtime│      │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────────────┤
│             Vercel Edge Network               │
└─────────────────────────────────────────────┘
```

### Authentication Model (3-Role Cookie-Based)

| Role | Cookie Name | Env Var | Middleware Route Access | API Access |
|------|-------------|---------|------------------------|------------|
| **admin** | `boma_admin_auth` | `ADMIN_PASSWORD` | All `/admin/*`, `/waiter/*` | Full |
| **kitchen** | `boma_kitchen_auth` | `KITCHEN_PASSWORD` | `/admin/kitchen` only | View + update orders |
| **waiter** | `boma_waiter_auth` | `WAITER_PASSWORD` | `/waiter` only | None via middleware; page uses public endpoints |

All passwords are SHA-256 hashed before comparison. No plaintext storage. Each role uses a **separate password** — sharing is possible but not recommended.

### Route Protection Layers

```
Layer 1: Middleware (Edge Runtime)
  └─ Matches: /admin/*, /waiter/*, /api/admin/*, /api/cms/*, /api/waiters/*, /api/gallery/*, /api/upload/*
  └─ Validates cookies → sets x-user-role, x-auth-valid, x-user-scope headers
  └─ Fails closed: invalid/missing cookie → redirect (pages) or 401 JSON (API)

Layer 2: API Route Guards (Node.js Runtime)
  └─ requireRole.ts functions (header-fast-path, cookie-fallback)
  └─ requireAdmin(), requireKitchen(), requireAdminOrKitchen(), requireWaiter(), requireAuthenticated()

Layer 3: Rate Limiting (in-memory)
  └─ checkRateLimit(key): 10 requests per 60s window per IP
  └─ Applied to: order creation, contact form, booking form, order tracking
```

### Page Inventory (58 Static Pages + 4 Dynamic Routes)

| Route | Type | Auth Required | Purpose |
|-------|------|---------------|---------|
| `/` | Static | Public | Homepage |
| `/about` | Static | Public | About page |
| `/menu` | Static | Public | Online menu |
| `/bar-menu` | Static | Public | Drinks menu |
| `/events` | Static | Public | Events listing |
| `/gallery` | Static | Public | Photo gallery |
| `/promotions` | Static | Public | Promotions/offers |
| `/entertainment` | Static | Public | Entertainment page |
| `/experience` | Static | Public | Experience page |
| `/contact` | Static | Public | Contact form |
| `/track-order` | Static | Public | Order tracking |
| `/waiter` | Dynamic | Waiter/Admin | Waiter order tablet |
| `/receipt/[ref]` | Dynamic | Phone-verified or authed | Order receipt |
| `/admin/login` | Static | None | Login page |
| `/admin` | Static | Admin | Redirects to dashboard |
| `/admin/dashboard` | Static | Admin | Home stats + quick links |
| `/admin/orders` | Static | Admin | POS order management |
| `/admin/kitchen` | Static | Admin/Kitch. | Kitchen Display System |
| `/admin/analytics` | Static | Admin | Sales + product analytics |
| `/admin/menu` | Static | Admin | Menu item CRUD |
| `/admin/categories` | Static | Admin | Menu category management |
| `/admin/events` | Static | Admin | Event CRUD |
| `/admin/promotions` | Static | Admin | Promotion CRUD |
| `/admin/gallery` | Static | Admin | Photo gallery management |
| `/admin/popup` | Static | Admin | Popup banner config |
| `/admin/announcement` | Static | Admin | Announcement bar config |
| `/admin/site-settings` | Static | Admin | Full CMS content editor |
| `/admin/content-map` | Static | Admin | Content navigation helper |
| `/admin/contact-messages` | Static | Admin | View/delete contact msgs |
| `/admin/inquiries` | Static | Admin | Manage inquiries |
| `/admin/bookings` | Static | Admin | Booking management |
| `/admin/waiters` | Static | Admin | Waiter list management |
| `/admin/bar-menu` | Static | Admin | Bar drinks (LOCAL ONLY) |

---

## 2. ADMIN AUDIT

### 2.1 `/admin/dashboard`

**Purpose:** Command center showing system status at a glance.

**What it displays:**
- Menu items count, upcoming events count, active promotions count, unread inquiries count
- Orders per waiter (from `waiter_stats` query)
- Quick action links to menu, events, promotions, popup config
- Getting Started guide for new admins

**Actions:**
| Action | Result | DB Effect |
|--------|--------|-----------|
| Click stat card | Navigates to relevant admin page | None |
| Click Quick Action | Navigates to management page | None |
| View waiter stats | Fetches `?waiter_stats=true` from orders | Read-only SELECT |

**Permissions:** Admin only (middleware enforces)

### 2.2 `/admin/orders`

**Purpose:** Full POS order management — view, process, and complete orders.

**Layout:** 3-panel design — Table grid (left) | Order cards (center) | Checkout panel (right)

**Actions:**
| Button | Action | DB Effect |
|--------|--------|-----------|
| Table button (1-20) | Filters orders to that table | None (client filter) |
| Order card | Selects order, opens in checkout panel | None |
| "Assign Table" dropdown | Sets `table_number` on order | `PATCH /api/supabase/orders` → UPDATE orders SET table_number |
| "Confirm Payment" | Sets `payment_status='paid'` on pending | `PATCH` → UPDATE orders SET payment_status, payment_confirmed_at, payment_confirmed_by |
| Cash/Card/Mobile toggle | Selects payment method | None (local state only) |
| "Mark Paid (METHOD)" | Completes order + sets payment | `PATCH` → UPDATE orders SET status='completed', payment_status='paid' |
| "Print Receipt" | `window.print()` for physical receipt | None |
| "Show all orders" | Clears table filter | None (client filter) |

**Real-time updates:** Polls `GET /api/supabase/orders` every 4 seconds. Audio alert (beep) on new orders.

**Permissions:** Admin only (middleware blocks kitchen)

**Limitations:**
- No pagination — all orders loaded at once. Will slow down with thousands of orders.
- No order deletion from UI — only available via API DELETE
- Payment confirmation is manual — no payment gateway integration

### 2.3 `/admin/analytics`

**Purpose:** Sales analytics with configurable time range.

**What it shows:**
- Total revenue (completed orders only)
- Total orders count
- Top 10 products (by quantity sold)
- Order type breakdown (pickup/delivery/dine-in)
- Daily revenue chart (last N days)
- Order frequency chart (orders per day)

**Actions:**
| Action | Result | DB Effect |
|--------|--------|-----------|
| Period dropdown (7/14/30/90 days) | Reloads analytics with new range | `GET /api/admin/analytics?days=N` → SELECT from orders |

**Permissions:** Admin only (middleware + `requireAdmin` in API)

**Limitations:**
- Revenue = sum of completed order totals, regardless of payment status
- No profit/cost tracking
- No year-over-year comparison
- No export (CSV/PDF)

### 2.4 `/admin/menu`

**Purpose:** Manage food menu items (not categories).

**CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Item | `cmsService.saveMenuItem()` → INSERT into `menu_items` |
| Edit Item | `cmsService.saveMenuItem()` → UPDATE `menu_items` |
| Delete Item | `cmsService.deleteMenuItem(id)` → DELETE from `menu_items` |

**Fields:** name, description, price, categoryId, sizes (JSON), addOns (JSON), options (JSON), image (base64), isAvailable, isFeatured, isOnPromo, promoBadge

**Permissions:** Admin/Kitchen (API-level)

**Notes:**
- Image upload uses FileReader to base64 — stored as text in DB. Not ideal for large images.
- No image size validation before upload.

### 2.5 `/admin/categories`

**Purpose:** Manage menu categories.

**CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Category | `cmsService.saveCategory()` → INSERT into `menu_categories` |
| Edit Category | `cmsService.saveCategory()` → UPDATE `menu_categories` |
| Enable/Disable | Toggles `isActive` → UPDATE `menu_categories` |
| Delete Category | `cmsService.deleteCategory(id)` → DELETE from `menu_categories` |

**Fields:** name, description, isActive

**Permissions:** Admin/Kitchen

### 2.6 `/admin/events`

**Purpose:** Manage upcoming and past events + "Last Week" highlight section.

**Tabs:** Upcoming Events | Past Events | Last Week Highlight

**Event CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Event | `cmsService.saveEvent()` → INSERT into `events` |
| Edit Event | `cmsService.saveEvent()` → UPDATE `events` |
| Delete Event | `cmsService.deleteEvent(id)` → DELETE from `events` |
| Reorder Events | `cmsService.reorderEvents()` → UPDATE order_index for each |

**Fields:** title, description, date, time, location, category, coverImage, galleryImages (JSON), status (upcoming/featured/past), showOnHomepage, ctaLabel, ctaLink, visible

**Highlight CRUD:** Single config object — title, description, videoSrc, posterImage, ctaLabel, ctaLink, visible, autoplay, muted, loop

**Permissions:** Admin/Kitchen

### 2.7 `/admin/promotions`

**Purpose:** Manage promotional offers.

**CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Promotion | `cmsService.savePromotion()` → INSERT into `promotions` |
| Edit Promotion | `cmsService.savePromotion()` → UPDATE `promotions` |
| Delete Promotion | `cmsService.deletePromotion(id)` → DELETE from `promotions` |

**Fields:** title, description, image, priceText, ctaText, ctaLink, isActive, displayOnHomepage, startDate, endDate, orderIndex

**Permissions:** Admin/Kitchen

### 2.8 `/admin/gallery`

**Purpose:** Manage photo gallery (CMS items + filesystem images).

**Tabs:** Main Gallery (CMS) | Local Boards Gallery (filesystem)

**Main Gallery CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Item | `cmsService.saveGalleryItem()` → INSERT into `gallery` |
| Edit Item | `cmsService.saveGalleryItem()` → UPDATE `gallery` |
| Delete Item | `cmsService.deleteGalleryItem(id)` → DELETE from `gallery` |
| Feature/Unfeature | Toggles `isFeatured` → UPDATE `gallery` |

**Local Images:**
| Action | DB Effect |
|--------|-----------|
| Upload | File saved to `public/gallery/<folder>/` | None (filesystem) |
| Delete | File deleted from `public/gallery/<folder>/` | None (filesystem) |

**Permissions:** Admin/Kitchen

**Known Issue:** Uploads to Vercel's ephemeral filesystem may fail on subsequent deploys. The code catches the error and shows an alert about Vercel read-only filesystem.

### 2.9 `/admin/popup`

**Purpose:** Configure the popup announcement overlay.

**Fields:** type, title, description, image, ctaText, ctaLink, isEnabled, showOncePerSession, startDate, endDate, startTime, endTime, activeDays (JSON), adultPrice, kidsPrice

**Permissions:** Admin/Kitchen

**Note:** Single config object — no multiple popups.

### 2.10 `/admin/announcement`

**Purpose:** Scrolling announcement bar at top of public site.

**Fields:** text, link, linkText, isEnabled

**Permissions:** Admin/Kitchen

### 2.11 `/admin/site-settings`

**Purpose:** Full website content management across 9 tabs.

**Tabs:** Homepage, About, Experience, Entertainment, Venue Hire, Contact, Promo Bar, Branding, SEO

**Total fields:** ~100+ text/textarea inputs across all tabs

**Permissions:** Admin/Kitchen

**Note:** All settings saved together as a single bulk operation. No granular per-field saving.

### 2.12 `/admin/bookings`

**Purpose:** View and manage table bookings.

**Actions:**
| Button | Action | DB Effect |
|--------|--------|-----------|
| Confirm | Sets status='confirmed' | `PATCH` → UPDATE bookings SET status='confirmed' |
| Cancel | Sets status='cancelled' | `PATCH` → UPDATE bookings SET status='cancelled' |
| Mark Completed | Sets status='completed' | `PATCH` → UPDATE bookings SET status='completed' |
| Delete | Removes booking | `DELETE` → DELETE from bookings |

**Filters:** Search (by name), Status filter (All/Pending/Confirmed/Cancelled/Completed)

**Permissions:** Admin/Kitchen

### 2.13 `/admin/contact-messages` & `/admin/inquiries`

**Purpose:** View and manage contact form submissions.

**Actions:**
| Button | Action | DB Effect |
|--------|--------|-----------|
| Mark Read | Sets is_read=true | `PATCH` → UPDATE contact_messages SET is_read=true |
| Delete | Removes message | `DELETE` → DELETE from contact_messages |

**Permissions:** Admin/Kitchen

### 2.14 `/admin/waiters`

**Purpose:** Manage wait staff list.

**CRUD:**
| Action | DB Effect |
|--------|-----------|
| Add Waiter | `POST /api/waiters` → INSERT into `waiters` |
| Edit Name | `PATCH /api/waiters` → UPDATE waiters SET name |
| Toggle Duty | `PATCH /api/waiters` → UPDATE waiters SET active=¬active |
| Delete Waiter | `DELETE /api/waiters` → DELETE from waiters |

**Permissions:** Admin only (API enforces)

**Note:** Deleting a waiter removes them from the assignment list but does NOT delete historical orders referencing them.

### 2.15 `/admin/bar-menu`

**Purpose:** Manage bar/drinks menu.

**⚠️ CRITICAL BUG:** All CRUD is purely client-side localStorage. 84 hardcoded default drinks. **NO data persists to server.** All changes lost on page refresh or browser close.

**Permissions:** Admin/Kitchen (by route, but data doesn't actually persist)

### 2.16 `/admin/content-map`

**Purpose:** Navigation helper showing all content areas with links.

**Actions:** All items are `<Link>` elements to other admin pages. No API calls. No CRUD.

### 2.17 `/admin/login`

**Purpose:** Admin/Kitchen/Waiter authentication.

**Actions:**
| Action | Result | DB Effect |
|--------|--------|-----------|
| Enter password + submit | Validates against env var, sets auth cookie | None |
| Logout | Clears all auth cookies | None |

**Login flow:**
1. User enters password
2. Frontend guesses role: tries admin first, falls back to kitchen
3. Waiter login is separate (via `/waiter` page)
4. On success: cookie set, redirect to dashboard

**Permissions:** None (public endpoint)

---

## 3. ORDERS SYSTEM AUDIT

### 3.1 Order Entry Points

```
                    ┌─────────────────────┐
                    │    Customer orders    │
                    │  via website (mobile) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  POST /api/orders/   │
                    │  create (public,     │
                    │  rate-limited)       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   sanitizeOrderInput │
                    │   → validateOrder    │
                    │   → enrichItems      │
                    │   (server pricing)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  INSERT into orders  │
                    │  (with idempotency   │
                    │   key dedup)         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  logOrderEvent       │
                    │  (ORDER_CREATED)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Realtime broadcast  │
                    │  → Kitchen Display   │
                    └─────────────────────┘
```

### 3.2 Waiter Orders

```
Waiter logs in → PasswordGate (client-side)
  → Fetches active waiters (/api/waiters/active)
  → Fetches menu (/api/menu/public)
  → Selects table number (1-20)
  → Selects waiter name from active list
  → Adds items to cart
  → Submits POST /api/supabase/orders
    (same public endpoint as customer orders)
```

### 3.3 Order Validation Rules

| Field | Required? | Validation |
|-------|-----------|------------|
| `customer_name` | Yes | Non-empty string, trimmed |
| `phone` | Yes | 7-20 chars, digits/spaces/+-() |
| `order_type` | Yes | Must be 'pickup', 'delivery', or 'dine-in' |
| `items` | Yes | Array, min 1 item |
| `items[].menu_item_id` | Yes | String |
| `items[].quantity` | Yes | Number >= 1 |
| `table_number` | If dine-in | Non-empty string |
| `waiter_name` | If dine-in | Non-empty string |
| `delivery_address` | If delivery | Non-empty string |
| `idempotency_key` | No | String if present |

### 3.4 Order Status Flow

```
                    ┌──────────┐
                    │  PENDING  │ ← Initial state for all orders
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              │                     │
     ┌────────▼────────┐   ┌───────▼──────┐
     │   CONFIRMED      │   │  CANCELLED   │
     │  (accepted by    │   │  (any status)│
     │   kitchen)       │   └──────────────┘
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │   PREPARING      │
     │  (being cooked)  │
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │     READY        │
     │  (ready for      │
     │   pickup/delivery│
     │   or serving)    │
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │   COMPLETED      │
     │  (delivered/     │
     │   served/paid)   │
     └─────────────────┘
```

**State machine rules:**
- `pending → confirmed`: Kitchen accepts order (requires payment for delivery)
- `confirmed → preparing`: Kitchen starts cooking
- `preparing → ready`: Kitchen finishes preparation
- `ready → completed`: Admin marks as paid/collected
- Any non-terminal → `cancelled`: Admin only (kitchen cannot cancel)

### 3.5 Payment Flow

```
                  ┌───────────────────┐
                  │  payment_status    │
                  │  = 'pending'       │
                  └────────┬──────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────▼────────┐    ┌──────────▼─────────┐
    │  Delivery Order   │    │  Pickup / Dine-in  │
    │  Payment required │    │  Pay on collection │
    │  before dispatch  │    │  or after service  │
    └─────────┬─────────┘    └──────────┬─────────┘
              │                         │
    ┌─────────▼─────────┐    ┌──────────▼─────────┐
    │  Admin confirms   │    │  Admin marks paid  │
    │  payment (PATCH)  │    │  on completion     │
    └─────────┬─────────┘    └──────────┬─────────┘
              │                         │
              └────────────┬────────────┘
                           │
                  ┌────────▼────────┐
                  │ payment_status  │
                  │ = 'paid'        │
                  └─────────────────┘
```

**Payment verification rule:** Delivery orders require `payment_status === 'paid'` before the kitchen can transition from `pending` to `confirmed`. Pickup and dine-in orders can be processed without payment.

### 3.6 Server-Authoritative Pricing

```
Customer sends: { items: [{ menu_item_id: "abc", quantity: 2 }] }
                                        │
Server looks up: menu_items_supabase    │
  WHERE id = 'abc' → price: "85.00"     │
  Resolves sizes/add-ons from JSON       │
  Computes: linePrice * quantity         │
  Sets: total = server-side computed     │
                                        │
Customer's submitted price: IGNORED     │
Server's computed price: USED           │
                                        │
Result: items_json = { items: [{         │
  menu_item_id: "abc",                   │
  name: "Burger",                        │
  price: 85.00,                          │
  quantity: 2,                           │
  subtotal: 170.00                       │
}], metadata: {} }                       │
total: 170.00                            │
```

### 3.7 Idempotency Protection (Duplicate Order Prevention)

**Two-layer deduplication:**

1. **In-memory (5-second window):** `isDuplicateSubmission()` tracks recent idempotency keys. Returns "Duplicate submission detected" for identical keys within 5 seconds.
2. **Database (unique index):** `idempotency_key` column with partial unique index `WHERE idempotency_key IS NOT NULL`. Duplicate key returns existing order.

**Order reference format:** `BOMA-YYMMDD-XXXXXXXX` (date + 8 hex chars)

### 3.8 Allowed PATCH Fields

Only these fields can be updated via PATCH:

`customer_name`, `phone`, `order_type`, `requested_time`, `status`, `items_json`, `table_number`, `delivery_address`, `payment_status`, `payment_confirmed_at`, `payment_confirmed_by`, `waiter_name`

Items in `items_json` cannot be modified — only metadata can be updated.

---

## 4. KITCHEN AUDIT

### 4.1 Kitchen Display System (`/admin/kitchen`)

**Authentication:** Dual-layer:
1. Client-side PasswordGate asking for kitchen password
2. Middleware checks `boma_kitchen_auth` or `boma_admin_auth` cookie
3. On 401 from orders API: shows "Session expired" banner

**Display:** 3-column Kanban board

```
┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│   NEW ORDERS     │ │    IN PREP      │ │      READY       │
│   (pending)      │ │ (confirmed +    │ │   (ready)        │
│    Yellow bg     │ │  preparing)     │ │    Green bg      │
│                  │ │   Blue bg       │ │                  │
│  ┌────────────┐  │ │  ┌───────────┐  │ │  ┌────────────┐  │
│  │ ACCEPT btn │  │ │  │Start Prep │  │ │  │ Auto-clear │  │
│  │ (if paid)  │  │ │  │button    │  │ │  │ in X min   │  │
│  └────────────┘  │ │  └───────────┘  │ │  └────────────┘  │
└──────────────────┘ └─────────────────┘ └──────────────────┘
```

### 4.2 Kitchen Actions

| Button | Keyboard | Status Transition | Condition |
|--------|----------|-------------------|-----------|
| ACCEPT | `1` | pending → confirmed | Non-dine-in must have payment='paid' |
| Start Prep | `2` | confirmed → preparing | None |
| Mark Ready | `3` | preparing → ready | None |
| (auto) | — | ready → completed | After 5 minutes idle |

**What kitchen CANNOT do (enforced server-side):**
- Cancel orders (returns 403)
- Modify payment status (returns 403)
- Change customer details (name, phone, order_type, address, waiter, table — returns 403)
- Delete orders (admin only)

### 4.3 Kitchen Order Card Details

Each card shows:
- Order reference number (e.g., `BOMA-250615-AB12CD34`)
- Order type badge (Pickup/Delivery/Dine-in) with color coding
- Payment status badge (Paid/Awaiting Payment)
- Time since order was placed
- Customer name
- Waiter name (red, for dine-in)
- Table number (red, for dine-in)
- Items list with quantities
- Special notes (yellow section for item notes, red section for order notes)

### 4.4 Real-Time Architecture

```
┌───────────────────┐
│   Kitchen Page     │
│   (Browser)        │
├───────────────────┤
│ 1. Initial fetch:  │──── GET /api/supabase/orders
│ 2. Supabase        │──── postgres_changes subscription
│    Realtime        │     (INSERT + UPDATE on orders)
│ 3. Fallback:       │──── Polling every 5 seconds
│    (if sub fails)  │
└───────────────────┘
```

### 4.5 Audio Notifications
- **New order:** 880 Hz sine beep (0.4s) — when previously unseen `pending` order appears
- **Order ready:** 660 Hz triangle chime (0.6s) — when order transitions to `ready`
- Sound can be toggled on/off

### 4.6 Keyboard Navigation
- `←` `→`: Move between columns
- `↑` `↓`: Move between cards
- `1`: Accept selected order (pending → confirmed)
- `2`: Start preparing selected order (confirmed → preparing)
- `3`: Mark selected order as ready (preparing → ready)

---

## 5. WAITER AUDIT

### 5.1 Waiter Page (`/waiter`)

**Purpose:** Mobile-optimized dine-in order creation for wait staff.

**Authentication:** Client-side PasswordGate → `POST /api/admin/auth` with `role: 'waiter'` → sets `boma_waiter_auth` cookie. Middleware now validates this cookie and protects the `/waiter/` page.

### 5.2 Order Creation Flow

```
Step 1: Select Table
  └─ Click table number (1-20 grid)
  └─ Select waiter name from dropdown (fetched from /api/waiters/active)

Step 2: Add Items
  └─ Category chips (horizontal scroll)
  └─ Search bar
  └─ Items grid — tap to add (default quantity 1)
  └─ Cart icon with count in header bar

Step 3: Review
  └─ Cart items with quantities (+/- buttons)
  └─ Per-item notes field
  └─ Order notes field
  └─ Total display
  └─ Submit button → POST /api/supabase/orders

Step 4: Done
  └─ Success message with order reference
  └─ "New Order" button resets everything
```

### 5.3 What Waiter Orders Include

```json
{
  "customer_name": "Table 7",
  "phone": "waiter-order",
  "order_type": "dine-in",
  "requested_time": "ASAP",
  "items": [
    { "menu_item_id": "abc", "quantity": 2 },
    { "menu_item_id": "def", "quantity": 1 }
  ],
  "table_number": "7",
  "waiter_name": "John"
}
```

### 5.4 Limitations
- Only dine-in orders (no pickup/delivery via waiter)
- Customer name is always "Table N" (auto-generated)
- Phone is always "waiter-order" (placeholder)
- No size/add-on selection on menu items
- No order editing after submission
- Cart saved to localStorage (survives page refresh)
- No payment handling on waiter page

---

## 6. TRACKING SYSTEM AUDIT

### 6.1 Customer Tracking (`/track-order`)

**Purpose:** Public order tracking page — enter order reference, see live status.

**How it works:**
1. User enters order reference (e.g., BOMA-250615-XXXX)
2. `GET /api/track-order?ref=BOMA-XXXX` returns limited order data
3. Displayed fields: customer_name, total, status (with human label), payment_status, order_type, waiter_name, table_number, created_at

**Status labels shown to customer:**
- pending → "New"
- confirmed → "Accepted"
- preparing → "Preparing"
- ready → "Ready"
- completed → "Completed"
- cancelled → "Cancelled"

### 6.2 Receipt Page (`/receipt/[ref]`)

**Purpose:** Full order receipt visible via link.

**Authentication options:**
1. **Phone verification:** Enter phone number → compared with stored phone → redirect with `?verified=true`
2. **Admin/Kitchen session:** Bypasses phone verification — full details shown
3. **Admin/kitchen but phone-verified:** Same as #2

**Phone verification flow:**
1. Form submits to `POST /api/receipt/verify`
2. Server looks up order by `order_ref`, compares normalized phone numbers
3. On match: redirect to `/receipt/[ref]?verified=true`
4. On mismatch: HTML alert "Phone number does not match this order"

**Data shown on receipt:**
- Order reference, customer name, items, total, status, order type
- Waiter name + table number (for dine-in)
- **Sensitive fields hidden from non-authed:** delivery_address, phone

**Rate limiting:** `track-order` endpoint is rate-limited by IP (10 req/60s). Receipt verify is not rate-limited (form-based, but could be abused).

---

## 7. SECURITY AUDIT

### 7.1 Summary Table

| Finding | Severity | Status | Details |
|---------|----------|--------|---------|
| Bar menu data does not persist | Medium | Unfixed | All CRUD is local state — lost on refresh |
| CMS upload folder not whitelisted | Medium | Unfixed | `/api/cms/upload` accepts any `folder` param |
| No audit logging | Medium | Unfixed | Sensitive actions not logged |
| Rate limiting is in-memory (per-instance) | Low | Unfixed | Resets on server restart, doesn't work across Vercel instances |
| Inquiries table still in SQLite | Low | Known | Not migrated to Supabase — may exist in old DB |
| page_content table only in SQLite | Low | Known | Not migrated to Supabase |
| Server-computed pricing in orderService | ✅ Secure | Fixed | Prices resolved server-side from DB |
| Middleware API protection | ✅ Secure | Fixed | 401 JSON for unauthorized API access |
| Waiter auth at middleware level | ✅ Secure | Fixed | Added in commit 730c0d8 |
| Kitchen restrictions in PATCH handler | ✅ Secure | Fixed | Kitchen cannot cancel/modify payment |
| Role headers as identity tokens | ✅ Secure | Fixed | x-user-role, x-auth-valid, x-user-scope |
| Idempotency dedup (dual-layer) | ✅ Secure | Fixed | Memory + DB unique index |
| Rate limiting on order/contact/booking POST | ✅ Secure | Fixed | 10 req/60s per IP |
| Phone normalization + comparison (receipt) | ✅ Secure | Fixed | Handles multiple SA formats |
| Order field whitelist (PATCH) | ✅ Secure | Fixed | Only ALLOWED_PATCH_FIELDS can be updated |
| NO dev mode bypass in middleware | ✅ Secure | Fixed | Removed in previous audit |

### 7.2 Exposed Paths (Public)

These paths require NO authentication:

| Path | Method | Risk |
|------|--------|------|
| `/api/menu/public` | GET | Low — only returns active/available items |
| `/api/cms/public` | GET | Low — returns public CMS data (settings, events, gallery) |
| `/api/track-order` | GET | Low — rate-limited, returns limited fields |
| `/api/receipt/verify` | POST | Low — requires phone match |
| `/api/supabase/orders` | POST | **Medium** — rate-limited, could be used to create fake waiter orders |
| `/api/supabase/bookings` | POST | Low — rate-limited, creates booking requests |
| `/api/supabase/contact` | POST | Low — rate-limited, creates contact messages |
| `/api/admin/auth` | POST | Low — login endpoint (password required) |
| `/api/waiters/active` | GET | Low — returns waiter names only |
| `/waiter` | Page | **Medium** — now has middleware protection (commit 730c0d8) |

### 7.3 Critical Security Concern: Public Order POST

The `POST /api/supabase/orders` endpoint is publicly accessible (rate-limited only). This means:
- Anyone can create orders with any `waiter_name` and `table_number`
- Anyone can create fake orders to disrupt kitchen operations
- No server-side verification that `waiter_name` matches an authenticated session

**Mitigation:** Rate limiting (10 req/60s) limits blast radius, but a persistent attacker could create 10 orders per minute.

**Recommended fix:** Add waiter-auth verification for dine-in orders or create a separate authenticated waiter order endpoint.

---

## 8. DATABASE AUDIT

### 8.1 Supabase Tables (PostgreSQL)

#### `orders` — Core order data (16 columns)
| Column | Type | Purpose | Risk |
|--------|------|---------|------|
| id | UUID PK | Unique order identifier | None |
| customer_name | TEXT NOT NULL | Customer name | None |
| phone | TEXT NOT NULL | Contact number | PII — exposed on receipt with verification |
| order_type | TEXT CHECK | pickup/delivery/dine-in | None |
| requested_time | TEXT NOT NULL | When customer wants order | None |
| items_json | TEXT NOT NULL | Order items + metadata | Large — could grow |
| total | NUMERIC(10,2) | Server-computed total | Single source of truth |
| status | TEXT CHECK | State machine status | None |
| payment_status | TEXT CHECK | pending/paid/refunded | None |
| payment_confirmed_at | TIMESTAMPTZ | When payment confirmed | None |
| payment_confirmed_by | TEXT | Who confirmed payment | Audit trail |
| order_ref | TEXT UNIQUE | Public reference (BOMA-...) | Unique — used for tracking |
| table_number | TEXT | Dine-in table assignment | None |
| delivery_address | TEXT | Delivery location | Sensitive — hidden from non-authed |
| waiter_name | TEXT | Waiter who served | None |
| idempotency_key | TEXT (unique index) | Dedup key | Partial unique index |

**Relationships:** FK to `order_events(order_id)` via cascade delete
**Realtime:** Yes (publication `supabase_realtime`)

#### `order_events` — Audit log (7 columns)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Unique event ID |
| order_id | UUID FK → orders(id) ON DELETE CASCADE | Related order |
| event_type | TEXT | Type: ORDER_CREATED, ORDER_CONFIRMED, etc. |
| from_status | TEXT | Previous status |
| to_status | TEXT | New status |
| created_by | TEXT | Who triggered (admin/kitchen/system) |
| metadata | JSONB | Extra data (order_ref, total) |

**Risks:** None — append-only audit log. Growing table, but no pagination implemented.

#### `bookings` — Table reservations (11 columns)
Standard booking fields (name, phone, email, date, time, guests, notes, status, created_at).

**Risk:** No automated cleanup of old bookings.

#### `contact_messages` — Contact form submissions (8 columns)
name, phone, email, subject, message, is_read, read_at, created_at.

**Risk:** No rate limit on bulk MARK_READ operations (PATCH).

#### `waiters` — Staff list (4 columns)
id, name, active, created_at.

**Risk:** No auth on waiter API (admin-only via `requireAdmin`).

#### CMS Tables (10 tables created in migration 015)
- `site_settings`, `menu_categories`, `menu_items`, `events`, `last_week_highlights`
- `promotions`, `gallery`, `gallery_boards`, `popup`, `announcement`

All have public read + service-role write RLS policies. Safe — public can read, only admin client can write.

### 8.2 SQLite Tables (Legacy — `data/cms.db`)

**Still present but not actively used for CMS:** After migration 015, all CMS data reads/writes go through Supabase. SQLite `data/cms.db` still exists but is no longer the backing store.

**Two tables NOT migrated to Supabase:**

| Table | Content | Risk |
|-------|---------|------|
| `inquiries` | Contact form inquiries with read tracking | Data loss if SQLite file is deleted |
| `page_content` | Key-value page content storage | Unknown if any code still reads this |

### 8.3 Database Risks Summary

| Risk | Severity | Mitigation |
|------|----------|------------|
| No pagination on orders query | Medium | Will slow down with 10k+ orders |
| No pagination on any CMS list | Medium | Same issue |
| order_events grows unbounded | Low | No retention policy |
| SQLite file still present | Low | Not connected to runtime |
| Two menu_items tables (overlap) | Low | CMS menu_items is the canonical one |

---

## 9. PRODUCTION READINESS SCORECARD

### 9.1 Scoring (0-10)

| Subsystem | Score | Justification |
|-----------|-------|---------------|
| **Orders** | **8/10** | Server-authoritative pricing, idempotency, state machine, rate limiting. Missing: audit logging, pagination. |
| **Kitchen** | **9/10** | Real-time updates, keyboard nav, audio alerts, auto-cleanup. Sound UX. Minor: no cancel button available (by design). |
| **Waiter** | **7/10** | Clean UX, step-by-step flow, cart recovery. Missing: size/add-on selection, payment handling. |
| **Admin** | **7/10** | Full CMS coverage, analytics, booking management. Bar menu is BROKEN (local only). Site-settings has 100+ fields with no validation. |
| **Tracking** | **8/10** | Rate-limited, phone verification for receipts, status labels. Missing: real-time updates (requires page refresh). |
| **CMS** | **8/10** | Fully migrated to Supabase, persistent across deploys. No image storage solution (lost on Vercel redeploy). |
| **Authentication** | **9/10** | 3-role cookie auth, middleware protection, API guards. Missing: rate limiting on login endpoint, no brute-force protection. |
| **Database** | **8/10** | Well-structured, 15 migrations, RLS policies, realtime enabled. Legacy SQLite still present. Two menu_items tables could cause confusion. |

### 9.2 Overall Score: **8/10**

**Passes production checks:**
- ✅ All API routes have auth guards
- ✅ Middleware protects admin + API paths
- ✅ Server-authoritative pricing (no client trust)
- ✅ Idempotency for order creation
- ✅ Rate limiting on public write endpoints
- ✅ State machine for order transitions
- ✅ Kitchen role restrictions enforced server-side
- ✅ Phone verification for receipt access
- ✅ Build completes with zero errors
- ✅ 58/58 static pages generate successfully
- ✅ Middleware compiles at 28 kB

**Fails production checks:**
- ❌ No audit logging
- ❌ Bar menu data is client-only (lost on refresh)
- ❌ No login rate limiting (brute-force possible)
- ❌ No pagination on order/CMS lists
- ❌ Image uploads lost on Vercel redeploy
- ❌ In-memory rate limit resets on restart
- ❌ Dual database (SQLite + Supabase) for legacy tables

---

## 10. STAFF TRAINING MANUAL

### 10.1 ADMIN MANUAL

#### How to Process Orders

1. Navigate to **Admin → Orders** (`/admin/orders`)
2. The 3-panel view shows:
   - **Left:** Table grid — click a table number to filter orders
   - **Center:** Order cards — click to select
   - **Right:** Checkout panel — payment and completion
3. **To confirm payment:** Select order → click "Confirm Payment"
4. **To mark as paid and complete:** Select order → choose payment method (Cash/Card/Mobile) → click "Mark Paid (METHOD)"
5. **To print receipt:** Click "Print Receipt" button on completed orders
6. **To assign a table:** Use the dropdown on undesignated orders

#### How to Manage Menu

1. Navigate to **Admin → Menu** (`/admin/menu`)
2. **Add item:** Click "+ Add Item" → fill form (name, price, category, image) → Save
3. **Edit item:** Click pencil icon on item → modify fields → Save
4. **Delete item:** Click trash icon → confirm → deleted
5. **Image upload:** Click file input → select image → preview appears → Save
6. **Categories:** Navigate to **Admin → Categories** (`/admin/categories`) to create/edit/delete categories
7. **Items without a category** won't appear on the public menu

#### How to Manage Promotions

1. Navigate to **Admin → Promotions** (`/admin/promotions`)
2. **Add promotion:** Click "+ Add Promotion" → fill title, description, dates, CTA → Save
3. **Set display locations:** Check boxes for Homepage, Popup, Promotions Page, Menu
4. **Active toggle:** Set `isActive` checkbox to enable/disable
5. **Delete:** Click trash icon → confirm

#### How to Manage Events

1. Navigate to **Admin → Events** (`/admin/events`)
2. **Tabs:** Upcoming Events (future), Past Events (archived), Last Week Highlight (homepage video)
3. **Add event:** Switch to correct tab → "+ Add Event" → fill form → Save
4. **Cover image:** Paste URL (not file upload) — must be hosted elsewhere
5. **Gallery images:** One URL per line in the gallery textarea
6. **Reorder:** Use drag handles (PATCH bulk reorder)

#### How to Handle Bookings

1. Navigate to **Admin → Bookings** (`/admin/bookings`)
2. **Search:** By customer name
3. **Filter:** By status (All/Pending/Confirmed/Cancelled/Completed)
4. **Confirm:** Click "Confirm" on pending booking → customer's table is reserved
5. **Cancel:** Click "Cancel" → booking cancelled
6. **Complete:** Click "Mark Completed" after the event
7. **Delete:** Click "Delete" → removes from database entirely (use sparingly)

#### How to Approve Payments

1. Navigate to **Admin → Orders** (`/admin/orders`)
2. Find the order with "Awaiting Payment" badge
3. Select the order card
4. If customer paid by EFT/cash in person: click "Confirm Payment"
5. The order is now released for kitchen processing (delivery) or can be completed (pickup/dine-in)
6. **Note:** Payment confirmation is manual — the system does NOT integrate with any payment processor

#### How to Use Site Settings

1. Navigate to **Admin → Site Settings** (`/admin/site-settings`)
2. **9 tabs:** Homepage, About, Experience, Entertainment, Venue Hire, Contact, Promo Bar, Branding, SEO
3. Edit any text fields — changes appear immediately on the public website
4. Click "Save [Tab] Settings" to persist each tab's changes
5. **Images:** Use externally hosted URLs (or upload via Gallery → copy URL → paste into settings)
6. **Promo Bar:** The yellow/orange announcement strip at the top of every page

### 10.2 KITCHEN MANUAL

#### How to Access Kitchen Display

1. Go to `/admin/kitchen` in the browser
2. Enter the **kitchen password** (provided by management)
3. The 3-column Kanban board loads automatically

#### How to Receive Orders

1. **Audio alert:** A "ding" sound plays when a new order arrives
2. **Visual:** A yellow-bordered card appears in the "NEW ORDERS" column
3. **Card shows:** Order reference, items with quantities, special instructions, time elapsed
4. **Payment status:** Delivery orders show "Awaiting Payment" or "Paid" badge
5. **IMPORTANT:** Non-dine-in orders must have "Paid" badge before you can accept them

#### How to Process Orders

**Keyboard shortcuts (fastest way):**
- `1` = Accept (pending → confirmed)
- `2` = Start Prep (confirmed → preparing)
- `3` = Mark Ready (preparing → ready)
- `←` `→` = Move between columns
- `↑` `↓` = Move between cards

**Button method:**
1. **Accept:** Click "ACCEPT" on a new order → moves to "IN PREP" column
2. **Start Prep:** Click "Start Prep" → order is being cooked
3. **Mark Ready:** Click "Mark Ready" → order moves to "READY" column
4. **Auto-complete:** Ready orders automatically complete after 5 minutes (fade-out animation)

#### What Kitchen CANNOT Do

- ❌ Cancel orders (only admin can cancel)
- ❌ Modify payment status
- ❌ Change customer name, phone, or address
- ❌ Change order type
- ❌ Delete orders

### 10.3 WAITER MANUAL

#### How to Access Waiter Page

1. Go to `/waiter` on any tablet or phone
2. Enter the **waiter password** (provided by management)
3. The waiter order screen loads

#### How to Create Dine-In Orders

**Step 1: Select Table**
- Tap the table number (1-20 grid)
- Select your name from the "Your Name (Waiter)" dropdown

**Step 2: Add Items**
- Browse by category (chips at top)
- Use search to find items
- Tap item to add to cart (quantity 1)
- Cart count shows in header

**Step 3: Review**
- Adjust quantities (+ / - buttons)
- Add item notes if needed
- Add order notes (e.g., "Extra napkins")
- Check the total

**Step 4: Submit**
- Tap "Send to Kitchen" button
- Wait for confirmation
- Show customer their order reference

#### How to Assign Tables

- Done automatically during Step 1 (table selection)
- To change: go back to Step 1
- Multiple orders can be sent to the same table

#### What Happens After Submission

- Order appears in Kitchen Display System (NEW ORDERS column)
- Kitchen staff accept and prepare the order
- Waiter can see status on receipt/tracking page
- Order cannot be edited after submission

#### Limitations

- ❌ Cannot edit an order after it's sent
- ❌ Cannot cancel an order (ask manager)
- ❌ Cannot take payments
- ❌ Cannot create pickup or delivery orders
- ❌ Only dine-in orders supported

### 10.4 MANAGER MANUAL

#### How to Supervise Operations

1. **View Dashboard** (`/admin/dashboard`): See all stats at a glance
2. **Check Orders** (`/admin/orders`): Monitor all orders, payments, table assignments
3. **Check Kitchen** (`/admin/kitchen`): See what kitchen is working on (you have same access)

#### How to Approve Payments

1. Navigate to **Admin → Orders**
2. Find the order with unpaid status
3. Select the order
4. Click "Confirm Payment" to mark as paid
5. This releases delivery orders for kitchen processing

#### How to Cancel Orders

1. Navigate to **Admin → Orders** (kitchen cannot cancel)
2. Find the order
3. **Cancellation is via API** — use PATCH with `status: 'cancelled'`
4. The order moves to cancelled state; kitchen is notified
5. Note: Kitchen CANNOT cancel orders; this is admin-only

#### How to Edit Orders

- **Name/phone/type/address:** Use PATCH via API (limited fields)
- **Items:** Cannot be changed after creation (for audit integrity)
- **Payment status:** Can be updated (pending → paid → refunded)
- **Waiter/table assignment:** Can be updated after creation

**Non-editable:** Items list, total price, order reference, timestamps

#### How to Manage Staff (Waiters)

1. Navigate to **Admin → Waiters** (`/admin/waiters`)
2. **Add waiter:** Type name → click "+ Add" or press Enter
3. **Toggle on duty:** Click green/red circle
4. **Edit name:** Click pencil icon → type new name → press Enter or click away
5. **Remove waiter:** Click trash icon → confirm in the modal
6. **Deletion preserves history:** Past orders still show the waiter's name

---

## 11. KNOWN BUGS

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | **Bar menu data lost on refresh** — All 84 drinks + any modifications stored in React state only. No persistence. | **High** | Unfixed |
| 2 | **CMS upload folder not validated** — `/api/cms/upload` accepts any `folder` string (defaults to 'misc'), unlike `/api/upload/gallery` which validates against a whitelist. Path traversal possible if folder contains `../`. | **Medium** | Unfixed |
| 3 | **Inquiries table still in SQLite** — Admin Inquiries page reads from `/api/supabase/contact` (contact_messages) but `cmsService.getInquiries()` reads from SQLite. Inquiries API route reads from cms-supabase library. Data inconsistency possible. | **Medium** | Known |
| 4 | **Vercel image uploads ephemeral** — Gallery file uploads to `public/gallery/` and CMS uploads to `public/uploads/` are stored on the server's filesystem, which is read-only on Vercel serverless functions. Files will be lost on redeploy or scale-to-zero. | **High** | Known |
| 5 | **Rate limit resets on server restart** — In-memory Map-based rate limiting doesn't persist across instances. On Vercel (multi-instance), rate limit is per-instance, not global. | **Low** | Known |
| 6 | **No pagination on orders list** — `GET /api/supabase/orders` returns ALL orders. Will become slow/unusable with 10k+ records. | **Medium** | Unfixed |
| 7 | **No pagination on bookings/contact lists** — Same issue. | **Low** | Unfixed |
| 8 | **No form validation on site-settings** — 100+ fields, no required-field validation, no field-type validation. Empty strings saved without warning. | **Low** | Unfixed |
| 9 | **order_events grows unbounded** — No retention/cleanup policy. Will accumulate infinitely. | **Low** | Unfixed |
| 10 | **Waiter order POST is unauthenticated** — `POST /api/supabase/orders` has no server-side waiter verification. The `waiter_name` field is user-supplied, not validated against an authenticated session. | **Medium** | Known |
| 11 | **No login rate limiting** — `POST /api/admin/auth` has no rate limiting. Brute-force attack possible on admin/kitchen/waiter passwords. | **Critical** | Unfixed |
| 12 | **Kitchen page polls without auth check** — After initial auth, the polling loop does not re-verify auth. If cookie is manually cleared, polling continues until a 401 response. | **Low** | Unfixed |

### Live API Audit Findings (3 August 2026)

The following bugs were discovered during a live production curl audit of every public and admin API endpoint. All endpoints returned correct HTTP status codes and data shapes; these are logic-layer issues found by analyzing the responses.

| # | Bug | Severity | Status | Evidence |
|---|-----|----------|--------|----------|
| 13 | **Order error sanitization hides real DB errors** — `POST /api/supabase/orders` catch block (lines 206-208 of `src/app/api/supabase/orders/route.ts`) blanket-sanitizes ALL non-duplicate errors to `"Failed to create order"`. When `createOrder()` or `splitAndCreateOrders()` returns a specific error (e.g. `"Bar item not found: <uuid>"`, `"Menu item not found: <uuid>"`, `"Invalid price for item: <name>"`, `"Size \"X\" not found for item: <name>"`), the client receives the generic message instead. This hides actionable validation feedback from the user (they see "Failed to create order" when the real problem is a bad menu item ID or missing price). Only split-order partial failures expose the real error (line 485 of `orderService.ts`). | **High** | Pending fix | Live audit: mixed-station order (kitchen item + bar item from food menu) failed with `"Failed to create order"` instead of the real error `"Bar item not found: <uuid>"`. |
| 14 | **Station split logic fails for food-menu bar items** — `splitItemsByStation()` in `src/lib/pos/orderService.ts:204-215` routes any item with `station: "bar"` to the bar order. `enrichItems()` then looks up the bar item by ID in the `bar_items` table via `getBarItemsByIds()`. However, food menu items (`menu_items_supabase`) that have `station: "bar"` do NOT exist in `bar_items` — their UUID is a `menu_items_supabase` UUID, not a `bar_items` UUID. Result: the bar split order fails with `"Bar item not found: <uuid>"`. This means cocktails/drinks ordered from the food menu (which carry `station: "bar"`) cannot be processed in a mixed-station order. Only items that exist in both tables (or were explicitly given a `bar_item_id`) work. | **Critical** | Pending fix | Live audit: order with `[{menu_item_id: "<food-menu-uuid>", station: "bar"}, {menu_item_id: "<kitchen-uuid>"}]` — kitchen order succeeded, bar order failed with `"Bar item not found: 0b161e24-..."`. The `0b161e24` ID is from `menu_items_supabase`, not `bar_items`. |
| 15 | **Background jobs worker not running in production** — The `background_jobs` table has 5 jobs in `dead_letter` status and 8 `completed` (from local worker test runs). No worker process is deployed anywhere. The booking submit endpoint queues PDF generation jobs that nothing processes — customers and admins never receive quotation PDFs or notification emails until the worker is deployed. The enqueue RPC (migration 060) works correctly; the gap is purely operational (no worker host). | **Critical** (operational) | Known | Live: `GET /api/background-jobs/stats` → `{pending:0, processing:0, completed:8, failed:0, dead_letter:5}`. All 8 completed jobs were from local worker test sessions; no production worker exists. |
| 16 | **Import preview shows 437 errors on real data** — `GET /api/inventory/imports` shows a recent import (`df4d7e24`) with `rowCount: 429, matchedCount: 2, unknownCount: 435, errorCount: 437`. The Excel import matched only 2 of 429 rows. This indicates the product matching algorithm is too strict or the Excel column headers don't match the expected template format. Not a code bug per se, but a data quality / UX issue — the user sees 437 errors with no clear guidance on how to fix them. | **Medium** | Known | Live: import history shows 3 recent imports, all `status: "previewed"` (none applied), worst one with 437 errors. |
| 17 | **Idempotency for non-duplicate errors is destructive** — When `createOrder()` returns a non-duplicate error (e.g. enrichment failure), the route returns 400. But the `idempotency_key` was never written to the DB (no row was inserted). A retry with the same `idempotency_key` will NOT be detected as a duplicate — it will re-attempt the full flow. This is correct behavior for a transient error (retry should work), but for a permanent error (bad menu item ID), the user can retry infinitely and get the same error. No rate limit or max-retry counter on the idempotency key itself. | **Low** | Known | By design — idempotency only protects successful inserts. |

---

## 12. RECOMMENDED IMPROVEMENTS

### Critical (0-1 month)

1. **Add login rate limiting** — Brute-force protection on `/api/admin/auth`. 5 attempts per IP per minute with incremental backoff.
2. **Fix bar menu persistence** — Migrate bar menu data to either CMS (`menu_items` with a 'drinks' category) or Supabase storage.
3. **Migrate inquiries + page_content** — Move remaining SQLite tables to Supabase or confirm no code references them.
4. **Deploy background jobs worker** — No worker is running in production. Booking PDFs + emails are queued but never processed. Deploy `dist/jobs/index.js` to Railway/Fly/Render (see `oracle-runbook.md`).
5. **Fix station-split for food-menu bar items** (Bug #14) — `enrichItems()` should look up items with `station:"bar"` but no `bar_item_id` in `menu_items_supabase` (like kitchen items) rather than `bar_items`. They keep `station:"bar"` for routing/display but use food-menu pricing.
6. **Expose real order errors to client** (Bug #13) — Replace the blanket `"Failed to create order"` sanitization with an allow-list of safe error messages from `createOrder()`/`splitAndCreateOrders()`. Strip DB-internal details but preserve user-actionable messages like `"Menu item not found"` and `"Invalid price for item: <name>"`.

### High (1-3 months)

4. **Implement audit logging** — Log every order status change, payment action, and login attempt to `order_events` (for orders) and a new `audit_log` table (for non-order actions).
5. **Add pagination to orders API** — Limit to 50 per page, add cursor/offset support with `page` parameter.
6. **Move image uploads to Supabase Storage** or Cloudflare R2/S3. All file upload routes should write to object storage, not local filesystem.

### Medium (3-6 months)

7. **Create authenticated waiter order endpoint** — Add `/api/waiters/orders` that validates the waiter cookie and rejects orders with mismatched waiter names.
8. **Replace in-memory rate limiting** — Use Vercel KV (Redis) or Supabase for distributed rate limiting across instances.
9. **Add CMS upload folder whitelist** — Same pattern as `upload/gallery`.
10. **Add form validation to site-settings** — Required field indicators, field-type validation, preview modals.

### Low (6-12 months)

11. **Add order_events retention policy** — Archive events older than 90 days.
12. **Add real-time order tracking** — Use Supabase Realtime or WebSockets for live tracking page updates.
13. **Add receipt email/SMS** — Send order confirmation and receipt links via email or WhatsApp.
14. **Add payment gateway integration** — Yoco, PayFast, or similar for online payments.
15. **Implement shift-based staff logins** — Replace shared passwords with individual accounts.

---

*End of System Audit & Operator Manual*
