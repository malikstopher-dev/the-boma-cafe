# The Boma Cafe — System Operations Manual & Client Handover

**Version:** 1.0  
**Date:** 2026-08-27  
**Production URL:** `https://the-boma-cafe.vercel.app`  
**Audience:** Owner, Management, Admin, Waiter, Kitchen, Bar staff

---

## 1. System Overview

The Boma Cafe runs on a single integrated platform that handles:

- **Online ordering** — customers order from the website or QR-code menu
- **Bookings** — function and venue hire with PDF quotations
- **Kitchen and bar operations** — live order boards with preparation timers
- **Waiter operations** — table ordering from the floor
- **Inventory management** — a transaction-ledger stock system with purchasing, receiving, stock counts, waste tracking, forecasting, and reports
- **CMS** — menu, gallery, events, promotions, and site content
- **Staff chat** — real-time messaging between all roles

Everything connects through one shared ledger. When stock is delivered, sold, wasted, or counted, the same movement appears on every relevant screen instantly.

---

## 2. Access and Roles

### Login Paths

| Role | Login URL | What you see |
|------|-----------|-------------|
| Owner | `/admin/login` | Owner Dashboard, full Operations, Admin, everything |
| Full Manager | `/admin/login` | Admin Dashboard, full Operations (except account deletion and security settings) |
| Manager | `/admin/login` | Admin Dashboard, Operations (read/write, stock count submit, PO create/receive) |
| Assistant Manager | `/admin/login` | Admin Dashboard (view only, waiter PIN resets only) |
| Kitchen | `/staff/login` | Kitchen order board only |
| Bar | `/staff/login` | Bar order board only |
| Waiter | `/staff/login` | Waiter ordering app (food, drinks, tables, history) |

### How Login Works

**Admin accounts** (Owner, Full Manager, Manager, Assistant Manager):  
Each person has their own username and password. The login page shows a dropdown of all admin accounts. Select your name, enter your password, and you land on your dashboard.

**Staff roles** (Kitchen, Bar, Waiter):  
Use the shared station password for your role at `/staff/login`. Select your role (Kitchen, Bar, or Waiter), enter the password, and you land on your board.  
Waiters additionally use a PIN to access the waiter app after the initial station login.

### Session Duration

Admin and staff sessions remain active for one year unless you explicitly log out. Closing the browser does not end your session — you will still be logged in when you return.

### Logging Out

Every screen has a Logout option. Logging out ends your session immediately. On the admin panel, the logout button is in the top-right banner. On staff boards, it is in the sidebar or navigation.

---

## 3. Owner Dashboard (`/dashboard`)

The Owner Dashboard is your at-a-glance business screen. It shows:

- **Greeting** with time of day
- **KPI cards:** Purchases, Stock Used, Waste, Adjustments, Current Stock Value, Outstanding (supplier invoices owed)
- **Boards:** today's orders, recent bookings, recent activity
- **Movement chart:** visual overview of stock movement over time
- **Week picker:** select any week of the year to see delivered vs used for that period
- **Auto-refresh:** data refreshes silently every 60 seconds while the tab is open
- **Quick links** to Operations, the public website, and Logout

The left sidebar provides navigation to the full operational inventory toolkit (`/inv`).

---

## 4. Operational Inventory Toolkit (`/inv`)

The `/inv` portal is a separate operational toolkit for day-to-day inventory work. It provides:

- **Stock Sheet** — a spreadsheet-style grid for counting stock, recording deliveries, and waste in one view
- **Products** — product catalogue
- **Suppliers** — supplier directory with banking details
- **Purchases** — purchase order management
- **Payables** — supplier invoice and payment tracking
- **Locations** — stock location management
- **Adjustments** — quick stock adjustments with reason tracking
- **Reports** — daily, waste, fast-movers, slow-movers, valuation
- **Stock Counts** — formal periodic counting
- **Activity** — full movement audit trail
- **Waste** — waste and breakage logging

The Owner Dashboard (`/dashboard`) and the Operations Toolkit (`/inv`) are separate screens that share the same underlying data. Use whichever suits your current task.

---

## 5. Admin Operations (`/admin/operations`)

