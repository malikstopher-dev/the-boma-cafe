# The Boma Café Sandton — Technical Handover Document

> **Date:** 2026-07-22  
> **Author:** Senior SaaS Architect / Next.js 15 + Supabase Engineer  
> **Handover To:** Senior Next.js Developer (Architecture & Planning)  
> **Repository:** `https://github.com/malikstopher-dev/the-boma-cafe`  
> **Branch:** `main`  
> **Last Commit:** `8146f2e` — "Add item image to OptionModal with framer-motion entrance"

---

## 1. PROJECT OVERVIEW

| Property | Value |
|---|---|
| **Project Name** | `the-boma-cafe` |
| **Version** | `0.1.0` (private / pre-1.0) |
| **Frontend** | Next.js `14.2.3`, React `18.3.1`, TypeScript `5.4.5` |
| **Styling** | CSS Modules (NO Tailwind, NO shadcn/ui) |
| **Animation** | Framer Motion `12.40.0` |
| **Database** | Dual: **SQLite** (`better-sqlite3`) for legacy CMS + **Supabase PostgreSQL** for production |
| **Auth** | Custom: cookie-based password auth (4 roles) + PIN-based staff sessions |
| **File Storage** | Supabase Storage (bucket: `boma-images`) + local `public/` directory |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **PDF/QR** | `qrcode` package |
| **Deployment** | Vercel (auto-deploys from `main`) |
| **Supabase Project** | `lyksqvqtiysjttwpgeyw.supabase.co` |

### Key Architectural Decisions

1. **Dual database architecture:** SQLite (`data/cms.db`) serves legacy CMS content, while Supabase PostgreSQL handles orders, bookings, staff, marketing, and CMS migrations. Both are active — data is NOT fully migrated to Supabase yet.
2. **No Tailwind or shadcn/ui:** The project uses CSS Modules with a custom design system (`src/components/admin/design-system/`) with tokens (colors, spacing, typography).
3. **Custom auth, not Supabase Auth:** Password-based role auth with SHA-256 cookies. Supabase is used as the database layer only, not for auth.
4. **Mixed page architecture:** Pages are a mix of Server Components and Client Components (`'use client'`), with most public pages being entirely client-side.
5. **No React Server Components data fetching pattern:** Most data fetching happens via `useEffect` + `fetch()` in client components, not via `async` server components.

---

## 2. FOLDER STRUCTURE

```
the-boma-cafe/
├── data/                          # SQLite CMS database (not in git)
│   └── cms.db
├── public/                        # Static assets (served at /)
│   ├── bar-menu/                  # Bar menu images (PNG + JPG — primary image dir)
│   ├── bar-menu-images/           # Organized by category subfolder (premium AI images)
│   ├── cocktails-and-drinks/      # Legacy drink images (duplicate)
│   ├── gallery/                   # Gallery photos organized by board folder
│   ├── heroes/                    # Hero/slideshow images
│   ├── icons/                     # PWA icons (SVG)
│   ├── images/                    # Site photos (about, buffet, events)
│   ├── menu/                      # Food menu images + our-bar-menu/ subdir
│   ├── uploads/                   # CMS uploads (menu, gallery, events, etc.)
│   ├── videos/                    # Hero background videos
│   ├── logo.png                   # Site logo
│   ├── favicon.ico
│   ├── manifest.json              # PWA manifest
│   └── firebase-messaging-sw.js   # FCM service worker
├── scripts/                       # Seed & utility scripts
│   ├── seed-supabase-menu.ts
│   ├── seed-menu-prices.ts
│   └── clear-orders.sql
├── supabase/
│   └── migrations/                # 33 migration files (001-033, missing 024-026)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout (AuthProvider > CartProvider > BookingProvider)
│   │   ├── page.tsx               # Homepage (515 lines)
│   │   ├── globals.css            # Global styles (2243 lines)
│   │   ├── sitemap.ts             # Dynamic sitemap
│   │   ├── menu/                  # Food menu page (~662 lines)
│   │   ├── bar-menu/              # Bar menu page (server wrapper + BarMenuClient)
│   │   ├── gallery/               # Gallery page with lightbox
│   │   ├── about/                 # About page
│   │   ├── experience/            # Experience page
│   │   ├── entertainment/         # Entertainment page
│   │   ├── contact/               # Contact page with form
│   │   ├── promotions/            # Promotions page
│   │   ├── track-order/           # Order tracking page
│   │   ├── receipt/               # Printable receipt page
│   │   ├── admin/                 # 25 admin pages
│   │   ├── staff/                 # 9 staff PWA pages
│   │   ├── waiter/                # Waiter POS page (611 lines)
│   │   ├── api/                   # 46 API route files
│   │   └── globals.css            # Global CSS (2243 lines)
│   ├── components/                # ~90 components (see §7)
│   ├── lib/                       # ~44 libraries (see §8)
│   ├── types/                     # TypeScript type definitions
│   │   ├── index.ts               # Core types (247 lines)
│   │   └── supabase.ts            # Supabase types (Booking, Order, ContactMessage)
│   └── middleware.ts              # Edge middleware (233 lines)
├── package.json
├── next.config.js                 # Security headers, image optimization
├── tsconfig.json                  # Path alias @/*, strict mode OFF
├── postcss.config.mjs             # Empty (no plugins)
├── .env.local                     # LIVE CREDENTIALS (Supabase, Firebase, passwords)
├── .env.example                   # Template for env vars
└── .opencode/
    └── MEMORY.md                  # Project memory file for AI tools
```

---

## 3. CURRENT FEATURES

### 3.1 Public Website

| Feature | Status | Pages | DB Tables | API Routes | Key Components |
|---|---|---|---|---|---|
| **Homepage** | ✅ | `/` | `site_settings`, `menu_items`, `events`, `promotions`, `announcement`, `popup`, `gallery` | `/api/cms/public`, `/api/menu/public` | `Hero`, `AboutSection`, `FounderSection`, `UpcomingEventsSection`, `AnnouncementBar`, `WeekendBuffetPopup`, `FadeInSection` |
| **Food Menu** | ✅ | `/menu` | `menu_categories`, `menu_items` | `/api/menu/public`, `/api/cms/menu` | `MenuItemCard`, `MenuCategorySection`, `AddOnsBlock`, `SizeSelector`, `PriceDisplay`, `OptionModal` |
| **Bar Menu** | ✅ | `/bar-menu` | `bar_categories`, `bar_items` | `/api/bar/public`, `/api/cms/bar` | `BarMenuClient`, `ItemModal`, `barMenuData.ts` |
| **Gallery** | ✅ | `/gallery` | `gallery`, `gallery_boards` | `/api/cms/gallery`, `/api/gallery/[folder]` | `GalleryBoards`, lightbox |
| **About** | ✅ | `/about` | `site_settings` | `/api/cms/public` | — |
| **Experience** | ✅ | `/experience` | `site_settings`, `events`, `promotions` | `/api/cms/public` | — |
| **Entertainment** | ✅ | `/entertainment` | `site_settings` | `/api/cms/public` | — |
| **Contact** | ✅ | `/contact` | `contact_messages`, `site_settings` | `/api/supabase/contact`, `/api/cms/public` | Form with validation |
| **Promotions** | ✅ | `/promotions` | `promotions` | `/api/cms/promotions` | Promotions hero slider |
| **Order Tracking** | ✅ | `/track-order` | `orders` | `/api/track-order` | Visual status workflow, self-cancellation |
| **Receipt** | ✅ | `/receipt/[ref]` | `orders` | `/api/receipt/verify` | Printable receipt with monospace font |
| **Cart** | ✅ | (modal) | — | `/api/supabase/orders` | `CartButton` (655 lines), `cart.tsx` context |
| **Upsell** | ✅ | (modal) | — | — | `UpsellModal` (310 lines), `upsellData.ts` |
| **Booking Modal** | ✅ | (modal) | `bookings` | `/api/supabase/bookings` | `BookingModal`, `booking.tsx` context |
| **PWA** | ✅ | — | — | — | Service worker, manifest, icons |
| **SEO** | ✅ | All pages | `site_settings` | — | JSON-LD schema, dynamic metadata, sitemap.ts |

