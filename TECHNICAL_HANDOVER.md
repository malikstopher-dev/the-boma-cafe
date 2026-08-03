# The Boma Cafe — Admin Dashboard Handover

**Date:** 3 August 2026
**Repo:** `github.com/malikstopher-dev/the-boma-cafe`
**Branch:** `main` — latest commit `179f0d4`
**Live site:** `the-boma-cafe.vercel.app`
**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL) + Resend (email) + Vercel
**Auth:** password cookies (`boma_admin_auth`) + staff PIN sessions

This document explains, in plain English, what every part of the admin dashboard does and how to use it step by step. It is written for a restaurant manager who is opening the dashboard for the first time.

---

## How to log in

1. Go to `/admin/login` in your browser.
2. Enter the admin password (stored in the `ADMIN_PASSWORD` env var on Vercel).
3. You are redirected to `/admin/dashboard`.
4. To log out, click the **Log out** button at the bottom of the sidebar.

Kitchen, bar, and waiter staff log in through their own pages (`/staff/login`, `/waiter`) using PINs. The admin password gets you into everything.

---

## The sidebar — your map of the dashboard

The left sidebar is organised into 13 groups. Each group holds related pages. Here is what every group does, in the order they appear.

---

## 1. Overview

### Dashboard (`/admin/dashboard`)
The home screen. Shows quick stats (menu items, events, promotions, unread inquiries), recent orders, and waiter performance. Click any stat card to jump to that section.

### Background Jobs (`/admin/background-jobs`)
Behind the scenes, slow jobs (like generating a booking PDF and emailing it) are queued in a `background_jobs` table and processed by a separate worker. This page lets you watch that queue:
- See jobs grouped by status (pending, processing, completed, failed, dead letter).
- Retry a failed job, or cancel one that is stuck.
- You do not need to touch this daily — it is a monitoring tool. If a customer reports they never got their quotation email, check here first; the job will tell you why it failed.

> **Important:** the worker is a standalone Node process (deploy it on Railway / Fly / Render, start command `node dist/jobs/index.js`). If the worker is not running, PDFs and emails never go out. See `oracle-runbook.md` for deployment steps.

---

## 2. Orders

### Orders (`/admin/orders`) — the POS screen
This is the point-of-sale where you run the restaurant floor.
- **Left:** a grid of tables. Green = free, amber = food being prepared, blue = ready, red = bill pending. Click a table to see its orders.
- **Centre:** order cards. Click one to open it. Each card can be expanded to show the items inside.
- **Right:** the checkout panel. Choose payment method (cash, card, mobile), then click **Mark Paid** to complete the order.
- **Pending online dine-in orders** show an **Approve** button (the customer is not in the restaurant yet) and an **Assign Waiter** dropdown.
- A **Today only** toggle hides stale orders older than 24 hours so the board stays clean.
- Every 4 seconds the page polls for new orders and plays a beep.

### Kitchen (`/admin/kitchen`)
The Kitchen Display System (KDS). A Kanban board: NEW → CONFIRMED → PREPARING → PACKING → READY.
- Keyboard shortcuts: `1` accept, `2` start prep, `3` mark ready, arrow keys to move between cards.
- Orders older than 24 hours auto-archive so the board never fills up with zombies.
- Empty columns collapse on desktop so the active column gets full width.
- Timer colours: green under 10 min, amber 10–20 min, flashing red over 20 min.

---

## 3. Bookings

### Bookings (`/admin/bookings`)
Manage table/function bookings. Filter by status (pending, confirmed, cancelled, completed), search by customer name. Buttons to confirm, cancel, mark completed, or delete.

### Quotes (`/admin/quotes`)
Every confirmed booking gets a quotation. This page lists all quotes. You can regenerate the PDF (which queues a background job) and resend the email.

### Pricing (`/admin/pricing`)
Configure the pricing rules for bookings: food packages, drink packages, add-ons, per-person vs flat pricing, seasonal rates, promo codes. This is the engine that powers the real-time quote calculation on the public booking form.

### Availability (`/admin/availability`)
Block out dates or time slots when the venue cannot take a booking (private functions, maintenance, fully booked). The public booking form checks this before letting a customer pick a date.

---

## 4. Operations · Open

This is the **morning routine** group — the manager's first stop every day.