The admin Operations section is the management hub. Its landing page is the **Opening Checklist** — the first screen of the day.

### Navigation Groups

**Open (daily workflow):**
- Opening Checklist
- Reconcile Food / Reconcile Beverage
- Stock Counts
- Variance Report

**Inventory:**
- Dashboard (KPIs, alerts, activity)
- All Products / Food Products / Beverage Products
- Containers
- Reorder Suggestions
- Forecasting
- Analytics

**Purchasing:**
- Purchase Orders
- Receiving (goods-in queue)
- Suppliers
- Supplier Performance
- Price History

**Production:**
- Recipes
- Production Runs
- Waste & Breakage
- Order Items (POS-to-inventory bridge)
- Menu Integration (link menu items to inventory products)

**Records:**
- Locations
- Transactions (full audit trail)
- Imports (bulk spreadsheet operations)
- Notifications (low-stock alerts)

**Reports / Settings** — reporting hub and configuration (UOMs, categories, cost centres)

---

## 6. Online Ordering

### How a Customer Order Works

1. Customer browses the public menu at `/menu`
2. Adds items to cart (food from the food menu, drinks from the bar menu)
3. Proceeds to checkout — enters name, phone, order type (dine-in/takeaway/delivery)
4. Submits the order
5. The system creates the order and splits it automatically:
   - **Food items** go to the Kitchen board
   - **Drinks** go to the Bar board
   - Mixed carts produce two separate orders, one per station
6. The customer receives a tracking reference and can check status at the tracking URL
7. An optional receipt is available after phone verification

### Order Tracking

Customers track their order using the reference shown after submission. The tracking page shows order status in real time. A phone verification step protects receipt access.

---

## 7. Complete Order Lifecycle

An order moves through these statuses:

```
pending → confirmed → preparing → ready → served → completed
```

Or it can be cancelled or rejected at various stages:

```
pending → cancelled (by either Kitchen/Bar or Admin)
pending → rejected (by Admin only, for online orders)
confirmed → cancelled
preparing → cancelled
ready → cancelled
served → cancelled
```

### Who Does What

| Status Change | Who | How |
|--------------|-----|-----|
| pending → confirmed | Admin (accept button on Admin Orders page) | Online orders need admin approval before preparation |
| pending → preparing | Kitchen or Bar (Start Prep on the board) | Waiter-placed orders can start prep immediately |
| confirmed → preparing | Kitchen or Bar (Start Prep on the board) | Sets preparation time estimate |
| preparing → ready | Kitchen or Bar (Mark Ready on the board) | Order is ready for collection or service |
| ready → served | Waiter (on the waiter app) | Waiter confirms they have collected the order |
| served → completed | Waiter (on the waiter app) | Order is finalized, triggers inventory deduction |
| Any active → cancelled | Kitchen, Bar, or Admin | Cancels the order; stock is not deducted |

### What Happens on Completion

When an order reaches `completed`, the system automatically deducts the correct stock from the correct location:
- Food items deduct from Kitchen inventory
- Bar items deduct from Main Bar inventory
- Each deduction is a ledger transaction with the exact quantity and cost
- If stock is insufficient, the deduction is queued and retried — the order still completes

---

## 8. Waiter Operations

### Login

1. Go to `/staff/login`
2. Select **Waiter**
3. Enter the shared waiter password
4. You arrive at the Waiter app (`/waiter`)

### Placing an Order

1. **Select a table** from the floor plan (Tables tab)
2. **Browse the menu** — Food tab for food, Drinks tab for drinks
3. **Add items** to your cart — tap an item, choose quantity, add notes if needed
4. **Review your cart** — adjust quantities, add order-level notes
5. **Submit** — the order is sent to the kitchen and/or bar automatically

### What the Waiter Can Do

- Create new orders for any table
- Browse food and drink menus
- View order history (filtered to your name)
- View live order status on the Done screen (real-time updates)
- Mark orders as **served** (collected from kitchen/bar)
- Mark orders as **completed** (finalized)
- View confirmed bookings (Bookings tab)
- Send and receive staff messages

### What the Waiter Cannot Do

- Cancel a submitted order (must be done by Kitchen, Bar, or Admin)
- Change order items after submission
- Access inventory, purchasing, or admin functions
- Modify other waiters' orders