### 3.2 Admin CMS

| Feature | Status | Route | Lines | Key Functions |
|---|---|---|---|---|
| **Dashboard** | ✅ | `/admin/dashboard` | ~240 | Stats, quick actions, recent orders, waiter performance |
| **Menu Editor** | ✅ | `/admin/menu` | ~287 | CRUD, search, filter by category, promo badge, featured/promo toggle |
| **Bar Menu Editor** | ✅ | `/admin/bar-menu` | ~368 | Category + item CRUD, multi-price (bottle/single/glass/shot), pickup restriction |
| **Categories** | ✅ | `/admin/categories` | — | Menu category management |
| **Orders (POS)** | ✅ | `/admin/orders` | ~927 | Full POS: table grid, real-time subscriptions, checkout, payment (cash/card/mobile), cancellation, receipt |
| **Kitchen Station** | ✅ | `/admin/kitchen` | ~17 | Renders `StationDisplay` with kitchen config |
| **Bar Station** | ✅ | `/admin/bar` | ~17 | Renders `StationDisplay` with bar config |
| **Staff Chat** | ✅ | `/admin/messages` | ~237 | Conversations, 1-on-1 chat, role-based contacts |
| **Events** | ✅ | `/admin/events` | — | CRUD, reorder, featured/upcoming toggles |
| **Promotions** | ✅ | `/admin/promotions` | — | CRUD, reorder, active dates |
| **Popup** | ✅ | `/admin/popup` | ~111 | Weekend Breakfast Buffet popup config |
| **Announcement** | ✅ | `/admin/announcement` | ~57 | Announcement bar enable/text/link |
| **Gallery** | ✅ | `/admin/gallery` | ~230 | Main gallery CRUD, Local Boards browser, multi-upload |
| **Bookings** | ✅ | `/admin/bookings` | ~110 | Table booking CRUD, status filter, confirm/cancel/complete |
| **Inquiries** | ✅ | `/admin/inquiries` | ~84 | Contact form messages, read/unread, delete |
| **Contact Messages** | ⚠️ | `/admin/contact-messages` | ~125 | Duplicate of inquiries, less polished |
| **Site Settings** | ✅ | `/admin/site-settings` | ~958 | 9 tabs: Homepage, About, Experience, Entertainment, Venue Hire, Contact, Promo Bar, Branding, SEO |
| **Waiters** | ✅ | `/admin/waiters` | ~144 | CRUD, PIN assignment, on/off duty toggle |
| **Analytics** | ✅ | `/admin/analytics` | ~219 | Period selector, revenue/orders charts, top products, order type breakdown |
| **Marketing Studio** | ✅ | `/admin/marketing` | ~531 | 4 tabs: Generator, Projects, Templates, Assets |
| **Design Editor** | ✅ | `/admin/marketing/[projectId]` | ~751 | Canvas editor, elements, properties, export, version history |
| **Content Map** | ✅ | `/admin/content-map` | ~145 | Visual sitemap linking to content pages |

### 3.3 Staff PWA / POS

| Feature | Status | Route | Lines | Notes |
|---|---|---|---|---|
| **Staff Home** | ✅ | `/staff` | 26 | Auto-redirects to role-specific page |
| **PIN Login** | ✅ | `/staff/login` | — | 4-6 digit PIN authentication |
| **Install PWA** | ✅ | `/staff/install` | — | PWA installation instructions |
| **Admin Dashboard** | ✅ | `/staff/admin` | — | |
| **Kitchen Orders** | ✅ | `/staff/kitchen` | — | Renders `StationDisplay` |
| **Bar Orders** | ✅ | `/staff/bar` | — | Renders `StationDisplay` |
| **Staff Chat** | ✅ | `/staff/messages` | — | Full chat UI with real-time |
| **Waiter POS** | ✅ | `/waiter` | 611 | Full POS with menu browsing, cart, order submission, history |
| **Waiter Orders** | ✅ | `/staff/waiter/orders` | — | |
| **Station Display** | ✅ | (component) | 843 | Kanban board: New→Confirmed→Preparing→Packing→Ready, real-time subs + polling, sound effects, keyboard nav |

### 3.4 Infrastructure

| Feature | Status | Notes |
|---|---|---|
| **Security Headers** | ✅ | X-DNS-Prefetch-Control, X-Content-Type-Options, X-Frame-Options (DENY), Referrer-Policy |
| **Image Optimization** | ✅ | Next/Image with AVIF/WebP, remote patterns, 1-year cache TTL |
| **Rate Limiting** | ✅ | In-memory rate limiter (10 req/60s per IP, 60 req per waiter) |
| **Offline Queue** | ✅ | localStorage-based queue with retry (5 max) |
| **Push Notifications** | ✅ | FCM — register, unregister, test, health check endpoints |
| **Realtime** | ✅ | Supabase realtime subscriptions for orders, messages |
| **Console Stripping** | ✅ | `console.*` removed in production builds |
| **SWC Minify** | ✅ | Enabled |
| **Sitemap** | ✅ | Dynamic `sitemap.ts` |
| **PWA** | ✅ | `manifest.json`, `firebase-messaging-sw.js`, icons |

---

## 4. CMS STATUS

### 4.1 What CAN Be Edited From CMS

| Section | Fields | Storage |
|---|---|---|
| **Homepage** | Hero title/subtitle/image, Welcome section, CTA, featured section title/subtitle | SQLite (`site_settings` / `page_content`) + Supabase mirror |
| **About** | Hero title/subtitle/image, intro, full description, mission/values, 2 extra images | Same |
| **Experience** | Hero, Dining section (title/subtitle/description/highlights/image/CTA), Puff Lounge, Family Activities, Weekend Buffet, Video Showcase | Same |
| **Entertainment** | Hero, intro, DJ/Karaoke/Live Performance cards, Vibe section, CTA buttons | Same |
| **Venue Hire** | Hero, intro, 4 venue types (Meetings, Year-End, Weddings, Private Functions), CTA, Events Slideshow toggle | Same |
| **Contact** | Address, 2 phone numbers, email, WhatsApp link, opening hours, Google Maps embed URL | Same |
| **Promo Bar** | Enable toggle, message, button text/link | Same |
| **Branding** | Site name, tagline, logo URL, favicon URL, footer text, social links (FB/IG/Twitter/YT) | Same |
| **SEO** | Meta title/description/keywords/OG image for Homepage, About, Contact | Same |
| **Menu** | Categories (name/description/order/active), Items (name/description/price/image/sizes/add-ons/promo/featured/availability) | Both SQLite + Supabase |
| **Bar Menu** | Categories + Items with multi-price fields (bottle/single/glass/shot), availability, pickup restriction | Supabase |
| **Events** | Title/description/date/time/location/category/images/CTA/visibility/order | Both |
| **Promotions** | Title/description/image/price/CTA/active dates/order/display on homepage | Both |
| **Gallery** | Items with image URL/title/category/featured/order + boards + multi-upload | Both |
| **Popup** | Weekend Buffet: enable, active days (Sat/Sun), start/end time, adult/kids price, title/description/CTA/image | Both |
| **Announcement** | Enable toggle, text, link/link text | Both |
| **Waiters** | Name, employee ID, PIN (4-6 digits), on/off duty | Supabase |
| **Inquiries** | View, mark as read, delete | Both |
| **Marketing Projects** | Create/edit/duplicate/archive, version history, export (PNG/JPG/SVG/PDF/HTML/print) | Supabase |
| **Marketing Assets** | Upload images/videos/fonts/colors, browse, search, URL copy | Supabase Storage |
| **Marketing Templates** | 3 built-in templates (Happy Hour, Weekend Buffet, Live Entertainment) | Supabase |