### Opening Checklist (`/admin/operations`)
The landing page for Operations. A daily checklist with categories: refrigeration, stock, reconciliation, equipment, cleanliness, admin, menu. Tap an item to mark it done, skipped, or failed. Add manager notes. The progress bar shows how close you are to a full opening. Starts a new checklist automatically each day per location.

### Reconcile — Food (`/admin/operations/food/reconcile`)
Morning food stock reconciliation. Pick a date, see every food product with its expected balance. Type the physical quantity you actually counted. The page calculates the variance (difference) and the money value of that variance. Save as you go.

### Reconcile — Beverage (`/admin/operations/beverage/reconcile`)
Same as food, but filtered to beverage products (drinks).

### Stock Counts (`/admin/operations/stock-counts`)
Run a full physical stock count session:
1. Click **New Count**, pick a location.
2. The system snapshots the expected stock at that moment.
3. Count each product, type the physical quantity, click **Save Count Item**.
4. Click **Submit** when finished.
5. A manager clicks **Approve** — the system creates ledger transactions to fix any differences and refreshes the dashboard.
6. You can also cancel a count if it was started by mistake.

### Variance Report (`/admin/operations/variance`)
After a stock count, this report shows, per product, what you expected vs what you actually counted, plus the variance percentage. Use it to spot shrinkage, theft, or counting mistakes.

---

## 5. Operations · Inventory

