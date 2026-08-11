# The Boma Café — Admin Manual

A practical guide to every option in the admin panel, what it does, and how it works behind the scenes.

**How to open the admin panel:** go to your site URL, click **Login** → Admin (or visit `/admin/login`), enter your PIN. You land on the admin dashboard with the navigation rail on the left.

**Understanding the stock system (the most important idea before anything else):**
Every page in the "Operations & Stock" section runs off **one engine**: a transaction ledger. Think of it like a bank account per product, per location. Nothing is ever edited in place — every change (a delivery, a sale, a breakage, a stock count adjustment) is **recorded as a movement** with:
- which product, which location (e.g. Main Bar, Dry Store, Kitchen)
- quantity (positive = stock in, negative = stock out)
- **reason type** (DELIVERY, SALE, WASTE, BREAKAGE, STAFF_MEAL, EXPIRED, THEFT, COMP, TRANSFER, ADJUSTMENT, etc.)
- **cost centre** (Restaurant, Bar, Kitchen, Events, Private Functions, Takeaway, Delivery, VIP Room)
- who did it + any note

Your stock balance it always = what the ledger says. This is why every page below, no matter how different it looks, is really just a different way of *reading* or *writing* to that ledger.

---

## 1. Admin · Overview

### Owner Dashboard (`/dashboard`)
Your at-a-glance business screen (also reachable from the inv/owner-portal side).
- **Gold banner at the top:** today's opening checklist status per location, the current week number, and quick links into Operations & Stock.
- **KPIs and recent activity:** deliveries, sales, waste, stock value from live ledger data — no fake numbers.
- **Quick actions** jump straight into daily stock input and the week view.

### Dashboard (`/admin/dashboard`)
The main admin landing page: greeting, today's summary (orders, bookings, inquiries, unread messages), and shortcuts to the sections below. Anything urgent appears here first.

### Background Jobs (`/admin/background-jobs`)
Where the booking pipeline's background work is monitored. When a customer books a function, the system **queues a job** (generate the PDF quotation + email) instead of doing it during the page load. This page shows:
- **Stats cards:** pending / processing / completed / failed / dead-letter counts.
- **Job table:** every job with its type, status, retries, and timestamps.
- **Actions per job:** Retry (re-run a failed job), Cancel (stop it).
- **How it works:** a small worker process (running on a server) picks up pending jobs every ~5 seconds, generates the PDF, uploads it, emails the customer, and notifies you — normally within ~10 seconds. If something crashes, the system automatically retries with increasing delays (1 min → 2 min → 4 min) up to 3 times, then marks it dead-letter for you to retry manually.
- **Crucial detail:** the whole thing is built to be *safe to retry* — it never sends two PDFs or two emails for one booking.

---

## 2. Operations & Stock · Open

This group is your **daily workflow** — the screens a manager lives in every morning and evening.

### Daily Stock Input (`/admin/operations/daily-stock`)
A Google-Sheets-style grid for punching in physical stock every day.
- Use the **location selector** (Main Bar, Dry Store, Kitchen…) and **date** (defaults to today).
- One row per product; type your count into the **Counted** cell. **Enter moves down a row, Tab moves across** — you can count an entire shelf without touching the mouse.
- Cells **auto-save on blur** (click away or press Enter). A variance column shows the difference against the system's expected balance as you type.
- **Type tabs** (Food / Beverage / Gas / All) keep the grid focused.
- When finished: **Submit** (locks the sheet for review), then **Approve**.
- **How it works:** each submitted row is saved into a stock-count session. Approving it posts a `physical_count` ledger movement for every difference (±), so your balances are corrected exactly by what you counted — never overwritten blindly.
- **Tip:** the "+ Stock Sheet" button opens the full spreadsheet (see below) where you can also record deliveries and waste in the same grid.

### Weekly View (`/admin/operations/weekly`)
**"Delivered vs Sold"** per week — your purchasing plan in one chart.
- Weeks run **Monday → Sunday**; Week 1 = the week containing the first Monday of the year.
- Chip selector to jump between weeks; a bar per week shows golden = delivered (value) and red = used (value).
- Per-type table underneath (Food / Beverage / Gas / Cleaning…): delivered vs used quantities.
- **CSV export** for working in Excel.
- **How it works:** purely reads the ledger — "Delivered" = purchase/return/transfer-in movements that week; "Used" = sales + waste + breakage + gas usage etc. Nothing is estimated.
- **Tip:** use this every Monday to spot weeks where usage outran deliveries (under-ordering) or the reverse (over-purchase).