### 4.2 What Still Requires Code Editing

| Item | Reason |
|---|---|
| **Bar menu item images** | Images are resolved from `barImages.ts` mapping + `public/bar-menu/` directory. Adding a new image requires placing the file and updating the mapping. CMS has no image picker for bar items. |
| **Food menu item images** | Same pattern via `menuImage.ts`. CMS has an image URL text field but no integrated picker. |
| **Layout/header/footer text** | Hardcoded in components (though logo URL, tagline, social links are editable). |
| **Price calculations/ordering logic** | Code-level (menuPricing.ts, order-state-machine.ts, pos/orderService.ts). |
| **Auth passwords** | Environment variables (`ADMIN_PASSWORD`, etc.). Change requires Vercel redeployment. |
| **Email templates** | Not implemented. |
| **PDF quotation templates** | Not implemented. |
| **Payment gateway integration** | Not implemented (currently cash/card/mobile on POS only). |
| **Booking quotation engine** | Not implemented (bookings are simple reservation records with no pricing). |

---

## 5. DATABASE SCHEMA

### 5.1 SQLite Database (`data/cms.db`)

Managed by `src/lib/db.ts` via `better-sqlite3`. Tables created in `initializeTables()`:

| Table | Key Columns | Purpose |
|---|---|---|
| `site_settings` | `id`, `key` (UNIQUE), `value` (JSON), `updated_at` | All editable site settings |
| `menu_categories` | `id`, `name`, `description`, `order_index`, `is_active` | Food menu categories |
| `menu_items` | `id`, `category_id` (FK), `name`, `description`, `price`, `image`, `sizes` (JSON), `add_ons` (JSON), `options` (JSON), `is_available`, `is_featured`, `is_on_promo`, `promo_badge`, `order_index` | Food menu items |
| `events` | `id`, `title`, `description`, `date`, `time`, `location`, `category`, `cover_image`, `gallery_images` (JSON), `status`, `show_on_homepage`, `cta_label`, `cta_link`, `order_index`, `visible` | Events |
| `last_week_highlights` | — | Single-row video highlight |
| `promotions` | `id`, `title`, `description`, `image`, `price_text`, `cta_text`, `cta_link`, `is_active`, `display_on_homepage`, `start_date`, `end_date`, `order_index` | Promotions |
| `gallery` | `id`, `url`, `title`, `category`, `is_featured`, `board_id` (FK), `order_index` | Gallery images |
| `gallery_boards` | `id`, `name`, `description`, `order_index` | Gallery board groupings |
| `popup` | — | Single-row popup config |
| `announcement` | — | Single-row announcement bar |
| `inquiries` | `id`, `name`, `email`, `phone`, `subject`, `message`, `is_read`, `created_at` | Contact form submissions |
| `page_content` | `id`, `page`, `section`, `key`, `value` | Page-specific content |

### 5.2 Supabase PostgreSQL (33 migrations)

**Core Tables:**

| Table | Key Columns | RLS |
|---|---|---|
| `orders` | `id`, `order_ref` (UNIQUE), `customer_name`, `phone`, `order_type`, `status`, `payment_status`, `total`, `items_json` (JSONB), `station`, `parent_order_id`, `table_number`, `waiter_name`, `idempotency_key` (UNIQUE), `source`, `cancellation_reason`, `preparation_time_minutes`, `created_at` | Public INSERT, authenticated UPDATE, admin SELECT (overridden for realtime) |
| `order_events` | `id`, `order_id` (FK), `event_type`, `created_by`, `metadata`, `created_at` | Authenticated |
| `bookings` | `id`, `name`, `phone`, `email`, `date`, `time`, `guests`, `status` (pending/confirmed/cancelled/completed), `notes`, `created_at` | Public INSERT, authenticated full access |
| `contact_messages` | `id`, `name`, `email`, `phone`, `subject`, `message`, `is_read`, `read_at`, `created_at` | Public INSERT, authenticated SELECT |

**Staff & Chat Tables:**

| Table | Key Columns | RLS |
|---|---|---|
| `staff_profiles` | `id`, `user_id` (UUID), `employee_id`, `name`, `role`, `pin_hash`, `pin_salt`, `pin_expires_at`, `failed_attempts`, `locked_until`, `active`, `online`, `last_seen`, `created_at` | Service role only |
| `staff_sessions` | `id`, `staff_id` (FK), `token`, `device_fingerprint`, `expires_at`, `last_active_at`, `signed_out_at` | Service role only |
| `shifts` | `id`, `staff_id` (FK), `start_time`, `end_time`, `status` | Staff read/write |
| `staff_audit_log` | `id`, `actor_id`, `action`, `target_type`, `target_id`, `metadata`, `created_at` | Staff insert/select |
| `manager_approvals` | `id`, `requested_by`, `approved_by`, `action`, `details`, `status`, `created_at`, `resolved_at` | Staff |
| `staff_conversations` | `id`, `is_group`, `created_at` | Member-scoped RLS |
| `staff_conversation_members` | `id`, `conversation_id`, `staff_id`, `last_read_at` | Member-scoped RLS |
| `staff_messages` | `id`, `conversation_id`, `sender_id`, `message`, `message_type`, `voice_url`, `voice_duration`, `read_at`, `created_at` | Realtime (permissive SELECT for realtime) |
| `staff_notifications` | `id`, `user_id`, `title`, `body`, `type`, `conversation_id`, `is_read`, `created_at` | Staff |

**CMS Tables (mirroring SQLite):**

| Table | Key Columns | RLS |
|---|---|---|
| `site_settings` | `id`, `key` (UNIQUE), `value` (JSONB), `updated_at` | Public read, service role write |
| `menu_categories` | Same as SQLite | Same |
| `menu_items` | Same as SQLite | Same |
| `menu_items_supabase` | Augmented with prices for serverless | Service role |
| `events` | Same as SQLite | Same |
| `last_week_highlights` | Same as SQLite | Same |
| `promotions` | Same as SQLite | Same |
| `gallery` | Same as SQLite | Same |
| `gallery_boards` | Same as SQLite | Same |
| `popup` | Same as SQLite | Same |
| `announcement` | Same as SQLite | Same |
| `bar_categories` | `id`, `name`, `description`, `order_index`, `is_active` | Public read, service role write |
| `bar_items` | `id`, `category_id` (FK), `name`, `description`, `bottle`, `single_price`, `glass_price`, `shot_price`, `price`, `image`, `is_available`, `available_for_pickup`, `order_index` | Same |

**Marketing Tables:**

| Table | Key Columns |
|---|---|
| `marketing_projects` | `id`, `name`, `type`, `status`, `dimensions`, `design_data` (JSONB), `locked_by`, `locked_at`, `exports`, `tags`, `campaign`, `archived`, `created_at`, `updated_at` |
| `marketing_project_versions` | `id`, `project_id` (FK), `version`, `design_data` (JSONB), `created_by`, `created_at` |
| `marketing_templates` | `id`, `name`, `type`, `dimensions`, `design_data` (JSONB), `created_at` |
| `marketing_brand_assets` | `id`, `name`, `type`, `url`, `module`, `path`, `metadata`, `tags`, `created_at` |

**Other Tables:**

| Table | Purpose |
|---|---|
| `push_subscriptions` | FCM token storage per user/role |
| `waiters` | Legacy waiter table (separate from `staff_profiles`) |
| `storage.objects` (Supabase managed) | `boma-images` bucket for uploaded assets |

