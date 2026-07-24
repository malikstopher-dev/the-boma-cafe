# Booking & Quotation System — Architecture & Implementation Plan

**Project:** The Boma Café, Sandton
**Document Version:** 1.0
**Status:** Draft — Pending Review

---

## 1. Current Project Assessment

### 1.1 Website Completion

The existing website is production-ready with the following pages:
- Homepage, About, Experience, Entertainment, Events/Venue Hire, Contact, Menu, Bar Menu, Gallery, Promotions, Track Order, Receipt
- Staff PWA: Kitchen display, bar display, waiter POS, chat, admin
- Admin CMS: 22 screen areas, full CRUD for menu, events, promotions, gallery, content

### 1.2 CMS Completion

The CMS at `/admin/` is fully operational with:
- **9 site-settings tabs:** Homepage, About, Experience, Entertainment, Venue Hire, Contact, Promo Bar, Branding, SEO
- **Content management:** Menu items, categories, bar menu, events, promotions, gallery, popup, announcement
- **Operations:** Orders (POS), kitchen display, bar display, bookings (basic), inquiries, waiters
- **Staff:** Messages/chat, analytics, marketing studio
- **Design system:** Custom token-based UI at `src/components/admin/design-system/` (12 components)

The existing admin layout uses a sidebar with navigation groups. New admin pages follow a consistent pattern: client component, fetch data from API route, render with design system components.

### 1.3 Existing Database (Relevant to Bookings)

The only booking-related table is a simple `bookings` table (migration 001):