### Gas Tracker (`/admin/operations/gas`)
Tracks **LPG cylinders** (1 kg / 2 kg / 9 kg / 19 kg / 48 kg).
- Cards show on-hand per size + this week/this month delivered vs used.
- **Record form:** pick size, choose *Delivery* (+) or *Usage* (−), quantity, notes → one tap posts it.
- Recent events list shows the last movements per size.
- **How it works:** cylinders are real products (GAS-001…005) in the ledger. A delivery is a `purchase` with reason DELIVERY; usage is a `gas_usage` movement. The tracker is just a filtered view of the ledger.
- **Tip:** record the delivery the moment the cylinder arrives — the "on hand" card is only as live as your recording discipline.

### Opening Checklist (`/admin/operations` — the landing page)
The **morning routine** — first screen of the day.
- Tasks grouped by category (Refrigeration / Stock & Par / Reconciliation / Equipment / Cleanliness / Admin / Menu): check fridge temps, verify yesterday's closing stock, top up par levels, etc. — each item is a premade template.
- Mark each item **Done / Skip / Fail** with optional notes; a progress bar shows the morning at a glance.
- **Manager notes** box at the bottom — saved to the audit log with your name.
- **Complete** the checklist to close the day's record.
- **How it works:** each day+location gets its own checklist instance created from the templates. History is kept forever, so you can see which mornings were complete and which were rushed.

### Reconcile — Food / Beverage (`/admin/operations/food/reconcile`, `.../beverage/reconcile`)
The **morning/evening reconciliation** screen, split by stock type.
- Same grid as Daily Stock Input but scoped to Food or Beverage products.
- Type a physical quantity per product; the variance (difference vs expected balance) is computed live.
- Save each row; variances accumulate into the top KPI cards (products checked, total variance, variance value in Rands).
- **How it works:** identical engine to Daily Stock Input — saving records the counted value; approving would post the ledger adjustment. It's the same "count sheet" idea, just filtered so the kitchen manager reconciles food and the bar manager reconciles beverage without cross-noise.

### Stock Counts (`/admin/operations/stock-counts`)
The **formal, periodic full count** (e.g. month-end).
- **New Count:** choose a location → the system snapshots the expected balance of every product there at that moment.
- **Perform:** count card per product — shows expected balance, big +/− buttons, tap the number to type a direct value, barcode scanner jump (Enter with a scanner sends you straight to that product), Save / Skip / Previous / Next.
- **Submit for review → Approve:** approval posts `physical_count` ledger adjustments for every variance (positive or negative) and refreshes the dashboard cache.
- **Cancel** abandons the session.
- **How it works:** correctness is guaranteed — the count is measured against a *snapshot taken at creation*, not the live balance, so counting while a delivery lands mid-count doesn't distort your variances. One adjustment transaction per product, all reasons recorded.