---

## 9. Kitchen Operations

### Login

1. Go to `/staff/login`
2. Select **Kitchen**
3. Enter the shared kitchen password
4. You arrive at the Kitchen Display Screen

### The Kitchen Board

The board shows orders in columns by status:

| Column | What it means |
|--------|--------------|
| **New** | Pending orders waiting to be started (waiter orders can start immediately; online orders need admin confirmation first) |
| **Preparing** | Orders currently being made — shows a countdown timer |
| **Ready** | Orders finished and waiting for the waiter to collect |
| **Cancelled** | Orders that were cancelled |

### Kitchen Actions

- **Start Prep** — tap on a pending/confirmed order to begin preparation. You can set an estimated preparation time (5, 10, 15, 20, 30, 45, or 60 minutes) or start without a time estimate.
- **Mark Ready** — tap when the order is done. The waiter is notified.
- **Cancel** — cancel an order if needed (available from any active status)
- **Adjust Timer** — while preparing, you can change the estimated time by typing a new value and pressing Set

### Timer Behaviour

- The timer shows elapsed time since the order was placed
- **Green** — on track (less than 70% of target time)
- **Amber** — approaching target (70-100%)
- **Red and pulsing** — overdue (over 100% of target)
- Kitchen default target: 15 minutes
- Bar default target: 5 minutes

### Sound Alerts

- A **ding** sounds when a new order arrives
- A **chime** sounds when a bar order is marked ready

---

## 10. Bar Operations

### Login

1. Go to `/staff/login`
2. Select **Bar**
3. Enter the shared bar password
4. You arrive at the Bar Display Screen

### The Bar Board

Identical layout to the Kitchen board (New, Preparing, Ready, Cancelled columns), but showing only bar/drink orders.

### Bar Actions

Same as Kitchen: Start Prep, Mark Ready, Cancel, Adjust Timer.

### Bar-Specific Differences