```sql
bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This table supports basic table reservations only. It has no concept of:
- Booking types (birthday, wedding, corporate, etc.)
- Venue areas (indoor, outdoor, VIP, private room)
- Packages (food, drinks)
- Add-ons
- Pricing
- Quotations
- Payments
- Customer accounts

Other existing tables that are relevant:
- `site_settings` — key-value store, used for CMS settings
- `menu_items_supabase` — server-authoritative menu pricing (could inform package pricing pattern)
- `staff_profiles`, `staff_sessions`, `staff_audit_log` — auth and audit patterns to reuse
- `orders` — POS order workflow, useful reference for status state machine pattern

### 1.4 Existing Reusable Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `BookingModal.tsx` | `src/components/ui/BookingModal.tsx` | Simple modal form — will be replaced by multi-step wizard |
| `booking.tsx` | `src/lib/booking.tsx` | Basic context provider + modal trigger — will be extended |
| `Booking` type | `src/types/supabase.ts` | Simple 11-field interface — needs complete redesign |
| Admin design system | `src/components/admin/design-system/` | Button, Card, Input, Badge, Toast, Skeleton, EmptyState, PageHeader, ConfirmDialog |
| Admin layout | `src/app/admin/layout.tsx` | Sidebar + main content + ToastProvider pattern |
| API route pattern | `src/app/api/supabase/bookings/route.ts` | GET/POST/PATCH/DELETE with auth guards and rate limiting |
| Sidebar navigation | `src/components/admin/Sidebar.tsx` | Nav groups with items — extend for booking management |
| Auth middleware | `src/middleware.ts` | Cookie-based admin auth + PIN-based staff auth |
| `cms-supabase.ts` | `src/lib/cms-supabase.ts` | Supabase data layer pattern (getAllSettings, CRUD helpers) |
| `client-cms.ts` | `src/lib/client-cms.ts` | Client-side fetch wrappers pattern |
| RLS pattern | Migration 001 | anon INSERT + authenticated SELECT/UPDATE/DELETE |

### 1.5 Notable Discrepancies (Stack vs. Assumptions)

| Category | Assumed | Actual |
|----------|---------|--------|
| Next.js | 15 | **14.2.3** |
| Styling | TailwindCSS + shadcn/ui | **CSS custom properties + CSS modules + custom design system** |
| Database | Supabase PostgreSQL | Supabase PostgreSQL (correct) |

The booking system should follow the actual project conventions (CSS custom properties, custom admin components, Next.js 14 App Router patterns), not the assumed stack.

---

## 2. Booking System Scope (Version 1)

### In Scope

| Feature | Priority | Notes |
|---------|----------|-------|
| Multi-step booking wizard | P0 | 8-step form on a dedicated `/book-event` page |
| Booking type selection | P0 | Customer picks from defined types (birthday, wedding, corporate, etc.) |
| Venue area selection | P0 | Indoor, outdoor, VIP, private room, entire venue |
| Date/time/duration selection | P0 | With basic availability checking |
| Guest numbers (adults/children) | P0 | Separate counts for pricing |
| Food package selection | P0 | Bronze, Silver, Gold, Custom — prices from DB |
| Drink package selection | P0 | Cash bar, open bar, premium, soft drinks, cocktail |
| Add-ons selection | P0 | DJ, photographer, cake, flowers, decoration, etc. |
| Live quotation engine | P0 | Real-time price calculation as selections change |
| Customer details form | P0 | Name, phone, email, company, special requests |
| Availability checking | P0 | Basic venue/date conflict detection |
| Quotation PDF generation | P1 | Branded PDF with pricing breakdown |
| Admin booking management | P0 | Full CRUD, status workflow, filtering, search |
| Admin quotation review | P0 | View, approve, reject quotations |
| Admin pricing editor | P0 | Edit venue/package/add-on prices without code |
| Booking status workflow | P0 | Draft → Quote → Awaiting Deposit → Confirmed → Completed → Cancelled |
| Email notifications | P1 | Customer + admin notification on new booking |
| Deposit payment architecture | P1 | Payment gateway integration design (implementation in Phase 2) |
| Customer portal | P2 | View quote, download PDF, pay deposit, check status |

### Out of Scope for V1

- Online payment processing (Phase 2)
- Promo codes / discount codes
- Seasonal / peak pricing
- Corporate accounts
- Multi-language support
- Recurring bookings
- Waitlist
- Calendar sync (Google/Outlook)
- Public API

---

## 3. Database Changes

### 3.1 New Tables Required

Each table is described with its purpose. SQL generation comes after plan approval.

#### `booking_types`
Lookup table for event/booking categories (Birthday, Wedding, Corporate, etc.). Each type can have different minimum/maximum guests and default pricing rules.

**Why:** The system must support multiple booking categories with distinct rules. Hardcoding types would break the no-code CMS requirement.

#### `venues`
The restaurant's bookable venues (e.g., "Main Restaurant"). For V1 this is likely a single venue, but the schema supports multiple.

**Why:** Enables future expansion (e.g., the Bisou El Patrona lounge as a separate bookable venue).

#### `venue_areas`
Areas within a venue (Indoor, Outdoor, VIP, Private Room, Entire Venue). Each has capacity limits, base price, and duration-based pricing.

**Why:** Customers choose an area, not just a venue. Pricing differs by area.

#### `food_packages`
Pre-set food packages (Bronze, Silver, Gold, Custom) with per-person pricing. Different weekday/weekend rates.

**Why:** Package pricing is the main revenue driver. Must be configurable without code.

#### `drink_packages`
Drink packages (Cash Bar, Open Bar, Premium, Soft Drinks, Cocktail Package) with flat or per-person pricing.

**Why:** Drinks are priced separately from food. Different pricing models (per-person vs. flat rate).

#### `addons`
Optional extras (DJ, Photographer, Cake, Flowers, Decoration, Security, Projector, Generator, Kids Area, Live Band, MC, Cleaning, Parking). Each has a flat or per-guest price.

**Why:** Add-ons significantly affect the total. Must be toggleable and individually priced.

#### `addon_categories`
Grouping for add-ons (e.g., "Entertainment", "Decor", "Services"). Used for organized display in the booking form.

**Why:** Improves UX — 15+ add-ons need logical grouping in the wizard.

#### `pricing_rules`
Dynamic pricing overrides: weekday/weekend multipliers, minimum spend, guest minimums/maximums, deposit percentage, tax rate.

**Why:** Pricing rules change frequently (December, public holidays). Must be DB-driven, not hardcoded.

#### `availability`
Records of booked date/time/area combinations. Used to check conflicts.

**Why:** Core to availability checking — avoids double-booking areas.

#### `blocked_dates`
Dates or date ranges where a venue/area is unavailable (maintenance, private events, public holidays).

**Why:** Restaurant staff need to block dates without creating fake bookings.

#### `customers`
Customer profile data separate from booking records. Tracks phone, email, company, booking history, total spend.

**Why:** Enables customer portal login, history viewing, and marketing. Decouples customer data from individual bookings.

#### `quotes`
Quotations generated from booking selections. Stores calculated totals, line items, deposit amount, balance, validity period, status.

**Why:** The quotation is a distinct entity — it has its own lifecycle (draft, sent, accepted, expired, converted). Separating from bookings allows multiple quotes per booking request.

#### `quote_items`
Individual line items on a quotation (venue area, food package × guests, drink package × guests, each add-on). Stores description, quantity, unit price, total.

**Why:** Enables detailed PDF breakdown and audit trail. Line items must be frozen at quote time even if prices change later.

#### `payments`
Payment records: amount, method (PayFast, Ozow, Yoco, Stripe, Peach Payments), status, transaction reference, deposit flag.

**Why:** Tracks deposits and balances. Payment gateway integration is Phase 2, but the schema must support it from the start.

#### `booking_status_history`
Audit log for status changes on bookings/quotes/payments. Stores previous status, new status, changed by, timestamp, reason.

**Why:** Audit trail is a security requirement. Also enables customer timeline view.

#### `notification_queue`
Pending notifications to be sent (email, WhatsApp, in-app). Stores recipient, type, template, data payload, status, sent timestamp.

**Why:** Decouples notification sending from booking logic. Enables retry, tracking, and async delivery.

### 3.2 Tables to Extend

#### `bookings` (existing)
Add columns: `customer_id UUID REFERENCES customers`, `booking_type_id UUID REFERENCES booking_types`, `venue_area_id UUID REFERENCES venue_areas`, `duration_hours INTEGER`, `adults INTEGER`, `children INTEGER`, `special_requests TEXT`, `source TEXT` (web, admin, phone).

**Why:** The existing bookings table has the right foundation but lacks fields needed for event bookings. Extending is cleaner than replacing.

Add new statuses: `'draft'`, `'quote_sent'`, `'awaiting_deposit'`, `'deposit_paid'`, `'confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'refunded'`.