### 5.3 Key Relationships

```
orders.parent_order_id → orders.id              (split orders: kitchen + bar)
order_events.order_id → orders.id               (status change audit trail)
gallery.board_id → gallery_boards.id            (gallery category grouping)
bar_items.category_id → bar_categories.id       (bar menu categorization)
menu_items.category_id → menu_categories.id     (food menu categorization)
marketing_project_versions.project_id → marketing_projects.id
staff_sessions.staff_id → staff_profiles.id
staff_messages.conversation_id → staff_conversations.id
staff_conversation_members.conversation_id → staff_conversations.id
staff_conversation_members.staff_id → staff_profiles.id
```

### 5.4 Indexes

- `orders.order_ref` — UNIQUE index (migration 003)
- `orders.idempotency_key` — UNIQUE (migration 007, redo in 010)
- `order_events.order_id` (migration 023)
- `orders.created_at` (migration 023)
- `orders.status` (migration 023)
- `staff_messages.conversation_id` (migration 033)
- `staff_messages.created_at` (migration 033)

### 5.5 Enums (PostgreSQL)

No formal ENUM types in migrations — status values are stored as strings (e.g., `'pending'`, `'confirmed'`, `'preparing'`, `'packing'`, `'ready'`, `'served'`, `'completed'`, `'cancelled'`, `'rejected'`). Order types: `'dine-in'`, `'pickup'`, `'delivery'`.

### 5.6 Triggers / Functions

None found in migrations. Realtime is enabled at the publication level via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.

### 5.7 Storage

- **Bucket:** `boma-images` (created in migration 017)
- **Public read:** Anyone can read (`USING true`)
- **Write:** Service role only
- **Valid modules:** `menu`, `gallery`, `heroes`, `promotions`, `events`, `logos`, `marketing`, `staff`, `videos`, `temp`
- **Allowed MIME types:** JPEG, PNG, WebP, GIF, SVG, MP4, WebM, PDF
- **Path pattern:** `{module}/{uuid}-{sanitized_filename}.{ext}`

### 5.8 Migration Gap

Migrations 024, 025, 026 are MISSING from the sequence (027 follows 023).

---

## 6. AUTHENTICATION

### 6.1 Dual Auth System

The project has **two parallel authentication systems** that co-exist:

#### System A: Password-Based Role Cookies (Legacy)

| Cookie | Role | Source |
|---|---|---|
| `boma_admin_auth` | admin | `ADMIN_PASSWORD` env var |
| `boma_kitchen_auth` | kitchen | `KITCHEN_PASSWORD` env var |
| `boma_waiter_auth` | waiter | `WAITER_PASSWORD` env var |
| `boma_bar_auth` | bar | `BAR_PASSWORD` env var |

- **Flow:** Login at `/admin/login` → POST to `/api/admin/auth` with `{ password, role }` → timing-safe compare → set HttpOnly cookie with SHA-256 hash of `{role}:{password}`.
- **Session:** No expiry (persists until browser close or explicit logout).
- **Logout:** Clears all cookies via `/api/admin/auth?action=logout`.

#### System B: PIN-Based Staff Sessions (Newer)

| Cookie | Source |
|---|---|
| `boma_staff_session` | Supabase `staff_sessions` table |

- **Flow:** Staff enters employee ID + 4-6 digit PIN at `/staff/login` → POST to `/api/staff/pin-login` → verify PIN hash → create session record → set `boma_staff_session` cookie + role-specific cookie.
- **Session:** 8-hour hard expiry, 30-minute inactivity timeout. Middleware auto-clears expired sessions.
- **Roles:** `admin`, `kitchen`, `waiter`, `bar`, `manager`.
- **PIN Management:** Set via `/admin/waiters` page. Reset requires manager PIN approval (2-factor).

### 6.2 Middleware Protection

`src/middleware.ts` runs at Edge on all protected routes:

- **Protected prefixes:** `/admin/*`, `/waiter/*`, `/staff/*`, `/api/admin/*`, `/api/cms/*`, `/api/waiters/*`, `/api/gallery/*`, `/api/upload/*`, `/api/supabase/*`, `/api/staff/*`
- **Public exceptions:** `/admin/login`, `/staff/login`, `/staff/install`, `/api/cms/public`, `/api/menu/public`, `/api/bar/public`, `/api/track-order`, `/api/receipt/verify`, `/api/staff/pin-login`, `/api/staff/list`, `/api/staff/session`, `/api/supabase/orders` (POST), `/api/supabase/contact` (POST), `/api/supabase/bookings` (POST)
- **Role scoping:** `admin:full`, `kitchen:orders`, `bar:orders`, `waiter:orders` — set as `x-user-scope` header.
- **Unauthenticated API:** Returns `401 { error: 'UNAUTHORIZED' }`.

### 6.3 Protected Route Access Matrix

| Path | Allowed Roles |
|---|---|
| `/admin/*` (general) | admin only |
| `/admin/login` | public |
| `/admin/kitchen` | admin, kitchen |
| `/admin/bar` | admin, bar |
| `/admin/messages` | admin, kitchen, bar, waiter |
| `/staff/*` (general) | any authenticated |
| `/staff/login`, `/staff/install` | public |
| `/waiter/*` | admin, waiter (optional auth) |

### 6.4 API Route Auth Helpers

From `src/lib/auth.ts` and `src/lib/auth/requireRole.ts`:
- `getRoleFromHeaders()` — fast path via `x-user-role` header (set by middleware)
- `getSession()` — cookie-based with role precedence (admin > kitchen > bar > waiter)
- `requireRole()`, `requireAnyRole()`, `assertAuthenticated()`, `requireRoleFromHeadersOrSession()`
- `requireAdmin()`, `requireKitchen()`, `requireAdminOrKitchen()`, `requireBar()`, `requireAdminOrKitchenOrBar()`, `requireWaiter()`, `requireAnyRole()`

### 6.5 Security Considerations

- **Timing-safe comparison** for passwords and PINs
- **Rate limiting** on login (10 attempts/IP), PIN login (per IP + per employee), order creation, contact form
- **SHA-256 hashing** for cookies
- **RLS policies** as defense-in-depth (bypassed by service role in API routes)
- **`X-Frame-Options: DENY`** prevents clickjacking
- **HttpOnly cookies** prevent XSS cookie theft
- **No Supabase Auth used** — custom auth means no built-in JWT refresh, password reset, or MFA

---

## 7. IMAGE SYSTEM

### 7.1 Where Images Are Stored

| Directory | Purpose | Naming Convention |
|---|---|---|
| `public/bar-menu/` | Primary bar menu images (31 PNG, 140+ JPG) | Lowercase kebab-case (e.g., `mojito.png`) |
| `public/bar-menu-images/` | Premium AI-generated images organized by category subfolder | Lowercase kebab-case |
| `public/cocktails-and-drinks/` | Legacy drink images (duplicates) | Title-Case with hyphens |
| `public/menu/` | Food menu images (lowercase) + `our-bar-menu/` subdir (Title-Case) | Mixed conventions |
| `public/gallery/` | Gallery photos by board folder | Uploaded with timestamp prefix |
| `public/images/` | Site photos (about, buffet, events, hero, live music) | Descriptive names |
| `public/hero/` | Hero/slideshow images + video backgrounds | Descriptive names |
| `public/logo.png` | Site logo | Single file |
| `public/uploads/` | CMS uploads (menu, gallery, events, etc.) | `{timestamp}-{sanitized-name}` |
| **Supabase Storage** (`boma-images`) | Marketing assets, staff voice notes | `{module}/{uuid}-{name}` |

### 7.2 How Image Resolution Works

