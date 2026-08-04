# The Boma Cafe — Admin Dashboard Handover


This document explains, in plain English, what every part of the admin dashboard does and how to use it step by step. It is written for a restaurant manager who is opening the dashboard for the first time.

---

## How to log in

1. Go to `thebomacafe.co.za/admin/login` in your browser.
2. Enter the admin password.
3. You are redirected to `/admin/dashboard`.
4. To log out, click the **Log out** button at the bottom of the sidebar.

Kitchen, bar, and waiter staff log in through their own pages (`/staff/login`, `/waiter`) using:BomaKitchen0884,BomaBar0884 and BomaWaiter0884. The admin password gets you into everything.

---

## The sidebar — your map of the dashboard

The left sidebar is organised into 14 groups. Each group holds related pages. Here is what every group does, in the order they appear.

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

**The table grid (left).** One tile per table (1–20). Green = available, red = occupied (has an active order), amber = **bill pending** (food is ready or served but the bill has not been settled). Click a table to filter the order list to it.

**Order cards (centre).** Each card shows the reference (e.g. `20260804-006`), status badge, order type (dine-in / pickup / delivery), how long ago it arrived, table number (if assigned), the waiter (if assigned), payment status, and total. Click the ▸ arrow to expand the items inside.

**Assigning a waiter and a table** (dine-in orders):
- **+ Assign Waiter** — opens a dropdown of waiters currently **on duty** (active on the Waiters page). Pick one and their name appears on the card. Waiter orders already carry the waiter's name automatically.
- **+ Assign Table** — opens a dropdown of only the **empty** tables. Assigning sets the table number and the tile in the grid turns red. When the order is ready/served but not paid, the tile turns amber (bill pending).

**Confirming an order before the kitchen or bar can start** — this depends on where the order came from:
- **Online pickup / delivery:** payment must be confirmed **before** the kitchen can start. The card shows a **Confirm Payment** button (or **Accept (Skip)** to wave the payment). Both confirm the order and send it to the kitchen/bar.
- **Online dine-in:** press **✅ Approve** — no payment required, the bill is settled at the table. Then assign a waiter.
- **Waiter orders (taken at the table):** the **✅ Confirm** button is optional. The kitchen/bar can also press **START PREP** on a pending waiter order directly, without admin confirmation. Either way the order is never prepared before this step.
- Until an online order is confirmed, the kitchen display shows **"Awaiting admin confirmation"** and the bar/kitchen cannot start it.
- **Cancel** — asks for a reason (min 3 characters). Cancellation is allowed at any stage before completion.
- Mixed orders (food + drinks) are split into **two linked orders** — one for the kitchen, one for the bar — with the same table/waiter attached.

**Checkout (right panel).** Select the order, choose the payment method (cash, card, mobile), click **Mark Paid**. This completes the order, records the payment, and triggers the receipt printer view. Completed orders that were ready but unpaid trigger the amber "bill pending" tile.
- The board updates in real time (Supabase Realtime) with a fallback poll, and beeps on new orders. A **Today only** toggle hides orders older than 24 hours.

### Kitchen (`/admin/kitchen`) and Bar (`/admin/bar`)
The Kitchen/Bar Display System (KDS). A Kanban board: NEW → CONFIRMED → PREPARING → READY.
- **NEW (pending) waiter orders** show a **🔥 START PREP** button — the station can start them immediately.
- **NEW (pending) online orders** show "⏳ Awaiting admin confirmation" — the station can only cancel them until admin confirms on the Orders page.
- Keyboard shortcuts: `1` = start prep (on confirmed orders, or pending waiter orders), `2` = mark ready, arrow keys move between cards.
- When starting prep you can enter an estimated prep time — the system then shows a countdown per order.
- Timer colours: green under 10 min, amber 10–20 min, flashing red over 20 min. Ready orders chime and fade out after a while.
- Bar and kitchen see only their own station's orders (mixed orders arrive as separate kitchen and bar cards).

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
Manage wait staff. Each waiter has a name, an employee ID, and a 4–6 digit PIN.

**Adding a waiter:**
1. Click **People → Waiters** in the sidebar.
2. Fill in the three fields: **Employee ID** (e.g. `W003` — must be unique), **Name**, and **PIN (4–6 digits)**. Press Enter or click **+ Add**.
3. They can now log in at `/staff/login` (or `/waiter` on a handheld) using their employee ID + PIN — no admin password needed. Kitchen and bar staff work the same way.

**Other actions:**
- **🟢/🔴** — toggle on/off duty. Only waiters **on duty** appear in the "Assign Waiter" dropdown on the Orders page, so take people off duty when their shift ends.
- **✏️** — rename (employee ID and PIN cannot be changed here; delete and re-add to change them).
- **🗑️** — delete. Historical orders keep the waiter's name; they are just removed from future assignment lists.

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

## Setting up stock for the first time

Go through this once when you switch on inventory. Everything lives under **Operations** in the sidebar.

1. **Add your units, categories and cost centres** — `Operations → Settings`: units of measure (and conversions), product categories, and cost centres. Every stock movement later needs a cost centre.
2. **Add suppliers** — `Operations → Suppliers`, so you can receive deliveries against them later.
3. **Add products** — `Operations → All Products` (or the Food/Beverage quick links). Click the inline **Add Product** form at the top: name, SKU, barcode (optional), and product type (Food, Beverage, Cleaning, Packaging, General). Each product starts with **zero stock** — there is no balance field to type into.
4. **Link menu items to products (optional but recommended)** — `Operations → Menu Integration`. Linking food/drink menu items to inventory products is what lets stock be auto-deducted when an order completes. "⚡ Auto-Link Exact Matches" does the bulk of it in one click.
5. **Set reorder levels** — `Operations → Reorder` (reorder rules) so low-stock alerts and reorder suggestions work.

**Get your opening stock into the system** — the ledger is the only truth, and it starts empty. Load opening balances with either method:

- **Option A — Excel import (recommended if you have a spreadsheet):** `Operations → Imports → New Import`. Upload your stock or price list as `.xlsx`, map the columns, preview, fix issues, **Apply**. The system writes ledger transactions (and can create new products from the file).
- **Option B — Stock Count:** `Operations → Stock Counts → New Count`, pick a location. The count opens against an expected balance of zero. Enter each product's physical quantity on hand, click **Save Count Item**, **Submit**, then **Approve**. Approving posts an adjustment transaction for every count line, so the balances become real.

After either method, your balances are live: the **Dashboard** shows stock value, **Transactions** shows the full movement trail, and ordering (POs → Receiving) adds stock from then on.

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