#### `site_settings` (existing)
Add booking-related settings keys: `deposit_percentage`, `tax_rate`, `quote_validity_days`, `default_booking_type`, `booking_enabled`, `min_advance_days`, `max_advance_days`.

**Why:** Leverages the existing key-value pattern in `site_settings` rather than creating a new settings table.

### 3.3 Tables NOT Required (Reuse)

- `staff_profiles` — reuse for admin booking management permissions
- `staff_audit_log` — reuse for booking audit events
- `staff_notifications` — reuse for staff booking notification
- `site_settings` — extend for booking configuration

---

## 4. Booking Workflow

### Step-by-Step Customer Journey

```
1. LANDING
   Customer clicks "BOOK EVENT" CTA on website
   → Navigates to /book-event

2. BOOKING TYPE
   Customer selects booking type (Birthday, Wedding, Corporate, etc.)
   → UI shows available types from DB with descriptions and icons

3. DATE, TIME, DURATION
   Customer selects date, arrival time, estimated duration
   → System checks availability on date change (AJAX)
   → Unavailable dates/times are greyed out or show warning

4. GUEST NUMBERS
   Customer enters adult count and children count
   → System validates against venue area capacity
   → Children count may have reduced pricing

5. VENUE AREA
   Customer selects area (Indoor, Outdoor, VIP, Private Room, Entire Venue)
   → Shows capacity, description, base price
   → Unavailable areas are marked (cross-referenced with availability table)

6. FOOD PACKAGE
   Customer selects Bronze / Silver / Gold / Custom
   → Shows per-person price and description
   → Price updates live based on adult count

7. DRINKS PACKAGE
   Customer selects Cash Bar / Open Bar / Premium / Soft Drinks / Cocktail Package
   → Shows pricing model (per-person or flat rate)
   → Price updates live

8. ADD-ONS
   Customer toggles desired extras (DJ, Photographer, Cake, etc.)
   → Each add-on shows price and description
   → Total updates live

9. QUOTATION REVIEW
   Full line-by-line breakdown displayed:
     • Venue Area: R X,XXX
     • Food Package (×N guests): R XX,XXX
     • Drinks Package: R X,XXX
     • Add-on 1: R X,XXX
     • Add-on 2: R X,XXX
     ─────────────────────────
     Subtotal: R XX,XXX
     Deposit (30%): R X,XXX
     Balance: R XX,XXX
   
   Customer can go back to adjust any selection

10. CUSTOMER DETAILS
    Customer enters: Name, Phone, Email, Company (optional), Special Requests
    → Validation on all fields
    → Phone OTP verification (optional V1 enhancement)

11. CONFIRMATION
    Customer accepts quotation
    → System generates quotation record
    → Status: "awaiting_deposit"
    → Email sent with PDF quotation link
    → WhatsApp message sent (if configured)
    → Admin notified via dashboard

12. DEPOSIT (Phase 2)
    Customer redirected to payment gateway
    → Pays deposit amount
    → Status updates to "deposit_paid"
    → Booking confirmed
```