#### Food Menu (`menuImage.ts`)
- `getMenuItemImage(name)` → checks `LEGACY_IMAGE_MAP` → falls back to `slugify(name)` looking in `menu/`, `cocktails-and-drinks/`, etc. → final fallback image.
- `getMenuImage(drinkName)` → resolves drink/bar items via `getBarImage()`.

#### Bar Menu (`barImages.ts`)
- `getBarImage(drinkName, category)` → Priority: adminImage > `drinkSlugMapOurBarMenu` > `drinkSlugMap` > `BAR_FALLBACK`.
- `getBarMenuItemImage(itemName, categoryName)` → Priority: `barMenuItemMap` (exact match) → `drinkSlugMapOurBarMenu` → `drinkSlugMap` → null.

### 7.3 Upload Flow

1. **Admin CMS uploads:** File → multipart POST to `/api/cms/upload` or `/api/upload/gallery` → validates MIME type + size (10MB max) → saves to `public/uploads/{folder}/` → returns public URL.
2. **Marketing Studio uploads:** File → multipart POST to `/api/cms/marketing` → saves to Supabase Storage `boma-images/{module}/` → returns public URL.
3. **Staff voice notes:** Audio → POST to `/api/staff/voice-upload` → generates signed upload URL → client uploads directly to Supabase Storage.

### 7.4 Next/Image Optimization

- **Formats:** AVIF + WebP (with automatic fallback)
- **Device sizes:** 640, 750, 828, 1080, 1200, 1920
- **Image sizes:** 16, 32, 48, 64, 96, 128, 256, 384
- **Cache TTL:** 1 year (`minimumCacheTTL: 31536000`)
- **Remote patterns:** Unsplash, Pexels, Wikimedia
- **Static file caching:** `/images/*` and `/videos/*` set to `public, max-age=31536000, immutable`

### 7.5 Known Issues