### Dashboard (`/admin/operations/dashboard`)
The inventory command centre. Eight KPI cards (stock value, low stock, out of stock, open POs, overdue POs, today's movements, fast movers, slow movers). Tabs at the top let you filter by type: All, Food, Beverage, Cleaning, Packaging, General. Auto-refreshes every 60 seconds.

### All Products (`/admin/operations/products`)
Every inventory product. Search by name, SKU, or barcode. Shows current balance and reorder badge. Click a product to see its detail (UOMs, stock summary, actions). Archive or restore from here.

### Food Products / Beverage Products
The same product list, pre-filtered to that type — quicker than using the tabs.

### Containers (`/admin/operations/beverage/containers`)
Reference list of container types (bottle, keg, case, crate, box, packet, bag, tub, bucket). Products can be linked to a container type with a "units per container" count.

### Reorder Suggestions (`/admin/operations/reorder`)
Products that have dropped below their reorder level. Each row suggests how much to order based on recent usage and lead time. Use this to build your purchase orders.

### Forecasting (`/admin/operations/forecast`)
Predicts when each product will run out, based on the last 30 days of sales. Shows urgency (out of stock, critical, warning, ok). Also shows a day-of-week and hour-of-day consumption pattern so you can see your busiest times.

### Analytics (`/admin/operations/analytics`)
Charts: consumption trend over the last 14 / 30 / 90 days, a waste heatmap (which waste types happen on which days), and inventory value over time.

---

## 6. Operations · Purchasing

### Purchase Orders (`/admin/operations/purchase-orders`)
Create and track POs. The status flows: Draft → Approved → Ordered → Partial → Received → Cancelled.
- Click **New PO** to build one: pick a supplier, add line items (product, quantity, unit cost), save as draft.
- **Approve** it, then **Order** it (sends nothing automatically — it just marks the stage).
- When goods arrive, open the PO and use the **Receive** form. You can receive partial deliveries. Each receipt creates a `purchase` ledger transaction so stock goes up automatically.
- Overdue POs are highlighted.

### Receiving (`/admin/operations/receiving`)
A queue of POs that are in `ordered` or `partial` status — the ones waiting for delivery. Click one to jump to its receive form. This is the goods-in desk's daily view.

### Suppliers (`/admin/operations/suppliers`)
Supplier directory. Add, edit, archive. Each supplier page shows the products they supply and their performance stats.

### Supplier Performance (`/admin/operations/supplier-performance`)
On-time delivery rate, fill rate, and average lead time per supplier — based on the receipts logged against their POs.

### Price History (`/admin/operations/price-history`)
Track how a product's cost has changed over time across suppliers. Helps you negotiate and spot price jumps.

---

## 7. Operations · Production

### Recipes (`/admin/operations/recipes`)
Reusable recipes (not locked to a menu item). A recipe has ingredients (input products with quantities) and outputs (the products it produces, with a yield). Example: "Tomato Sauce" recipe consumes 5 kg tomatoes + spices, produces 4 L sauce.

### Production Runs (`/admin/operations/production-runs`)
Cook a recipe and have stock auto-deduct:
1. Click **New Run**, pick a recipe, set the scale (how many times to make it).
2. The system snapshots the ingredients needed.
3. Click **Start**, then **Complete**.
4. On completion, the system creates `production` ledger transactions: negative for each consumed ingredient (auto-deducted from stock), positive for each output. If an ingredient is out of stock, that item is flagged and the run stays `in_progress` until you fix it and re-complete. Idempotent — re-running does not double-deduct.

### Waste & Breakage (`/admin/operations/waste`)
Log anything lost: waste, breakage, spillage, comp, expiry, theft, donation. Pick the product, the type, the quantity, an optional reason and note. The system writes a negative ledger entry. A 30-day summary card shows totals per type and estimated value.

### Order Items (`/admin/operations/order-items`)
The link between POS orders and inventory. When an order is completed, its line items are synced here and matched to inventory products (via the menu integration links). Click **Deduct** to post `sale` ledger transactions that reduce stock. There is an auto-deduct hook when an order completes, but this page lets you do it manually or review what was deducted.

### Menu Integration (`/admin/operations/menu-items`)
Link each bar menu item to an inventory product so stock can be deducted when the item sells.
- Unlinked items are **grouped by menu category** with collapsible sections.
- Click **Link to Product** on an item — a centered modal opens showing the item's category (auto-inherited), a product search, and a pour size that auto-fills from the product's config.
- **⚡ Auto-Link Exact Matches** button — matches every unlinked item to an inventory product by name (fuzzy) and links them in one click. Shows a summary of what was linked and what could not be matched.
- **Link All** per category — link every unlinked item in a category to one product in a single action.

---

## 8. Operations · Records

### Locations (`/admin/operations/locations`)
Your stock locations (Main Bar, Dry Store, etc.). Add, edit, archive. Each location page lists the products held there with their balances.

### Transactions (`/admin/operations/transactions`)
The full audit trail — every stock movement (purchase, sale, production, waste, adjustment, physical count, transfer). Filter by type and date. This is the single source of truth for stock; nothing updates stock without writing a row here.

### Imports (`/admin/operations/imports`)
Upload an Excel stock count or price list:
1. Click **New Import**, upload your `.xlsx`.
2. The system parses the columns and asks you to map each spreadsheet column to a field (name, quantity, price, etc.).
3. You preview the result, fix any issues, then **Apply**.
4. The system writes ledger transactions for each row and updates product costs.
5. You can **Rollback** an import if you made a mistake — it creates reversing transactions.
- A sticky bottom bar holds the Cancel / Apply buttons so they are always visible.

### Notifications (`/admin/operations/notifications`)
Low-stock alerts. The system auto-generates an alert when a product drops below its reorder level. Click **Check Stock Now** to re-scan. Alerts auto-resolve when stock recovers. The sidebar bell shows an unread count badge.

---

## 9. Operations · Reports

### Reports (`/admin/operations/reports`)
Six report types in tabs:
- **Daily Stock** — opening, purchases, sales, adjustments, closing per product for a chosen date.
- **Variance** — expected vs actual from a stock count.
- **Waste** — waste/breakage/spillage over a date range.
- **Fast Movers** — top sellers by quantity.
- **Slow Movers** — products barely selling (including zero-sales).
- **Valuation** — current stock value (balance × unit cost) per product and total.
Each report has a **CSV export** button.

---

## 10. Operations · Settings

### Settings (`/admin/operations/settings`)
Units of measure (UOMs) and their conversions, product categories (hierarchical), and cost centres (Restaurant, Bar, Kitchen, Events, Private Functions, Takeaway, Delivery, VIP Room). Every stock movement is tagged with a cost centre and a reason type.

---

## 11. Menu

### Menu Items (`/admin/menu`)
The food menu CRUD. Add/edit/delete items: name, description, price, category, image, featured/promo toggle, availability. The edit form scrolls to the top when you open it so you never lose it.

### Categories (`/admin/categories`)
Manage food menu categories (Starters, Mains, Desserts, etc.). Enable/disable, reorder, delete.

### Bar Menu (`/admin/bar-menu`)
The drinks menu. Each item has multi-price (bottle, single, glass, shot), availability, and a pickup restriction. Alcoholic items have an `is_alcohol` flag and are blocked for pickup/delivery — customers see "Available for dine-in only".

---

## 12. Content

### Site Settings (`/admin/site-settings`)
The big CMS editor. Nine tabs: Homepage, About, Experience, Entertainment, Venue Hire, Contact, Promo Bar, Branding, SEO. Edit text fields, save per tab. Images use URLs (host them in the gallery and paste the link).

### Events (`/admin/events`)
Add/edit/delete upcoming and past events. Tabs: Upcoming, Past, Last Week Highlight (a homepage video). Cover images use URLs; gallery images are one URL per line.

### Promotions (`/admin/promotions`)
Create promotional offers with active dates, display locations (homepage, popup, promotions page, menu), and ordering.

### Gallery (`/admin/gallery`)
Two tabs: main gallery (CMS items with images, titles, featured toggle) and local boards (files in `public/gallery/`). Note: file uploads to Vercel's filesystem are ephemeral — use Supabase Storage for permanent images.

### Media Library (`/admin/media`)
A unified media browser for images and videos stored in Supabase Storage (`boma-images` bucket).

### Popup (`/admin/popup`)
Config for the homepage popup overlay (e.g., Weekend Buffet). Set active days, times, prices, CTA.

### Announcement (`/admin/announcement`)
The scrolling bar at the top of the public site. Toggle on/off, set text and link.

---

## 13. People

### Messages (`/admin/messages`)
Staff chat. Conversations between staff members, real-time. Supports voice notes. Shows unread counts.

### Inquiries (`/admin/inquiries`)
Contact form submissions from the public site. Mark as read, delete.

### Waiters (`/admin/waiters`)
Manage wait staff: add, edit name, assign PIN, toggle on/off duty, delete. Deleting a waiter preserves their historical orders.

---

## 14. Growth

### Analytics (`/admin/analytics`)
Sales analytics: total revenue, order count, top products, order type breakdown, daily revenue chart, order frequency chart. Pick a period (7/14/30/90 days).

### Marketing (`/admin/marketing`)
The Marketing Studio. Create design projects (posters, social posts) from templates, edit on a canvas (zoom, drag, resize, palette, QR code), export as PNG/JPG/SVG/PDF, and keep version history.

---

## Behind the scenes — things you should know

**Background job worker.** Booking PDFs and quotation emails are generated by a separate Node.js worker, not by the web server. If emails stop going out, check `/admin/background-jobs` — if jobs are piling up as `pending`, the worker is not running. Deploy it (see `oracle-runbook.md`) and set the `HOSTNAME` env var.

**Inventory ledger.** Stock never changes without a transaction row. Every purchase, sale, production, waste, count, and import writes to the `inventory_transactions` table. This makes the audit trail trustworthy. Never insert directly into `inventory_transactions` — always go through `createTransaction()` in `src/inventory/engine/ledger.ts`.

**Reservations.** When a booking is confirmed, the system reserves the drinks (from the drink package mapping) but does not deduct stock yet. Stock is only deducted (as a SALE transaction) when the booking is marked `completed`. If the booking is cancelled, the reservation is released — no ledger impact.

**Idempotency.** Booking submissions and PDF regeneration use a `enqueue_background_job()` database function that is race-safe. Submitting the same booking twice returns the original — no duplicates.

**Migrations.** The production Supabase DB is at `lyksqvqtiysjttwpgeyw`. Migrations 000–061 are applied. Do not re-run migrations blindly — use `supabase migration repair --status applied` only to reconcile history for schemas that already exist. Use `npx -y supabase@2.111.0` (the global `@supabase/cli@1.0.0` has no Windows binaries).

**Tests.** Run `npx vitest run` — currently 61 passing across 6 files. Run `npx tsc --noEmit -p src/inventory/tsconfig.json` for the strict type check on the inventory engine. The full `npm run build` takes about 2.6 minutes.

---

## Daily routine (quick reference)

1. Open the dashboard, go to **Operations → Opening Checklist**, complete the morning checks.
2. Go to **Reconcile — Food** and **Reconcile — Beverage**, count and save.
3. Check **Reorder Suggestions** — build any needed **Purchase Orders**.
4. When deliveries arrive, use **Receiving** to receive them.
5. Throughout the day, **Orders** (POS) and **Kitchen** run the floor.
6. Log anything broken/spoiled in **Waste & Breakage**.
7. End of day: **Reports → Daily Stock** for a closing summary.
8. Check **Notifications** for low-stock alerts before you leave.