### Booking Status State Machine

```
DRAFT → QUOTE_SENT → AWAITING_DEPOSIT → DEPOSIT_PAID → CONFIRMED → IN_PROGRESS → COMPLETED
                        ↓                  ↓                                           ↓
                     EXPIRED          CANCELLED                                   CANCELLED
                        ↓                  ↓                                           ↓
                     CLOSED            REFUNDED                                   REFUNDED
```

Status transitions:
- Admin can move any booking to CANCELLED
- Full refunds go through REFUNDED
- System auto-expires quotes after N days (configurable in site_settings)
- COMPLETED bookings can be cancelled within a window (e.g., before event start)

---

## 5. Quotation Engine

### 5.1 Pricing Model

The quotation engine is a pure server-side function. The frontend may display live estimates, but the authoritative calculation always happens on the server.

#### Pricing Components

| Component | Unit | Pricing Model | Data Source |
|-----------|------|---------------|-------------|
| Venue Area | Per booking | Flat base price | `venue_areas.base_price` |
| Food Package | Per adult | Per-person × adult count | `food_packages.per_person_price` |
| Children Food | Per child | Per-person × child count (may be 50% of adult) | `food_packages.child_price` or `food_packages.per_person_price × child_multiplier` |
| Drinks Package | Per adult (or flat) | Per-person or flat rate | `drink_packages.pricing_model` + `drink_packages.amount` |
| Add-ons | Per item (or per guest) | Flat fee or per-person | `addons.pricing_model` + `addons.amount` |

#### Price Calculation Formula

```
subtotal = venue_area_price + food_total + drinks_total + sum(addon_prices)
tax = subtotal × tax_rate
total = subtotal + tax
deposit = total × deposit_percentage
balance = total - deposit
```

Where:
- `food_total = food_price_per_adult × adult_count + food_price_per_child × child_count`
- `drinks_total = (drink_package.pricing_model === 'per_person') ? drink_price × adult_count : drink_price`
- `addon_total = addon.pricing_model === 'per_person' ? addon.price × adult_count : addon.price`

### 5.2 Pricing Rules (V1)

For V1, pricing rules are simplified:
- **Weekday vs. weekend:** Each `venue_areas`, `food_packages`, `drink_packages` has separate `weekday_price` and `weekend_price` columns
- **Minimum spend:** Stored on `venue_areas.minimum_spend` — if calculated total is below this, minimum spend is used
- **Minimum/maximum guests:** Stored on `venue_areas` and `booking_types` — form cannot proceed outside these bounds
- **Deposit percentage:** Single global value in `site_settings` (e.g., 30%)
- **Tax rate:** Single global value in `site_settings` (e.g., 0% or 15% VAT)

### 5.3 Discounts (Post-V1)

Discounts are designed into the pricing engine's architecture but not exposed in the V1 UI:
- `pricing_rules` table supports promo code lookups
- Discounts apply at the subtotal level before tax
- Fixed amount or percentage

### 5.4 Real-Time Quotation Display