### Variance Report (`/admin/operations/variance`)
The **summary of any completed count**: pick a stock count, see every product where physical ≠ expected, with variance quantity and percentage. Useful for spotting theft, breakage patterns, or measurement issues (insiders know: if one product always variances −5%, it's a pour-size problem, not a thief).

---

## 3. Operations & Stock · Inventory

The **catalogue and intelligence** group.

### Dashboard (`/admin/operations/dashboard`)
The inventory KPI dashboard — 8 sections:
- Stock balance & value per location / type
- Today's movements (purchases, sales, waste)
- **Alerts** (out of stock, below reorder level)
- Fast movers / slow movers
- Recent activity + dashboard-cache freshness
- Tabs across the top switch **All / Food / Beverage / Cleaning / Packaging / General** so each manager gets their own numbers.
- Auto-refreshes every 60 seconds; data comes from a cache that every approving action refreshes.

### All Products / Food Products / Beverage Products (`/admin/operations/products`, `.../food/products`, `.../beverage/products`)
Where the **catalogue lives** — same screen, three scopes.
- Table with name, SKU, barcode, type, unit of measure, reorder threshold, current balance (with badges when below threshold or out of stock).
- Search by name / SKU / **barcode**; archive filter to resurrect old items.
- Create a product inline or open its detail page.
- **Detail page** (`products/[id]`): full info, edit (rename, category, supplier, barcode…), its units of measure, movement history (timeline), current stock summary.
- **How it works:** creating a product is just registering its name in the system — stock appears only via transactions (deliveries, sales, counts). Deletions are prevented while the product is linked to anything; archive hides it without losing history.

### Containers (`/admin/operations/beverage/containers`)
Reference list of **container types** (bottle, keg, case, crate, box, packet, bag, tub, bucket) with their trackable flag. Tells you what "units per container" your products use for conversions. Mostly maintenance — set up once.

### Reorder Suggestions (`/admin/operations/reorder`)
The **auto-restock list**.
- Each row: product, current balance, reorder level (par), usage rate over the last 30 days, and the quantity the system suggests you buy.
- Sorted by urgency; shows what's below par or projected to run out within your supplier's lead time.
- **How it works:** par level comes from the product's reorder threshold or a reorder rule; suggested qty = 30-day usage − current balance (never negative).

### Forecasting (`/admin/operations/forecast`)
**When will I run out?**
- Depletion table: per product — current balance, daily usage, **days remaining**, projected stock-out date, urgency badge (out of stock / critical / warning / ok). Critical = will run out *before* a new delivery can arrive (within lead time).
- Tabs by inventory type; KPI cards on top.
- **Consumption patterns** below: which days of the week and which hours your sales peak — so you know Friday night is not the day to skip the delivery.

### Analytics (`/admin/operations/analytics`)
The **history view**:
- **Consumption trend:** daily sold quantities over 14/30/90-day ranges (bar chart).
- **Waste heatmap:** waste types × day-of-week grid — instantly shows "Monday = expiry day" patterns.
- **Inventory value trend:** your stock's total value over time from the daily snapshots.

---

## 4. Operations & Stock · Purchasing

### Purchase Orders (`/admin/operations/purchase-orders`)
The **ordering workflow** — this is how you buy stock properly.
- **Lifecycle:** Draft → Approved → Ordered → (Partial →) Received, or Cancelled.
  - **New PO:** pick supplier, add line items (product, quantity, unit cost), save as draft.
  - **Approve** (manager sign-off on price/qty) → **Order** (marks it sent to supplier) → goods arrive → **Receive**.
- **Partial deliveries are supported:** receive 30 of 50 bottles today, the rest later — status becomes *partial* until everything arrives.
- One PO can have multiple receiving events, each with its own invoice number.
- **How it works:** receiving is where the magic happens — each received line posts a real **purchase ledger transaction** with the unit cost you set (sets your weighted-average cost), so stock + cost are updated in the same moment the goods land. Balanced books at receiving time, not after.
- List view shows status, supplier, overdue highlight when the expected date passed with no delivery.

### Receiving (`/admin/operations/receiving`)
The **goods-in queue**: only POs in Ordered/Partial status — i.e. things actually due. Click through to the PO to record the receiving (quantity, invoice no., cost centre — defaults to the location's). It exists so the person at the back door doesn't have to wade through drafts and history.

### Suppliers (`/admin/operations/suppliers`)
Supplier **directory**: name, contact, phone/email, and linked products. Add inline, edit, archive/restore. Detail page shows everything they supply and their trade history. Keep this current — the PO and reorder flows both reference it (e.g., lead time per supplier feeds Forecasting).

### Supplier Performance (`/admin/operations/supplier-performance`)
**Scorecard per supplier, straight from PO history:** on-time delivery rate, average lead time, number of POs, value received — so "cheaper" suppliers that are always late get exposed. Data is computed from actual PO records.

### Price History (`/admin/operations/price-history`)
**Unit-cost history per product**: every time you receive goods at a new price, it's recorded. Use it to renegotiate ("your last 3 deliveries crept up 18%") and to understand why COGS changed. Data comes from the cost recorded on each received transaction.

---

## 5. Operations & Stock · Production

### Recipes (`/admin/operations/recipes`)
Standardised **production recipes** — e.g. a syrup, a batch of juice, a cocktail mix.
- Each recipe lists **ingredients** (product + quantity) and **outputs** (product + quantity).
- Create/rename recipes; add/remove ingredients and outputs from the detail page.
- **How it works:** recipes are the master data that Production Runs (below) execute — everything is measured in real products, so nothing is estimated.

### Production Runs (`/admin/operations/production-runs`)
**Executing a recipe** — turning ingredients into outputs.
- **Create:** pick recipe + location + scale (make 2× the base batch) → the system snapshots the ingredients needed.
- **Start** (planned → in progress) → **Complete**.
- **How it works (the important part):** on completion the system posts ledger movements **automatically**: consumed ingredients as negative `production` transactions at the scaled quantity, produced outputs as positive transactions. Checkmarks per line confirm each item's ledger entry. If one ingredient doesn't have enough stock, that item fails, the run stays in progress, and you can fix stock and retry — **already-completed items are never double-deducted**.
- Cancel abandons the run.

### Waste & Breakage (`/admin/operations/waste`)
**Register anything that left the shelf without being sold.**
- Form: search product, type (Waste / Breakage / Spillage / Comped / Expired / Theft / Donation), quantity, notes → one tap posts it.
- 30-day summary card: per-type totals with estimated value (you'll immediately see what breakage costs you per month).
- Recent events list.
- **How it works:** posts a negative ledger movement with reason = the type. This is your **proof data** for the P&L — every R of shrinkage is captured, not guessed at month-end.

### Order Items (`/admin/operations/order-items`)
The bridge between **POS orders and stock**.
- Orders from the website/POS store their line items; this page **syncs** them into a clean table and shows each line's match to an inventory product (via menu-item links or name matching) with badges: matched / unmatched / deducted.
- **Deduct** posts SALE ledger movements for matched lines (already-deducted lines are skipped — re-syncing never double-charges stock).
- When an order is marked **completed**, deduction happens automatically in the background.
- **How it works:** this is what makes your "delivered vs sold" numbers true — sales are deducted from the same ledger as deliveries.

### Menu Integration (`/admin/operations/menu-items`)
Connects **bar menu items → inventory products**.
- Two-column view: linked vs unlinked menu items; search a product, set the pour size (ml per serve), link it.
- **How it works:** a linked menu item with a pour size is how Order Items converts an order like "2 x Vodka & Tonic @ 25 ml pour" into exactly 50 ml = a fraction of the vodka bottle deducted. Unlinked items simply don't touch stock (so they're never wrongly deducted).

---

## 6. Operations & Stock · Records

### Locations (`/admin/operations/locations`, `locations/[id]`)
Where you keep stock: Main Bar, Dry Store, Kitchen (each location has a **cost centre** — its movements are tagged to it automatically).
- Add / rename / archive locations; detail page shows the products and balances stored there.
- **How it works:** every ledger movement belongs to exactly one location. Same product, two locations, two balances — "5 bottles in Bar, 9 in Store" is normal and correct. Transfer movement type moves stock between them if you need it.

### Transactions (`/admin/operations/transactions`)
The **Audit Trail** — every single movement, ever: product, location, type, reason, cost centre, quantity (±), unit cost, who, note, when. Fully filterable (date range, type, reason, location, product) — this is the page you open when something doesn't add up. It's also the legal/accounting record.

### Imports (`/admin/operations/imports`, `new`, `[id]`)
**Bulk operations from spreadsheets.** The full pipeline:
1. **Upload** an Excel/CSV (supplier delivery sheet, product list, or stock count sheet).
2. **Map columns** to system fields (item name, SKU, quantity, unit, price…).
3. **Preview & validate** — unknown items are flagged and matched to existing products; new items are marked "create".
4. **Approve** → the system either creates the products and/or **posts the ledger movements** exactly like a receiving or a count.
5. **Rollback** is available from the import detail page if you made a mistake — it reverses everything that import did, safely.
- Import modes: draft (preview only), direct (straight through), reconcile (count-style).
- **How it works:** imports go through the same validation + ledger rules as manual entry, they never bypass them, and nothing is partially applied — approve means all-or-nothing, rollback means fully undone.

### Notifications (`/admin/operations/notifications`)
**Low-stock and stock-out alerts** — the system watching the shelves for you.
- Unread / total / out-of-stock KPI cards, alert cards with product, location, current balance, threshold, and **Mark read**; "Check Stock Now" runs an on-demand scan; 60s auto-refresh.
- Sidebar shows a live badge with the unread count (like the messages badge).
- **How it works:** a product alerts when it drops below its reorder level (or 30-day-usage-based threshold); it's marked out-of-stock when balance = 0; the alert **auto-resolves** (marks read) when stock recovers — duplicates are impossible because each product has one active alert at a time.

---

## 7. Operations & Stock · Reports

### Reports (`/admin/operations/reports`)
The reporting hub — tabbed, with date/location filters and CSV export:
- **Daily Stock Report:** opening, purchases, sales, adjustments, closing per product, per day.
- **Variance Report:** expected vs actual from a chosen stock count.
- **Waste Report:** waste/breakage/spillage/comp/expiry-loss aggregated over a range.
- **Fast Movers / Slow Movers:** ranked by quantity sold (fast = buying trigger; slow = cash tied up on shelves).
- **Valuation:** balance × weighted-average unit cost per product — your stock value in Rands, per location.
- **Purchasing reports:** purchases by supplier, purchases by product, supplier performance, outstanding POs.
- Every number traces back to ledger transactions — pick any cell, open Transactions, and you can find the movements behind it.

---

## 8. Operations & Stock · Settings

### Settings (`/admin/operations/settings` + uoms / categories / cost-centres)
Three dictionary lists that everything else references:
- **Units of Measure:** how you count (each, bottle, case, kg, litre, tot). Add units, delete unused ones, and define **conversions** (1 case = 12 bottles) so the system converts between units cleanly.
- **Categories:** product groupings (Spirits, Beers, Meat & Poultry…). Add with an optional parent, rename, delete when empty — categories drive filters and reports.
- **Cost Centres:** your departments (Restaurant, Bar, Kitchen, Events, Private Functions, Takeaway, Delivery, VIP Room). Add, rename, archive. **Every movement is tagged to one** — this is what answers "what did the Bar actually cost this month?"

---

## 9. The Rest — Orders, Bookings, Website, People

### Orders (`/admin/orders`) • Kitchen (`/admin/kitchen`)
- **Orders:** every order from the website/waiters — statuses (received → approved → confirmed → preparing → ready → completed/cancelled), payment status, and actions. Dine-in gets approved and assigned to a waiter.
- **Kitchen:** the **Kitchen Display Screen (KDS)** — live incoming orders, tap to start/prepare/complete. This is the screen the kitchen works from; completing an order also triggers the stock deduction for its matched items.

### Bookings (`/admin/bookings`) • Quotes (`/admin/quotes`)
- **Bookings:** all function/table bookings from the website — filter by date/status/name; change status (confirmed → cancelled/refunded/completed). **Stock tie-in:** confirming a booking auto-reserves drink-package stock for the guest count; completing consumes it as SALE movements; cancelling releases the reservation — stock is never double-counted either way.
- **Quotes:** every booking that generated a **PDF quotation** (uploaded to storage and emailed to the customer automatically by the background worker). Regenerate the PDF from the quote's menu (bumped version, new email), view/download history.

### Pricing (`/admin/pricing`)
The no-code editor for **booking venue fees, packages, and add-ons** (price per person/half-day/day, extras like AV or decor). Changes apply to the public booking form instantly.

### Availability (`/admin/availability`)
**Blocked dates** — mark dates where rooms/areas can't be booked (private buy-out, maintenance, holidays). Prevents double-bookings and backs up your calendar promises.

### Menu (`/admin/menu`) • Menu Categories (`/admin/categories`) • Bar Menu (`/admin/bar-menu`)
- **Menu Items:** the public menu — name, description, price, category, image, availability toggle, search + category filter.
- **Menu Categories:** the menu's sections and their order.
- **Bar Menu:** the separate drinks/bar menu editor.
- All three feed the live public site menu instantly.

### Content — Site Settings, Events, Promotions, Gallery, Media, Popup, Announcement
- **Site Settings:** site-wide config (contact details, socials, opening hours, branding).
- **Events:** upcoming/past events shown on the site; create/edit/delete.
- **Promotions:** banners and offers (copy or delete).
- **Gallery:** public photo/video showcase, organised into folders.
- **Media Library:** every uploaded image/video — reusable across the site with copyable URLs.
- **Popup:** the weekend breakfast-buffet popup — text, schedule, show/hide.
- **Announcement:** the slim bar at the very top of the site (e.g. "Closed 25 Dec").

### People — Messages, Inquiries, Waiters
- **Messages:** chat with staff members who use the staff app (admin sees all conversations, unread badge in the sidebar, live via Supabase realtime).
- **Inquiries:** messages from the website **contact form** (name/phone/email/subject/message) with read/unread and delete.
- **Waiters:** the waiter roster — add/remove waiters with their PINs, mark on/off duty (this drives the orders waiters see).

### Growth — Analytics, Marketing • System — Background Jobs
- **Analytics:** revenue and order-count charts over time from real order data.
- **Marketing:** the marketing studio — campaign/project library (duplicate, archive).
- **Background Jobs:** see section 1.
- **View Website** (footer of the sidebar): opens the live public site in a new tab.

---

## Daily rhythm cheat-sheet (recommended order)

1. **Morning:** Opening Checklist → check fridge temps + par levels (5 min).
2. **Reconcile** Food (kitchen manager) and Beverage (bar manager) — or do the combined **Daily Stock Input** for the store.
3. **Receiving:** check the queue, receive any due deliveries (stock + cost update themselves).
4. **Waste & Breakage:** record the previous day's shrinkage (or spot-record as it happens).
5. **Weekly (Mondays):** open Weekly View — did last week's usage match deliveries? Adjust this week's POs.
6. **Reorder Suggestions + Forecasting:** place the week's order against actual usage and lead times.
7. **Mondays, monthly:** stock count at month-end (snapshot → count → submit → approve) then pull Reports: valuation + waste + supplier performance for the month review.

Everything flows from the **one ledger** — so whatever screen you did it on, it shows up everywhere else immediately, with the reason, cost centre, and your name attached.