- **Duplicate image directories** with overlapping content and different naming conventions
- **No centralized image management** — images added to `public/bar-menu/` also need code changes in `barImages.ts`
- **Gallery images** are stored both in `public/gallery/` (local files) and referenced in DB — no sync mechanism
- **No image optimization pipeline** for uploaded images (they're served as-is)

---

## 8. SITE ARCHITECTURE

### 8.1 App Router Structure

```
src/app/
├── layout.tsx          # Root layout (HTML, fonts, providers, cart, scroll, analytics)
├── page.tsx            # Homepage (515 lines, client component)
├── globals.css         # 2243 lines of global styles, variables, responsive
├── sitemap.ts          # Dynamic SEO sitemap
├── [page]/             # Standard page groups (menu, bar-menu, gallery, etc.)
│   ├── layout.tsx      # Optional SEO metadata layouts
│   ├── page.tsx        # Page content (mostly 'use client')
│   └── *.module.css    # CSS Module per page
├── admin/              # 25 admin pages
├── staff/              # 9 staff PWA pages
├── waiter/             # 1 waiter POS page
├── api/                # 46 route handler files
└── track-order/        # Public order tracking
```

### 8.2 Root Layout Provider Chain

```
<html>
  <body>
    <AuthProvider>                   // Admin auth context (login/logout/session)
      <CartProvider>                  // Cart state + localStorage persistence
        <BookingProvider>            // Booking modal trigger
          <CartButton />             // Floating cart button + modal
          <ScrollToTopButton />      // Scroll progress indicator
          <ScrollArrows />           // Up/down scroll jumps
          <MobileBottomBar />        // Mobile call/WhatsApp/menu quick actions
          {children}
        </BookingProvider>
      </CartProvider>
    </AuthProvider>
  </body>
</html>
```

### 8.3 Contexts

| Context | File | Purpose |
|---|---|---|
| `AuthProvider` / `useAuth()` | `src/lib/auth-context.tsx` | Admin auth state, login/logout |
| `CartProvider` / `useCart()` | `src/lib/cart.tsx` | Cart items, totals, order type, localStorage persistence |
| `BookingProvider` / `useBookingModal()` | `src/lib/booking.tsx` | Booking modal trigger |

### 8.4 Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useScrollAnimation()` | `src/lib/hooks/useScrollAnimation.ts` | IntersectionObserver scroll visibility |
| `useParallax()` | `src/lib/hooks/useScrollAnimation.ts` | Parallax scroll effect |

### 8.5 Data Fetching Strategy

**Current pattern (mostly client-side):**
- `useEffect(() => { fetch('/api/...').then(r => r.json()).then(setData) }, [])` — used in most pages
- `cmsService.getAllSettings()` — client-side wrapper around fetch calls
- `getPublicCMSData()` — Supabase admin client call (server-side, but consumed via API route)
- `ISR` used only on `/api/menu/public` and `/api/bar/public` with `revalidate: 60`

**No Server Components data fetching** (no `async` component with direct DB access).

### 8.6 Caching Strategy

- **Next/Image:** 1-year cache TTL
- **Static files:** 1-year immutable cache (`/images/*`, `/videos/*`)
- **API routes:** No caching headers (except menu/bar public endpoints with ISR)
- **Client side:** No SWR/React Query/TanStack Query — raw fetch + local state
- **Supabase Realtime:** Active subscriptions for orders and messages (with polling fallback)

### 8.7 Services Layer

| Service File | Purpose |
|---|---|
| `db.ts` | SQLite CRUD for all CMS entities |
| `cms-supabase.ts` | Supabase mirror of `db.ts` API |
| `client-cms.ts` | Client-side fetch-based CMS service |
| `supabase.ts` | Supabase client factory (admin + browser) |
| `storage.ts` | Supabase Storage CRUD |
| `auth.ts` | Server-side auth helpers |
| `auth-context.tsx` | Client-side auth context |
| `auth/requireRole.ts` | Request-level role guards |
| `cart.tsx` | Cart context + persistence |
| `booking.tsx` | Booking modal context |
| `pos/orderService.ts` | Order creation logic (enrich items, split stations, dedup) |
| `pos/validateOrder.ts` | Order input validation |
| `pos-service.ts` | Client-side POS API wrapper |
| `order-state-machine.ts` | Order status transition rules |
| `whatsappConfig.ts` | WhatsApp URL + message generation |
| `offline-queue.ts` | Offline order queue with retry |
| `rate-limit.ts` | In-memory rate limiter |
| `menuImage.ts` | Menu image resolution |
| `barImages.ts` | Bar image resolution |
| `menuPricing.ts` | Menu pricing calculation |
| `menu-prices.ts` | Supabase price lookup |
| `upsellData.ts` | Upsell suggestion rules |
| `notifications/push.ts` | FCM push notification dispatching |
| `firebase/client.ts` | Client Firebase init |
| `firebase/admin.ts` | Server Firebase Admin init |
| `staff/auth.ts` | Staff PIN auth helpers |
| `staff/session.ts` | Staff session lifecycle |
| `staff/permissions.ts` | Role-based permission matrix |
| `staff/audit.ts` | Staff audit logging |
| `marketing/types.ts` | Marketing project types |
| `marketing/templates.ts` | Built-in design templates |
| `marketing/permissions.ts` | Marketing role permissions |
| `marketing/generators.ts` | Canvas-based design renderer |

---

## 9. PERFORMANCE

### 9.1 Current Optimizations

| Area | Status | Details |
|---|---|---|
| **Image Optimization** | ✅ | Next/Image with AVIF/WebP, responsive sizes, 1-year cache |
| **Bundle Size** | ⚠️ | No bundle analysis available. All pages are `'use client'` (no RSC benefits). |
| **SWC Minify** | ✅ | Enabled |
| **Console Stripping** | ✅ | `console.*` removed in production |
| **Compression** | ✅ | `compress: true` |
| **Code Splitting** | ⚠️ | Only 1 dynamic import (`FcmRegistration`). Most components imported statically. |
| **Lazy Loading** | ❌ | Not implemented for page sections |
| **Suspense** | ❌ | Not used anywhere |
| **Streaming** | ❌ | Not implemented |
| **Server Components** | ❌ | All pages use `'use client'` |
| **ISR** | ⚠️ | Used only on 2 API routes (menu/bar public) |
| **Static Generation** | ❌ | No `generateStaticParams` or static pages |
| **Prefetching** | ✅ | Link prefetch enabled by default |
| **CSS Modules** | ⚠️ | Files are per-component; no CSS-in-JS runtime overhead but no critical CSS inlining |
| **Font Loading** | ⚠️ | Google Fonts (Playfair Display + Poppins) loaded via standard `<link>` tags in layout |
| **Database** | ⚠️ | SQLite queries are synchronous (blocks the event loop). Supabase queries are async. |

### 9.2 Areas Needing Improvement

1. **Convert client components to Server Components** where possible (most public pages read CMS data via `useEffect` — could be async server components)
2. **Add Suspense boundaries** for loading states
3. **Implement lazy loading** for below-fold sections
4. **Add bundle analysis** and code splitting for large admin pages
5. **Implement React Query or SWR** for client-side data fetching with caching
6. **Evaluate SQLite vs Supabase** — synchronous `better-sqlite3` calls in API routes block the Node.js event loop

---

## 10. RESPONSIVE DESIGN

### 10.1 Mobile Strategy

- **CSS Modules** with media queries at standard breakpoints (768px, 480px)
- **Global CSS** defines CSS custom properties for spacing, colors, typography
- **Mobile navigation:** No hamburger menu on public pages. Header uses `MobileBottomBar` component with fixed bottom bar (Call, WhatsApp, Menu buttons)
- **Admin responsive:** Sidebar hidden below 768px, replaced by `BottomNav` (5 tabs)
- **Staff PWA:** Full-height `100dvh` layouts with `env(safe-area-inset-bottom)` for notched phones
- **POS:** Card/touch-friendly UI, large buttons, bottom navigation

### 10.2 Mobile-Only Components

| Component | Description |
|---|---|
| `MobileBottomBar` | Fixed bottom bar with Call, WhatsApp, Menu action buttons |
| `BottomNav` (admin) | 5-tab bottom nav for admin pages on mobile |
| Floating cart button | Fixed position on mobile (overlaid via CSS classes, not React component) |

### 10.3 Known Responsive Issues

- Food menu page (`menu/page.tsx`) has no dedicated mobile layout — desktop and mobile share same component
- Gallery lightbox may not be fully touch-optimized
- No mobile-specific hero video optimization (though `OptimizedHero` switches to poster image on mobile)
- POS waiter UI is mobile-first but the admin orders page (927 lines) is desktop-only

---

## 11. COMPLETION CHECKLIST

### ✅ Completed

- [x] Homepage with hero, about, signature dishes, events, promotions, testimonials
- [x] Food menu with categories, item cards, add-to-cart, sizes, add-ons, special instructions
- [x] Bar menu with categories, multi-price items, modal with image + options
- [x] Gallery with boards, lightbox, filtering
- [x] About page
- [x] Experience page with 4 pillars, weekend buffet, video section
- [x] Entertainment page (DJ, Karaoke, Live Performances)
- [x] Contact page with form + Google Maps
- [x] Promotions page with hero slider
- [x] Order tracking with visual status workflow + self-cancellation
- [x] Receipt page (printable)
- [x] Cart modal with customer details, order type toggle, WhatsApp + online submission
- [x] Upsell modal with suggestions, variants, add-ons
- [x] Full admin CMS: site settings (9 tabs), menu, bar menu, gallery, events, promotions, popup, announcement
- [x] Admin dashboard with stats, quick actions, recent orders
- [x] Admin orders (POS): table grid, real-time, checkout, payment processing
- [x] Kitchen/Bar station displays: kanban board, real-time, sound effects, keyboard nav
- [x] Admin analytics: revenue charts, top products, order breakdown
- [x] Admin marketing studio: project management, design editor, version history, export
- [x] Staff PIN-based authentication system
- [x] Staff chat: conversations, real-time messages, voice notes
- [x] Waiter POS: menu browsing, cart, order submission, history
- [x] PWA support (manifest, service worker)
- [x] Push notifications (FCM registration + dispatch)
- [x] SEO: JSON-LD schema, dynamic metadata, sitemap
- [x] Security headers, rate limiting
- [x] Offline order queue with retry
- [x] Supabase realtime for orders + messages
- [x] Dual database (SQLite + Supabase) with migration path

### ⚠️ In Progress / Partial

- [ ] **Supabase CMS migration** — SQLite tables mirrored in Supabase (migration 015) but dual reads still active. Cutover not complete.
- [ ] **Bar menu images** — 31 new images added, but 5+ items still missing photos (Belgravia Gin & Dry Lemon, Black Crown Gin, Breeder Watermelon, Brutal Fruit Litchi)
- [ ] **Duplicate admin pages** — `inquiries/page.tsx` and `contact-messages/page.tsx` serve same purpose
- [ ] **Image naming cleanup** — 3+ competing conventions across directories

### ❌ Planned / Not Started

- [ ] Booking & Quotation Engine
- [ ] Payment gateway integration
- [ ] PDF quotation generation
- [ ] Email automation
- [ ] Customer portal
- [ ] Multi-language support
- [ ] Blog / news section
- [ ] Privacy policy / terms pages
- [ ] Reviews / ratings system
- [ ] Loyalty program
- [ ] Inventory management
- [ ] Staff scheduling / shifts
- [ ] API documentation

---

## 12. KNOWN ISSUES

### Critical

1. **Live credentials in `.env.local`** — Supabase service role key, Firebase private key, and admin passwords are stored in plain text. This file is in `.gitignore` but any developer with local access has full database and storage access.
2. **SQLite synchronous I/O** — `better-sqlite3` calls are synchronous and block the Node.js event loop. Under load, this will degrade performance.
3. **No input validation on CMS API routes** — Most CMS routes use `req.json()` directly without Zod/validation. Malformed data could corrupt the database.

### High

4. **Mixed image naming conventions** — 3+ conventions (Title-Case, lowercase-kebab, mixed) across `public/bar-menu/`, `public/cocktails-and-drinks/`, `public/menu/our-bar-menu/`. This causes confusion and potential 404s in production.
5. **Duplicate admin pages** — `inquiries` and `contact-messages` both display contact form messages with different UI quality. One should be removed.
6. **Missing migrations 024-026** — Gap in the migration sequence could cause issues if new migrations reference tables/indexes created in the missing ones.
7. **No database seed verification** — `seed-menu`/`seed-bar`/`seed-gallery` API routes check for existing data but the logic is inconsistent. Running them multiple times could create duplicates.

### Moderate

8. **`types.ts` `PageContent` interface is outdated** — The interface only defines `home` and `about` sections, but site-settings manages 9 sections with 70+ fields.
9. **`BAR_PASSWORD` missing from `.env.example`** — New developers may not know this env var exists.
10. **Strict mode OFF** — `tsconfig.json` has `strict: false`, allowing `any` types and null safety issues.
11. **No test suite for public pages** — Only POS components and auth have tests. Public pages have zero test coverage.
12. **No error boundaries on public pages** — A rendering error could crash the entire page.
13. **CartButton is 655 lines** — The component handles cart display, customer form, validation, order submission, WhatsApp flow, and success screen. Should be split.
14. **MenuPage is 662 lines** — The OptionModal is defined inline, making the file hard to maintain. Should be a separate component.

### Low

15. **No loading skeletons on public pages** — Content appears via flash-of-content pattern (empty state → populated).
16. **Popover references to `global is not defined` in `Webpack`** — Firebase Messaging may cause SSR issues (partially handled with `isSupported()` check).
17. **No 404 page** — Unmatched routes show Next.js default 404.
18. **Hardcoded WhatsApp number** — `BUSINESS_INFO` in `whatsappConfig.ts` contains the restaurant's WhatsApp number as a string.
19. **Terms & conditions / privacy policy** — Not implemented. Important for booking system legality.
20. **No cookie consent banner** — Required for GDPR/PAIA compliance (South Africa).

---

## 13. REMAINING ROADMAP (Prioritized)

### P0 — Must Have Before Booking System

1. **Database unification** — Complete Supabase migration. Remove SQLite dependency. All CMS data should live exclusively in Supabase.
2. **Input validation** — Add Zod schemas for all API routes, especially CMS and booking endpoints.
3. **Secrets management audit** — Ensure `.env.local` is never committed. Use Vercel environment variables for all secrets.
4. **Migration gap resolution** — Investigate and recreate missing migrations 024-026.
5. **Strict mode enablement** — Enable `strict: true` in tsconfig and fix all type errors.

### P1 — Booking System Prerequisites

6. **Payment gateway integration** — At minimum, one provider (PayFast for SA). Deposit-only + full-payment flows.
7. **Email automation** — Transactional emails via Cloudflare Email Service or Resend. Quotation PDFs, booking confirmations, reminders.
8. **Pricing engine** — Tables for venue pricing, food/drink packages, add-ons, seasonal pricing, discounts, promo codes.
9. **Availability calendar** — Blocked dates, venue area availability, time-slot checking.
10. **Customer portal** — View quotation, pay balance, update guest count, download PDF.

### P2 — Enhancements

11. **Code splitting** — Split large components (CartButton, StationDisplay, MenuPage, OrdersPage)
12. **Server Components migration** — Convert public pages to async RSC with Suspense
13. **React Query / SWR** — Add caching layer for client-side data fetching
14. **Bundle analysis** — Add `@next/bundle-analyzer` and optimize
15. **Image pipeline** — Centralize image management, auto-optimize uploads
16. **Playwright/E2E tests** — Critical user flows (order placement, booking, CMS CRUD)

### P3 — Nice to Have

17. Blog/news section
18. Privacy policy + terms pages
19. Customer reviews/ratings
20. Loyalty program
21. Multi-language (i18n)
22. Staff scheduling

---

## 14. BOOKING SYSTEM READINESS

### Current State Assessment

The project has a **booking table** (`bookings` in Supabase) with minimal fields: `name`, `phone`, `email`, `date`, `time`, `guests`, `status`, `notes`. The admin can view/list/edit bookings. The public can submit via a simple form (embedded in the cart? actually, `BookingModal` exists but is not prominently linked on the website).

### Readiness by Component

#### 14.1 Booking System
- **Architecture:** ❌ Not ready. The existing `bookings` table is a simple reservation logger with no pricing, no availability checking, no quotation logic.
- **Required changes:**
  - New tables: `booking_types`, `venues`, `venue_areas`, `food_packages`, `drink_packages`, `addons`, `pricing_rules`, `discounts`, `availability`, `blocked_dates`, `quotes`, `quote_items`, `payments`, `customers`
  - Complete data model redesign (estimated 15-20 new tables)
  - Multi-step booking form wizard
  - Real-time quotation calculation engine
  - Availability checker

#### 14.2 Quotation Engine
- **Architecture:** ❌ Not started. No pricing rules, no package definitions, no calculation logic.
- **Required changes:**
  - Dynamic pricing table (weekday/weekend/peak/off-peak)
  - Per-person pricing (food packages, drinks packages)
  - Add-on pricing (flat + per-person)
  - Minimum spend / minimum guest enforcement
  - Promo code / discount application
  - Real-time price updates as selections change
  - Server-side validation (never trust frontend totals)

#### 14.3 Payments
- **Architecture:** ❌ Not implemented. The POS supports "cash/card/mobile" as manual payment types. No online payment gateway integration.
- **Required changes:**
  - Payment gateway SDK integration (PayFast recommended for SA, plus Ozow/Yoco/Stripe/Peach Payments)
  - Deposit vs full-payment flow
  - Webhook handling for payment confirmations
  - Refund processing
  - Payment status tracking (pending/paid/partially-paid/refunded)

#### 14.4 Customer Portal
- **Architecture:** ❌ Not started. No customer accounts, no authentication for customers.
- **Required changes:**
  - Customer table (extends existing contact data)
  - Authentication (Supabase Auth or magic-link)
  - Portal pages: view quote, pay balance, update details, download PDF
  - Quotation history

#### 14.5 Restaurant ERP
- **Architecture:** ⚠️ Partial. The POS (orders, kitchen/bar display, staff chat) provides basic operational capability.
- **Existing:** Orders with station splitting, status workflow, kitchen/bar display, staff management, basic analytics.
- **Missing:** Inventory, supplier management, cost tracking, profit analysis, staff scheduling, timesheets.

#### 14.6 Inventory
- **Architecture:** ❌ Not started. No stock tracking, no ingredient management, no order costing.
- **Required changes:**
  - Inventory/stock tables
  - Supplier management
  - Stock-taking workflows
  - Recipe/ingredient mapping
  - Automated stock deduction on order completion

#### 14.7 CRM
- **Architecture:** ❌ Not started. No customer profiles, no history tracking, no communication log.
- **Required changes:**
  - Customer database (extends existing inquiry/booking data)
  - Customer visit history
  - Communication log
  - Birthday/anniversary tracking
  - Marketing automation (email/SMS campaigns)

### Architectural Changes Required Before Booking System

1. **Database: Full Supabase cutover** — Remove SQLite dependency. All data must be in Supabase for realtime, RLS, and horizontal scaling.
2. **Auth: Customer authentication** — Currently only staff/admin auth exists. Need Supabase Auth for customers (email/password or magic link).
3. **API: Service layer refactor** — Current API routes mix auth checks, business logic, and DB access. Need a clean service layer with Zod validation.
4. **Types: Strict mode** — Enable `strict: true` before adding complex pricing logic.
5. **State: Form state management** — Multi-step booking form needs proper state management (React Hook Form + Zod).
6. **Real-time: Quotation updates** — Need efficient real-time price recalculation without excessive DB calls.
7. **Payments: PCI compliance** — Design payment flow so that card data never touches the server (direct gateway tokenization).
8. **Emails: Provider integration** — Set up Cloudflare Email Service or Resend for transactional emails.
9. **PDF: Generation pipeline** — Server-side PDF generation (Puppeteer, `@react-pdf/renderer`, or PDFKit).
10. **Security: Rate limiting + validation** — Booking endpoints need stricter rate limiting and comprehensive input validation.

---

## 15. ARCHITECTURAL RECOMMENDATIONS

### What Should NOT Change (Well-Designed)

1. **Role-based middleware** — The middleware auth system with dual password/PIN support, timing-safe comparison, and role scoping is well-designed. Extend rather than replace.
2. **Order state machine** (`order-state-machine.ts`) — Clean transition-based design with role-permission checking. Extend for booking statuses.
3. **Station splitting** (`pos/orderService.ts:splitItemsByStation`) — Correctly separates kitchen/bar orders with parent-child relationship. Valuable pattern for booking system (venue area splitting).
4. **Offline queue** (`offline-queue.ts`) — localStorage queue with retry. Essential for restaurant reliability.
5. **Design system** (`admin/design-system/`) — Tokens-based system with reusable components. Well-structured and consistent.
6. **Image resolution with fallbacks** — Priority-chain approach in `barImages.ts` and `menuImage.ts` is solid (adminImage > direct mapping > slug fallback > default fallback).
7. **Marketing Studio** — Canvas-based design renderer with version history is a standout feature. Well-architected for a restaurant CMS.
8. **POS components** — Modular, well-separated into `components/pos/` with design tokens, error boundaries, and sound management.

### What SHOULD Be Improved Before Booking System

1. **Enable `strict: true` in tsconfig** — Critical before adding complex pricing calculations. Current `strict: false` allows `any` types that will cause runtime errors in financial calculations.
2. **Complete Supabase migration** — Remove `db.ts` (SQLite) entirely. The dual-database approach causes inconsistencies (e.g., `inquiries` table in SQLite vs `contact_messages` in Supabase).
3. **Add Zod validation to ALL API routes** — Especially CMS write endpoints and the future booking endpoints. Currently no server-side validation.
4. **Split large components** — `CartButton` (655 lines), `StationDisplay` (843 lines), `MenuPage` (662 lines), `AdminOrdersPage` (927 lines) should be broken into smaller, testable units.
5. **Add React Query or SWR** — Replace raw `useEffect + fetch` patterns with a caching layer. Public pages will benefit from stale-while-revalidate for CMS content.
6. **Convert public pages to Server Components** — Pages like Homepage, About, Contact read static CMS data but use `'use client'` + `useEffect`. These could be async RSC with Suspense for faster initial load.
7. **Add E2E tests** — Critical user flows (order placement, admin CRUD, booking) should have Playwright tests before adding payment processing.
8. **Unified error handling** — Most API routes use try/catch with `{ error: message }`. Need a standardized error response format (e.g., `{ error: { code, message, details }}`).
9. **Audit logging** — Only staff actions are logged (`staff_audit_log`). CMS edits, pricing changes, and booking modifications should also be audited.
10. **Database connection pooling** — If migrating fully to Supabase, ensure connection pooling is configured for production load (PgBouncer via Supabase).
11. **No Tailwind dependency** — The project uses CSS Modules exclusively. Any new team member familiar with Tailwind will need to adapt. Consider this a feature (no build-time purge, full CSS control), not a bug.
12. **SEO metadata cleanup** — Some pages (Entertainment, Promotions) lack dedicated SEO layouts/meta tags. Complete coverage needed before public launch.

---

## 16. FINAL PROJECT STATE

### Overall Completion: ~65%

The public-facing restaurant website is **substantially complete** (~85%): all pages render, CMS is functional, menu/bar/gallery are editable, order placement works, and tracking is in place.

The **operational backend (POS/Staff)** is **well advanced** (~70%): kitchen/bar displays, staff chat, waiter POS, order management, and analytics all work.

The **booking/quotation system** is **not started** (~0%): minimal `bookings` table exists but no pricing, availability, payments, or customer portal.

### Technical Debt: Moderate-High

| Category | Assessment |
|---|---|
| **Type Safety** | 🔴 Critical — `strict: false`, many `any` types, no Zod validation |
| **Database Architecture** | 🟡 Moderate — dual DB not yet unified, missing migrations |
| **Component Complexity** | 🟡 Moderate — several monolithic components |
| **Test Coverage** | 🔴 Critical — only POS + auth tests exist |
| **Error Handling** | 🟡 Moderate — inconsistent API error responses |
| **Code Duplication** | 🟢 Low — minor (inquiries/contact-messages) |
| **Dead Code** | 🟢 Low — no significant dead code detected |
| **Accessibility** | 🟡 Moderate — basic ARIA but no formal audit |
| **Security** | 🟡 Moderate — good headers + rate limiting, but secrets in env.local, no input validation |

### Code Quality Assessment

- **Good:** Component separation (POS modules, admin design system, chat module), custom hooks, state machine pattern, tokens-based styling, migration-based schema evolution.
- **Needs Work:** Large files (655-927 line components), no Zod validation, inconsistent API patterns, mixed naming conventions, no dedicated service layer (logic mixed in API routes).
- **Overall:** Solid startup-quality codebase. Clean enough for a small team but would benefit from architectural cleanup before scaling.

### Scalability Assessment

- **Vercel:** Will scale horizontally without issues (stateless, Edge middleware, ISR).
- **Supabase:** PostgreSQL can handle significant load. Current schema is well-indexed. The real-time feature adds WebSocket connections (monitor concurrent limits).
- **SQLite:** Will NOT scale — single-file, synchronous I/O, no concurrency. This is the #1 scalability bottleneck.
- **Bundle size:** All `'use client'` pages mean the client JavaScript bundle includes the entire page. Not optimized for low-bandwidth mobile users.
- **API routes:** No caching layer. Every CMS page load hits the database. Add SWR/React Query or ISR for public content.

### Security Assessment

- **Good:** Security headers, HttpOnly cookies, timing-safe comparisons, rate limiting, role-based access, RLS policies.
- **Needs Work:** No input validation (XSS risk in CMS content), secrets in `.env.local`, no CSRF protection on API routes, no audit logging for CMS changes, no rate limiting on CMS write endpoints.
- **Critical:** The `.env.local` file contains the Supabase service role key — this is a super-admin key that bypasses all RLS. If committed or leaked, an attacker has full database access.

### Production Readiness

| Criterion | Status |
|---|---|
| **SSL/TLS** | ✅ (Vercel auto) |
| **Custom Domain** | ✅ (assumed) |
| **CDN** | ✅ (Vercel Edge) |
| **Database Backup** | ❌ Not verified |
| **Monitoring** | ❌ Not configured |
| **Error Tracking** | ❌ No Sentry/LogRocket |
| **Analytics** | ⚠️ Microsoft Clarity only (in layout.tsx) |
| **SEO Audit** | ⚠️ Partial (JSON-LD + sitemap, but some pages missing meta) |
| **Load Testing** | ❌ Not performed |
| **Penetration Testing** | ❌ Not performed |
| **Disaster Recovery** | ❌ No backup/restore plan |
| **CI/CD** | ✅ GitHub → Vercel auto-deploy |

### Risks Before Building the Booking System

1. **SQLite bottleneck** — Building on the dual-DB architecture will create data inconsistencies. Complete the Supabase migration FIRST.
2. **No customer auth** — Booking requires customer accounts. Need Supabase Auth integration with proper RLS.
3. **No payment integration** — Booking without payments is just an inquiry form. Payment gateway integration is a prerequisite.
4. **No input validation** — Financial calculations cannot tolerate malformed input. Zod validation is mandatory.
5. **No audit trail** — Price changes, booking modifications, and payment actions must be auditable.
6. **Monolithic components** — Adding a multi-step booking wizard to the existing codebase without first splitting large components will create maintenance nightmares.
7. **Test coverage gap** — Financial calculations (quotation engine) must be unit-tested. The current near-zero test coverage is unacceptable for a payment system.
8. **Secrets exposure** — The service role key in `.env.local` is a single point of failure. Implement Vercel environment variable encryption and rotate keys before adding payment processing.

---

## Key Contacts & Links

| Resource | Value |
|---|---|
| **Repository** | `https://github.com/malikstopher-dev/the-boma-cafe` |
| **Supabase Project** | `https://supabase.com/dashboard/project/lyksqvqtiysjttwpgeyw` |
| **Supabase URL** | `https://lyksqvqtiysjttwpgeyw.supabase.co` |
| **Firebase Project** | `the-boma-cafe-pos` (FCM only) |
| **Deployment** | Vercel (auto-deploy from `main`) |
| **Domain** | Check Vercel dashboard |

---

*End of Technical Handover Document. This document is based on a complete audit of the codebase at commit `8146f2e` (2026-07-22). All descriptions reflect the current state of the code, not planned features or original specifications.*