Flow:
1. Customer changes a selection in the wizard
2. Frontend calculates an **estimated** total using local data (for responsiveness)
3. On each step change, frontend sends selections to server action `/api/booking/calculate-quote`
4. Server validates selections, queries DB prices, returns authoritative breakdown
5. Frontend replaces estimate with server-calculated values
6. On final submission, server recalculates one last time and persists the `quotes` record

---

## 6. Admin CMS Changes

### 6.1 New CMS Screens

#### `/admin/bookings` (Enhanced)

Replace the existing simple bookings page. New features:
- **Status tabs:** All, Drafts, Pending Quotes, Awaiting Deposit, Confirmed, In Progress, Completed, Cancelled
- **Search + filters:** By name, email, phone, date range, booking type, venue area
- **Detail panel:** Click a booking to see full details, quotation, payment status, timeline
- **Actions:** Change status, edit details, resend quotation, view PDF, cancel with reason
- **Timeline:** Visual status history with timestamps and who performed the change

#### `/admin/quotes`

New screen for managing quotations:
- **List view:** All quotes with status, amount, customer, date
- **Filter:** By status (draft, sent, accepted, expired, converted)
- **Detail:** Full line-item breakdown, PDF preview/download
- **Actions:** Send to customer, mark as accepted, mark as expired
- **Resend:** Trigger email with PDF attachment

#### `/admin/availability`

Visual calendar view for managing venue availability:
- **Monthly/weekly/daily view** of each venue area
- **Blocked dates** overlay
- **Existing bookings** shown on calendar
- **Quick block** — click to block a date range with reason

#### `/admin/pricing`

Tab-based pricing editor (follows `site-settings` pattern):
- **Venue Areas tab:** Edit base prices (weekday/weekend), capacities, minimum spend
- **Food Packages tab:** Edit per-person prices (weekday/weekend), child pricing, descriptions
- **Drinks Packages tab:** Edit pricing model and amounts
- **Add-ons tab:** Edit add-on prices, pricing models, toggles
- **Settings tab:** Edit deposit %, tax rate, min/max advance days, quote validity

#### `/admin/blocked-dates`

Simple date range management:
- **List view** of all blocked dates with reason
- **Create** new block: date range, venue area (or all), reason
- **Edit/delete** existing blocks
- **Recurring** option (e.g., "Every Monday")

### 6.2 Sidebar Updates

Add a new navigation group "Bookings" to the sidebar (`src/components/admin/Sidebar.tsx`):

```typescript
{
  label: 'Bookings',
  items: [
    { label: 'Bookings', icon: '📅', href: '/admin/bookings' },
    { label: 'Quotes', icon: '📄', href: '/admin/quotes' },
    { label: 'Availability', icon: '🗓️', href: '/admin/availability' },
    { label: 'Pricing', icon: '💰', href: '/admin/pricing' },
  ],
}
```

Move the existing "Bookings" link from the "Orders" group to this new group.

### 6.3 Site Settings Additions

Add booking-related keys to the existing `site_settings` table:
- `booking:deposit_percentage` — default 30
- `booking:tax_rate` — default 0
- `booking:quote_validity_days` — default 7
- `booking:min_advance_days` — default 1
- `booking:max_advance_days` — default 365
- `booking:auto_confirm` — true/false (auto-confirm on deposit payment)
- `booking:enabled` — true/false (master toggle)

These should be added to a "Booking" tab in the existing `/admin/site-settings` page.

---

## 7. Security

### 7.1 Server-Side Price Calculation

**Principle:** All financial calculations happen server-side only.

- The quotation engine is a pure function (or server action) that queries Supabase for current prices, validates inputs with Zod, and returns the computed total
- The frontend shows estimated prices for UX responsiveness, but the authoritative calculation is always server-side
- The submitted `quotes` record stores frozen line-item data so price changes after quote generation don't affect accepted quotes

### 7.2 Validation (Zod)

Every server endpoint validates input with Zod schemas:
- Booking creation/update
- Quote calculation request
- Price updates
- Status transitions