- Timer target is **5 minutes** (vs Kitchen's 15 minutes)
- Quick-select preparation times: 2, 5, 8, 10, 15, 20 minutes
- Bar only sees orders containing drink items

---

## 11. Preparation Timers

### Setting a Timer

When you tap **Start Prep** on an order:
1. A time selector appears with quick options
2. Tap a time or enter a custom value
3. The timer starts counting down
4. If you prefer, tap **Start without time estimate** to begin without a countdown

### Changing a Timer

While an order is being prepared:
1. Find the order in the Preparing column
2. Type a new time in the minutes field
3. Press **Set** to update

### Timer States

- **Countdown active** — shows remaining time with status label (On track / Almost ready / Overdue)
- **No estimate set** — shows estimated prep minutes without a live countdown
- **Order ready** — timer stops, shows "Ready"

### Preparing Status

Once you start prep, the order moves to the Preparing column. The timer shows how long it has been since preparation started. If you set an estimate, a countdown shows how much time remains.

### Ready Status

When you tap **Mark Ready**, the order moves to the Ready column. A brief auto-clear countdown runs before the order clears from the board. The waiter is notified to collect.

---

## 12. Online Bookings

### How a Customer Booking Works

1. Customer visits the booking page on the website
2. Selects a venue area (Indoor, Outdoor, etc.)
3. Chooses a date and time
4. The system checks availability in real time
5. Fills in guest count, event type, contact details
6. Submits the booking
7. The system creates a draft booking and generates a PDF quotation
8. The quotation is emailed to the customer automatically
9. The customer reviews and accepts the quotation
10. A deposit is requested and processed
11. Once the deposit is paid, the booking is confirmed

### Booking Status Flow

```
draft → quote_sent → awaiting_deposit → deposit_paid → confirmed → in_progress → completed
```

At various stages, a booking can be:
- **Cancelled** — by admin action
- **Refunded** — after cancellation, if a refund is processed

### What Happens on Confirmation

When a booking is confirmed:
- Drink package stock is **reserved** (not yet deducted)
- The reservation holds the stock so it cannot be used elsewhere

### What Happens on Completion

When a booking is completed:
- Reserved stock is **consumed** — ledger transactions are posted for each drink package item
- Stock is deducted exactly as ordered

### What Happens on Cancellation

When a booking is cancelled:
- Reserved stock is **released** — the hold is removed
- No stock is deducted (the event did not happen)

---

## 13. Admin Booking Management

### Bookings Page (`/admin/bookings`)

- View all bookings with status, date, guest count, and venue
- Filter by status, date range, or search by name
- Change booking status (confirm, complete, cancel, refund)
- Each status change follows the rules above

### Quotes Page (`/admin/quotes`)

- View all generated PDF quotations
- Download or view the PDF
- Regenerate a quotation (creates a new version and re-sends the email)
- View quote history and version tracking

### Pricing (`/admin/pricing`)

- Configure venue fees, packages, and add-ons
- Set per-person pricing, half-day and day rates
- Add extras like AV equipment or decor
- Changes apply to the public booking form immediately

### Availability (`/admin/availability`)

- Block dates when venues cannot be booked (private events, maintenance, holidays)
- Prevents double-bookings
- Supports multiple venue areas

---

## 14. Menu Management

### Menu Items (`/admin/menu`)

The food menu editor. Each item has:
- **Name** and **description**
- **Price** (displayed as text on the public menu)
- **Category** (which section it belongs to)
- **Image** (uploaded to storage)
- **Availability toggle** — turn off to hide from the public menu without deleting
- **Featured toggle** — highlight on the homepage
- **Promo badge** — optional promotional label

### Sizes, Add-ons, and Options

Menu items support optional modifiers stored as JSON arrays:
- **Sizes** — e.g., "Small", "Medium", "Large"
- **Add-ons** — e.g., "Extra cheese", "Bacon" (with optional price)
- **Options** — e.g., "Spice level", "Cooking preference"

These appear on the public menu and in the waiter ordering app.

### Menu Categories (`/admin/categories`)

Sections of the food menu (e.g., "Starters", "Mains", "Desserts"). Each category has:
- A name and optional description
- An order index (controls display sequence)
- An active toggle (hide the entire category)

Categories are a flat list — there are no subcategories.

### Bar Menu (`/admin/bar-menu`)

The drinks menu editor. Each bar item has:
- **Name**
- **Pricing** — bottle price, single/shot price, glass price, and/or a text price
- **Category** (linked to bar categories)
- **Availability toggle**
- **Pickup availability** — controls whether the item is available for pickup orders
- **Alcohol flag** — marks alcoholic items

Bar categories (e.g., "Spirits", "Cocktails", "Beers") are a separate flat list from food categories.

### Item Availability

Both food and bar items have an **is_available** toggle:
- **On** (default) — item appears on the public menu and in the waiter app
- **Off** — item is hidden from public view but remains in the admin for editing

Categories also have an **is_active** toggle — deactivating a category hides all its items.

---

## 15. Inventory

### The Ledger Concept

Every screen in the Operations section reads from and writes to one shared **transaction ledger**. Think of it as a bank account per product, per location:

- **Deposits** (positive quantities): deliveries, returns, transfers in
- **Withdrawals** (negative quantities): sales, waste, breakage, usage
- **Balance** = everything that has ever happened to that product at that location

Nothing is ever edited in place. Every change is recorded as a movement with:
- Which product
- Which location (Main Bar, Kitchen, Dry Store, etc.)
- Quantity (positive = stock in, negative = stock out)
- Reason type (why this happened)
- Cost centre (which department it belongs to)
- Who did it and when

Your stock balance is always what the ledger says.

### Physical Stock Locations

Stock is tracked per physical location. Each location has its own balance for every product. Known locations:

| Location | Purpose |
|----------|---------|
| **Main Bar** | Primary bar stock — spirits, mixers, beers |
| **Kitchen** | Food ingredients and kitchen supplies |
| **Dry Store** | Non-refrigerated bulk storage |
| **Puff Lounge** | Separate lounge area stock |
| **Art Area** | Art/event area stock |

Each location is linked to a **cost centre** (Restaurant, Bar, Kitchen, Events, etc.), so every movement is automatically tagged to the right department for financial reporting.

**Important:** Physical location and inventory type are different concepts. A product can exist at multiple locations (e.g., Vodka at Main Bar AND Dry Store), and locations can hold different types (food, beverage, cleaning, etc.).

### Inventory Types

Products are classified into types:
- **FOOD** — food ingredients and supplies
- **BEVERAGE** — drinks, spirits, mixers
- **CLEANING** — cleaning supplies
- **PACKAGING** — packaging materials
- **GENERAL** — everything else
- **GAS** — LPG cylinders

Types help filter views and reports but do not restrict which locations can hold them.

### Stock Movement Meanings

Every ledger movement has a **reason type** that explains why it happened. Here are the canonical categories:

**Inbound / Received** — stock that arrived at the location:
- `purchase` — goods received from a supplier via a purchase order
- `return` — stock returned by a customer or another location
- `transfer_in` — stock moved in from another location

**Sold / Customer Usage** — stock consumed by customers:
- `sale` — sold via an order (online, waiter, or POS)
- `sale_bottle` — sold as a full bottle (e.g., table service)

**Internal Consumption** — stock used internally, not sold:
- `comp` — given to a customer free of charge (complimentary)
- `staff` — consumed by staff (staff meals, staff drinks)
- `production` (negative) — ingredients consumed during production runs
- `gas_usage` — LPG gas consumed

**Waste / Loss** — stock that left without being sold:
- `waste` — general spoilage or disposal
- `breakage` — items broken or damaged
- `spillage` — liquid spills
- `expiry_loss` — expired products discarded
- `theft` — suspected or confirmed theft
- `stolen` — confirmed stolen stock
- `donation` — stock donated

**Adjustment** — manual corrections:
- `adjustment` — manual correction with documented reason

**Physical Count Variance** — difference found during a stock count:
- `physical_count` — the difference between what was counted and what the system expected. This is separate from a generic adjustment.

**Important:** Physical Count Variance is never the same as Stock Used. A count that finds less stock than expected does not mean the stock was "used" — it means there is a discrepancy between the physical count and the system record.

---

## 16. Stock Counts

### What Is a Stock Count

A formal, periodic physical count of all products at a specific location. This is the most accurate way to verify your stock levels.

### How to Do a Stock Count

1. Go to **Stock Counts** in the Operations sidebar
2. Click **New Count**
3. Select a **location** (each count covers one location only)
4. The system takes a snapshot of expected balances at that moment
5. Count each product physically — type the quantity you actually have
6. The system shows the **variance** (difference between expected and counted)
7. When done, click **Submit** to send for review
8. A manager or owner clicks **Approve** to post the adjustments

### What Happens on Approval

For every product where the physical count differs from the expected balance:
- A `physical_count` ledger movement is posted for the exact variance
- Positive variance = you have more than expected (stock increases)
- Negative variance = you have less than expected (stock decreases)
- The dashboard cache is refreshed

### Stock Count Features

- **All Areas** filter on the list page — view counts across all locations or filter to one
- **Barcode scanning** — scan a product barcode to jump directly to that item in the count
- **Expected balance** — shown for each product, based on the snapshot taken when the count was created (not the live balance, so mid-count deliveries do not distort your variance)
- **Submit and Approve** are separate steps — a submitted count must be approved by someone with the `final_approve` permission (Owner or Full Manager)

---

## 17. Purchase Orders

### The PO Lifecycle

```
Draft → Approved → Ordered → Partial → Received
                                    → Cancelled (from any open status)
```

1. **Draft** — create a new PO, add line items (product, quantity, unit cost)
2. **Approved** — a manager reviews and approves the order
3. **Ordered** — the order has been sent to the supplier
4. **Partial** — some items have been delivered, more are expected
5. **Received** — all items have been delivered
6. **Cancelled** — the order was cancelled at any open stage

### Creating a Purchase Order

1. Go to **Purchase Orders** → **New PO**
2. Select a **supplier** from the dropdown
3. Add line items: pick a product, enter quantity and unit cost
4. Optionally link to a **booking/event** (for event-specific purchasing)
5. Optionally set a **cost centre** (defaults to the location's cost centre)
6. Save as Draft

### Repeating a Previous Order

On any existing PO detail page, click **Repeat** to create a new PO pre-filled with the same supplier and items. Adjust quantities as needed, then create.

### Receiving Goods

1. Go to **Receiving** — shows only POs that are Ordered or Partial (things actually due)
2. Click through to the PO
3. For each line item, enter the **quantity received** and **invoice number**
4. If receiving less than ordered, select a **shortage reason** (Supplier Shortage, Backorder, Damaged, Returned, Other)
5. Click **Receive**

### What Happens on Receiving

When you receive goods:
- A **purchase ledger transaction** is posted for each line (stock increases, cost is recorded)
- An **supplier invoice** is automatically created (you owe the supplier for the received goods)
- The PO status updates to Partial or Received
- The **receiving admin's name** is recorded on the receipt

### Over-Receive Protection

You cannot receive more than the outstanding quantity. If you ordered 50 and already received 30, you can only receive up to 20 more.

---

## 18. Suppliers

### Supplier Directory (`/admin/operations/suppliers`)

Maintain your supplier list:
- Name, contact person, phone, email
- Payment terms (Cash, Cash on Delivery, Weekly, Monthly, Account with custom days)
- Linked products (what they supply)
- Banking details (encrypted, owner/full-manager only)

### Supplier Performance (`/admin/operations/supplier-performance`)

A scorecard per supplier based on actual PO history:
- On-time delivery rate
- Average lead time
- Number of orders placed
- Total value received

### Price History (`/admin/operations/price-history`)

Every time you receive goods at a new price, it is recorded here. Track cost changes per product over time to negotiate better deals.

---

## 19. Low Stock

Low stock is flagged when a product's balance falls **at or below its reorder threshold**. The system checks this against the balance cache at each location.

- **Low Stock alerts** appear on the Operations Dashboard
- **Notifications page** shows unread low-stock alerts with a live badge in the sidebar
- Alerts **auto-resolve** when stock recovers above the threshold
- Out-of-stock items (balance = 0) are always flagged

---

## 20. Out of Stock

A product is **out of stock** when its balance at a location is zero or below. This is shown:
- On the Products list as a red "Out of Stock" badge
- On the Dashboard as an alert
- On the Forecast page as `out_of_stock` urgency

Out-of-stock products cannot be sold until stock is replenished.

---

## 21. Reorder Suggestions (`/admin/operations/reorder`)

The auto-restock list, calculated from actual usage data:

- Each row shows: product, current balance, reorder level (par), daily usage rate, and suggested order quantity
- Sorted by urgency — products that will run out soonest appear first
- **How it works:** the system looks at your 30-day sales history, calculates daily usage, and suggests how much to order to bring stock back to a healthy level
- Products without a reorder rule are also included if they are low or out of stock

---

## 22. Forecasting (`/admin/operations/forecast`)

**"When will I run out?"**

- **Depletion table:** per product — current balance, daily usage, days remaining, projected stock-out date
- **Urgency badges:**
  - Out of Stock — balance is zero
  - Critical — will run out before a new delivery can arrive (within lead time)
  - Warning — running low but not critical yet
  - OK — healthy stock level
- **Consumption patterns:** which days of the week and hours your sales peak — so you know when to schedule deliveries
- Filter by inventory type (Food, Beverage, etc.)

### Forecast vs Reorder — What Is the Difference?

- **Reorder** answers: "What should I order right now?" — it suggests quantities based on current stock and usage
- **Forecast** answers: "When will I run out?" — it projects forward based on usage trends
- Both use the same underlying data (sales history and current balance), but serve different planning purposes

---

## 23. Reports (`/admin/operations/reports`)

A tabbed reporting hub with date and location filters:

| Report | What It Shows |
|--------|--------------|
| **Daily Stock** | Opening balance, purchases, sales, adjustments, closing balance per product per day |
| **Variance** | Expected vs actual from a chosen stock count |
| **Waste** | Waste, breakage, spillage, comp, and expiry loss over a date range |
| **Fast Movers** | Products ranked by quantity sold (highest first) — what is flying off the shelf |
| **Slow Movers** | Products ranked by quantity sold (lowest first) — what is tying up cash |
| **Valuation** | Balance multiplied by unit cost per product — your stock value in Rands |

Additional purchasing reports:
- Purchases by supplier
- Purchases by product
- Supplier performance
- Outstanding purchase orders

Every number traces back to ledger transactions. Export any report as **Excel (.XLSX)** for further analysis.

---

## 24. Realtime Synchronization

Changes made on one device should normally appear on other relevant devices automatically. For example:

- When Kitchen marks an order Ready, the Waiter app shows the updated status within seconds
- When a new order is placed, the Kitchen and Bar boards show it immediately
- When stock is adjusted, the Dashboard updates
- When a low-stock alert fires, the notification badge appears in the sidebar

The system uses a signal-based invalidation approach — when something changes, affected screens are notified and refresh their data. If a device loses connection, it will catch up automatically when the connection is restored.

**If a screen does not update:**
- Press the **Refresh** button on the page
- Check your internet connection
- The safety refresh runs every 5 minutes while the tab is open

---

## 25. Staff Chat and Voice Messages

### Accessing Chat

- Admin: **Messages** in the sidebar or bottom navigation
- Staff: **Messages** tab in the waiter app, or navigate to `/staff/messages`

### How Chat Works

- Conversations are created between staff members
- Text messages appear in real time
- Voice messages can be recorded (WebM audio format, up to 10 MB)
- An unread badge shows in the sidebar when you have new messages

### Sending a Message

1. Open the Messages page
2. Select or create a conversation
3. Type your message or record a voice note
4. Send — the message appears on the other person's screen immediately

---

## 26. CMS and Gallery

### Content Management

The admin panel provides editors for all public-facing content:

| Section | What It Controls |
|---------|-----------------|
| **Site Settings** | Contact details, social links, opening hours, branding, SEO |
| **Menu** | Food menu items, descriptions, prices, images |
| **Bar Menu** | Drinks menu items and pricing |
| **Menu Categories** | Sections of the food menu |
| **Events** | Upcoming and past events shown on the site |
| **Promotions** | Banners and special offers |
| **Gallery** | Photo and video showcase (Events, Food, Venue, People, Promotions folders) |
| **Media Library** | All uploaded images and videos with reusable URLs |
| **Popup** | Weekend breakfast buffet popup — text, schedule, show/hide |
| **Announcement** | Slim bar at the top of the site (e.g., holiday closures) |

### Gallery

- Organised into five folders: Events, Food, Venue, People, Promotions
- Upload images and videos through the admin panel
- Featured items appear on the public site
- Items are stored securely in cloud storage

### Media Library

- Central repository for all uploaded media
- Copy URLs for use across the site
- Upload through the admin Media page

---

## 27. Common Daily Workflows

### Opening (Morning)

1. Log in as Manager or Owner
2. Open the **Opening Checklist** (Operations landing page)
3. Go through each task: check fridge temps, verify stock levels, review yesterday's closing
4. Mark each item Done, Skip, or Fail with optional notes
5. Add any manager notes at the bottom
6. Complete the checklist

### Receiving a Delivery

1. Check **Receiving** for POs in Ordered/Partial status
2. Click through to the PO
3. For each item, enter the quantity received and invoice number
4. If short, select a shortage reason
5. Click **Receive** — stock and cost update automatically, an invoice is created

### Online Customer Order

1. Customer places order on the website
2. Order appears on Kitchen/Bar boards as **New** (pending)
3. For online orders: Admin confirms the order (pending → confirmed)
4. Kitchen/Bar starts preparation (confirmed → preparing)
5. Kitchen/Bar marks ready (preparing → ready)
6. Waiter collects and marks served (ready → served)
7. Waiter finalizes (served → completed — stock is deducted)

### Waiter Order

1. Waiter selects a table on the floor plan
2. Browses food and drink menus
3. Adds items to cart
4. Submits — order goes directly to Kitchen/Bar as **New** (no admin confirmation needed)
5. Kitchen/Bar starts prep immediately
6. Rest of the flow same as above

### Kitchen Preparation

1. See a new order in the **New** column
2. Tap **Start Prep** — set an estimated time or start without
3. Order moves to **Preparing** with a live countdown
4. When done, tap **Mark Ready**
5. Order moves to **Ready** — waiter collects

### Bar Preparation

Same as Kitchen, but with shorter time estimates (5-minute default target).

### Stock Count

1. Go to **Stock Counts** → **New Count**
2. Select a location
3. Count each product — type the physical quantity
4. Review variances
5. **Submit** for manager review
6. Manager/Owner **Approves** — adjustments are posted

### Recording Waste

1. Go to **Waste & Breakage**
2. Search for the product
3. Select the type (Waste, Breakage, Spillage, Comped, Expired, Theft, Donation)
4. Enter quantity and notes
5. Submit — a negative ledger movement is posted

### Closing

1. Review the day's movements on the **Transactions** page
2. Record any outstanding waste or breakage
3. Complete the Opening Checklist if not already done
4. Review the **Weekly View** to check if deliveries matched usage

---

## 28. Troubleshooting

### Order Does Not Appear on Kitchen/Bar Board

- **Check:** was the order actually submitted? (Waiter should see it in their History)
- **For online orders:** has an admin confirmed it? (Online orders start as pending and need admin confirmation before prep can begin)
- **Try:** refresh the board (press the Refresh button or navigate away and back)
- **Still not there:** check your internet connection; the board auto-refreshes but a manual refresh helps

### Kitchen/Bar Board Does Not Update

- **Try:** press Refresh
- **Check:** are you logged in with the correct role? (Kitchen sees only kitchen orders, Bar sees only bar orders)
- **If status looks wrong:** another staff member may have already changed it — refresh to see the current state

### Connection Drops / Screen Freezes

- The system is designed to recover automatically when the connection is restored
- Press Refresh to force an immediate update
- If the screen is completely unresponsive, close and reopen the browser tab
- Your session persists — you do not need to log in again

### Order Status Appears Wrong

- Order statuses follow strict rules (e.g., you cannot go from Pending directly to Completed)
- If a status change was rejected, check that you are using the correct action for the current status
- Refresh to see the actual current status — another device may have already updated it

### Stock Looks Wrong

- Check the **Transactions** page for the product — every movement is recorded there
- If a delivery was not received through the PO system, it will not appear in the ledger
- Run a **Stock Count** to verify physical stock and post corrections
- Contact system support if you believe the ledger is incorrect

### Booking Issue

- **Double-booking:** the system checks availability before confirming — if you see a conflict, the slot may have been booked by another party in the meantime
- **PDF not received:** check the Background Jobs page for the booking's PDF job status; a failed job can be retried
- **Status stuck:** booking statuses follow strict rules — check that the current status allows the transition you are attempting

### Upload Fails

- Check your internet connection
- Ensure the file is within size limits (images should be reasonable size)
- Try a different browser if the issue persists
- Contact system support with the error message

### Login / Session Problem

- **Admin:** go to `/admin/login`, select your name from the dropdown, enter your password
- **Staff:** go to `/staff/login`, select your role, enter the shared password
- **Still cannot log in:** your password may need to be reset by an administrator
- **Session expired:** sessions last one year; if you cannot log in, contact an administrator

---

## 29. Support Reporting

When reporting a problem to system support, please provide:

1. **Page/screen** — which page were you on?
2. **Approximate time** — when did it happen?
3. **Order or booking reference** — if applicable
4. **Your role** — Kitchen, Bar, Waiter, Admin, Owner
5. **Screenshot** — if possible, a picture of what you saw
6. **Action attempted** — what were you trying to do?
7. **Visible error** — any error message shown on screen

**Never share** your password, PIN, or any credentials with support staff.

---

## 30. Client Training / Handover Checklist

Use this checklist to confirm each team member can:

- [ ] Log in with their role
- [ ] Navigate to their primary screen
- [ ] Place an order (Waiter)
- [ ] Start prep and mark ready (Kitchen/Bar)
- [ ] Set and change preparation timers (Kitchen/Bar)
- [ ] Receive a delivery via Purchase Order (Admin)
- [ ] Record waste or breakage (Admin)
- [ ] Run a stock count (Admin)
- [ ] Check low-stock alerts (Admin)
- [ ] View reports (Admin/Owner)
- [ ] Access staff chat (All)
- [ ] Log out correctly (All)
- [ ] Know when to contact system support