Example validation rules:
- `adults ≥ 1`, `children ≥ 0`
- `booking_date` must be in the future (within configured range)
- `guests` must be within venue area capacity
- `duration_hours` between 1 and 12
- Email format, phone format (SA numbers)
- Status transitions must follow valid state machine

### 7.3 Permissions

- **Public (anon):** Can create bookings and initiate quote calculations (rate-limited)
- **Admin (authenticated):** Full CRUD on bookings, quotes, pricing, availability
- **Staff (PIN-authenticated):** Read-only on bookings, ability to update status within their scope

Leverages existing auth middleware (`src/middleware.ts`) and role guards (`src/lib/auth/requireRole.ts`).

### 7.4 Audit Logging

Use the existing `staff_audit_log` table pattern for:
- Price edits (who changed what, when, from/to)
- Booking status changes
- Quote generation
- Quote acceptance/rejection
- Payment recording
- Cancellation with reason

Each audit entry stores: `actor_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `timestamp`.

### 7.5 Payment Security Considerations (Phase 2 Ready)

- Never store raw card numbers or payment tokens in our database
- Use payment gateway webhooks for status updates
- Payment verification is server-side (trust webhook signatures, not frontend callbacks)
- Idempotency keys prevent duplicate payment processing
- Rate limiting on payment endpoints

---

## 8. Implementation Phases

### Phase 1: Core Booking & Quotation

**Effort estimate:** 2-3 weeks

| Step | Work Items |
|------|------------|
| 1.1 Database | Create all new tables (migration 034), add columns to `bookings`, seed initial data (venue areas, packages, add-ons) |
| 1.2 Types | Define TypeScript types for all new entities in `src/types/booking.ts` |
| 1.3 Data Layer | Create `src/lib/booking/` with: `types.ts`, `pricing.ts` (quotation engine), `availability.ts` (conflict checker), `validation.ts` (Zod schemas), `quotation-engine.ts` (authoritative calculator) |
| 1.4 API Routes | Create: `POST /api/booking/calculate-quote`, `POST /api/booking/submit`, `GET /api/booking/availability`, `GET /api/booking/types`, `GET /api/booking/packages` |
| 1.5 Booking Wizard | Create `src/app/book-event/` as a dedicated page (replacing the modal approach). Server components for initial data load, client components for the interactive wizard |
| 1.6 Admin Bookings | Enhance existing `/admin/bookings/` page with status tabs, detail panel, timeline |
| 1.7 Admin Pricing | Create `/admin/pricing/` tab-based editor |
| 1.8 Admin Availability | Create `/admin/availability/` calendar view + `/admin/blocked-dates/` |

### Phase 2: Payments & Confirmations

**Effort estimate:** 2-3 weeks

| Step | Work Items |
|------|------------|
| 2.1 Payment Tables | Create `payments` table, extend `bookings` with payment fields |
| 2.2 Payment Gateway | Integrate PayFast as primary gateway (webhooks, redirect flow). Design for multi-gateway pattern |
| 2.3 Deposit Flow | Payment checkout page after quote acceptance, redirect to gateway, webhook processing |
| 2.4 Booking Confirmation | Auto-confirm on successful deposit payment, send confirmation email |
| 2.5 PDF Quotation | Generate PDF using API route (e.g., with `jsPDF` or Puppeteer via API). Branded template with restaurant logo, breakdown, QR code |
| 2.6 Admin Payments | Payment records view in admin, manual payment reconciliation, refund processing |

### Phase 3: Reporting & Customer Portal

**Effort estimate:** 1-2 weeks

| Step | Work Items |
|------|------------|
| 3.1 Customer Portal | Create `/my-bookings/` page with Supabase Auth for customer login. View quotes, pay deposit, download PDF |
| 3.2 Notifications | Email: new booking alert (admin), quote received (customer), confirmation, reminder. WhatsApp: confirmation summary via Twilio or WhatsApp Business API |
| 3.3 Reporting | Admin dashboard widgets: revenue, bookings by type, conversion rate, average spend. Exportable reports (CSV) |
| 3.4 Booking Analytics | Charts: bookings over time, popular packages, peak seasons, customer retention |

---

## 9. Risks

### Identified Before Implementation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Next.js version mismatch** (project uses 14.2.3, not 15) | Low | All planned work is compatible with Next.js 14 App Router. No Next.js 15 features (e.g., `after()`, enhanced `fetch()` caching) are assumed |
| **Tailwind CSS not present** (project uses CSS custom properties) | Low | Build booking wizard UI using the existing CSS custom properties and admin design system. No Tailwind dependency |
| **Existing booking table migration gap** (project has no migration 024-026) | Low | Next migration should be 034 (after existing 033) |
| **No email infrastructure** | Medium | Will need to set up email sending. Options: Supabase Auth email (limited), SendGrid/Mailgun via API route, or Next.js API route with Nodemailer and SMTP |
| **No PDF generation library** | Low | Add `jsPDF` or `@react-pdf/renderer` as dependency. Both work with Next.js 14 |
| **No payment gateway configured** | Low | Phase 2 concern. PayFast is the best SA option. Architecture supports adding later without refactoring |
| **No customer auth system** | Medium | Phase 3 concern. Options: Supabase Auth with magic link (phone or email), or simple token-based access for quotes |
| **Availability conflicts with existing bookings** | Medium | The simple existing `bookings` table stores date+time but not venue area or duration. Migration needs to backfill or coexist during transition |
| **Two CMS backends (SQLite + Supabase)** | Low | New booking tables use Supabase only. No SQLite involvement. This is consistent with the newer pattern |
| **Price validation race condition** | Low | Quote engine runs server-side at submission. Frontend estimates are for display only. If prices change between estimate and submission, the server's calculation is authoritative |

---

## 10. Recommendations

### 10.1 Reusable Patterns for Future Projects

While this plan is specific to The Boma Café, the following modules should be built with clean interfaces so they can be extracted:

| Module | Why Reusable |
|--------|-------------|
| **Quotation engine** (`src/lib/booking/pricing.ts`) | Pure function with inputs (package selections, guest counts, date) and output (line items, totals, deposit). No client-specific logic. Adapts via DB configuration |
| **Multi-step wizard** (`src/app/book-event/`) | Step management (next/prev/validate/persist) is generic. Step definitions and validation rules are configurable |
| **Availability checker** (`src/lib/booking/availability.ts`) | Date × venue area × capacity conflicts. Generic enough for any venue/event system |
| **Booking state machine** | Status transitions with validation. Configurable states and transitions |
| **PDF quotation template** | Brand-agnostic layout with slot-based branding (logo, colors, footer). Swap branding = new client |
| **Admin pricing editor** | Generic key-value or table-based price editing UI. Define schema, get CRUD UI |

### 10.2 What to Keep Client-Specific

These should remain tied to The Boma Café:
- Styling and design tokens (CSS custom properties match the brand)
- Booking wizard copy and descriptions
- Default seed data (venue areas, package names, add-ons)
- Email templates (brand copy)
- PDF branding (logo, colors, typography)

### 10.3 Architectural Decisions for Longevity

1. **All prices in DB, never in code.** The `pricing_rules` table and per-entity price columns ensure no hardcoded constants.

2. **Status transitions as configuration, not if/else chains.** Define valid transitions in a data structure, not scattered across files.

3. **Quotation line items are frozen at creation.** If prices change later, existing quotes still show the quoted amount. This is critical for audit/compliance.

4. **Notification queue pattern.** Don't send emails inline during booking submission. Enqueue a notification record, process via a webhook or cron. This prevents booking failures due to email delivery issues.

5. **Server actions for mutations, API routes for reads.** Use Next.js Server Actions for booking submission and quote calculation (naturally server-side). Use API routes for data fetching (admin CRUD).

6. **Extend existing booking table, don't replace.** Add columns and statuses to the existing `bookings` table. This preserves existing booking records and avoids a migration nightmare.

### 10.4 Pre-Implementation Checklist

Before writing any code:
- [ ] Review and approve this plan
- [ ] Create migration 034 with all new tables
- [ ] Seed initial data (venue areas, packages, add-ons)
- [ ] Install any new dependencies (Zod, date-fns)
- [ ] Create `/book-event` route group structure
- [ ] Set up email sending capability

---

*End of Plan*