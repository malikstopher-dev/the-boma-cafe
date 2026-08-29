# BOMA Client Handover Screenshot Index

Captured from the current production interface at a consistent 1440 x 900 desktop viewport on 2026-08-29.

## Approved Captures

### 01-owner-dashboard.png
- **Screen/page:** Owner Dashboard
- **Route:** `/dashboard`
- **Demonstrates:** Canonical owner overview, financial KPIs, stock-by-section cards, supplier position, period controls, and dashboard navigation.
- **Manual placement:** Owner / Management Dashboard
- **Caption:** Owner Dashboard — consolidated operational and financial overview.
- **Privacy:** Reviewed safe. No customer PII, credentials, tokens, or banking details.

### 02-admin-dashboard.png
- **Screen/page:** Admin Dashboard
- **Route:** `/admin/dashboard`
- **Demonstrates:** Daily Stock Input status, Command Center shortcuts, operations navigation, and management summary panels.
- **Manual placement:** Admin Dashboard
- **Caption:** Admin Dashboard — daily operations command center.
- **Privacy:** Reviewed safe. Contains operational staff display names only; no customer contact data or credentials.

### 03-admin-operations.png
- **Screen/page:** Morning Opening Checklist
- **Route:** `/admin/operations`
- **Demonstrates:** Opening checklist categories, completion progress, management dashboard, and reconciliation summary.
- **Manual placement:** Daily Opening Workflow
- **Caption:** Morning Opening Checklist — the manager’s starting point for the day.
- **Privacy:** Reviewed safe. No customer PII, credentials, tokens, or banking details.

### 06-waiter.png
- **Screen/page:** Waiter floor plan / table selection
- **Route:** `/waiter`
- **Demonstrates:** Main Dining floor plan and table selection interface.
- **Manual placement:** Waiter Operations
- **Caption:** Waiter floor plan — select a table before starting an order.
- **Privacy:** Reviewed safe. Identity header and employee ID were excluded from the capture; no order was created.

### 09-menu-management.png
- **Screen/page:** Bar Menu management
- **Route:** `/admin/bar-menu`
- **Demonstrates:** Menu categories, drinks, prices, availability labels, and menu administration controls.
- **Manual placement:** Menu Management
- **Caption:** Bar Menu — organised drinks catalogue with category controls.
- **Privacy:** Reviewed safe. No customer or supplier personal information.

### 10-inventory-toolkit.png
- **Screen/page:** Inventory & Purchasing toolkit
- **Route:** `/inv`
- **Demonstrates:** The separate operational inventory toolkit and its stock, purchasing, catalogue, reporting, and system navigation.
- **Manual placement:** Inventory Toolkit
- **Caption:** Inventory & Purchasing — separate operational toolkit for detailed stock work.
- **Privacy:** Reviewed safe. No customer PII, credentials, tokens, or banking details.

### 12-stock-count.png
- **Screen/page:** Stock Counts list
- **Route:** `/admin/operations/stock-counts`
- **Demonstrates:** Area selector, count sessions, statuses, completion dates, and New Count entry point.
- **Manual placement:** Stock Counts
- **Caption:** Stock Counts — review physical-count sessions by area and status.
- **Privacy:** Reviewed safe. No customer PII, credentials, tokens, or banking details.

### 14-forecast.png
- **Screen/page:** Forecasting
- **Route:** `/admin/operations/forecast`
- **Demonstrates:** Products tracked, out-of-stock count, critical stock, inventory-type filters, days remaining, and projected stock-out dates.
- **Manual placement:** Forecasting and Reorder
- **Caption:** Forecasting — identify stock-out risk before it affects service.
- **Privacy:** Reviewed safe. Product and stock information only.

### 15-reorder.png
- **Screen/page:** Reorder Suggestions
- **Route:** `/admin/operations/reorder`
- **Demonstrates:** Suggested order count, critical items, inventory-type filter, stock levels, lead times, and suggested quantities.
- **Manual placement:** Forecasting and Reorder
- **Caption:** Reorder Suggestions — prioritised replenishment recommendations.
- **Privacy:** Reviewed safe. Product and stock information only.

### 16-purchasing.png
- **Screen/page:** Purchase Orders
- **Route:** `/admin/operations/purchase-orders`
- **Demonstrates:** Purchase-order status, supplier, expected date, event attribution, item counts, and New PO entry point.
- **Manual placement:** Purchasing and Receiving
- **Caption:** Purchase Orders — monitor supplier deliveries and purchasing status.
- **Privacy:** Reviewed safe. Supplier names only; no supplier contact or banking details.

### 18-reports.png
- **Screen/page:** Reports hub
- **Route:** `/admin/operations/reports`
- **Demonstrates:** Daily usage, variance, waste, fast movers, slow movers, and valuation report tabs with filters and XLSX export.
- **Manual placement:** Reports
- **Caption:** Reports — one hub for operational analysis and Excel export.
- **Privacy:** Reviewed safe. No customer PII, credentials, tokens, or banking details.

### 19-content-gallery.png
- **Screen/page:** Gallery management
- **Route:** `/admin/gallery`
- **Demonstrates:** Main Gallery and Local Boards sections, item count, and content-management entry point.
- **Manual placement:** Content and Gallery Management
- **Caption:** Gallery Management — manage customer-facing visual content.
- **Privacy:** Reviewed safe. Empty gallery state; no media or personal information shown.

### 20-public-home.png
- **Screen/page:** Public homepage
- **Route:** `/`
- **Demonstrates:** Customer-facing brand experience, navigation, hero presentation, event promotion, menu, and booking calls to action.
- **Manual placement:** Public Customer Experience
- **Caption:** Public Homepage — the customer-facing Boma Cafe experience.
- **Privacy:** Reviewed safe. Public marketing content only.

### 21-public-menu.png
- **Screen/page:** Public menu landing page
- **Route:** `/menu`
- **Demonstrates:** Customer-facing menu presentation, navigation, brand treatment, and menu entry point.
- **Manual placement:** Public Customer Experience
- **Caption:** Public Menu — customer-facing food and drinks presentation.
- **Privacy:** Reviewed safe. Public menu content only.

## Skipped Captures

- **04-orders.png:** Rejected because the production page showed a connection-lost/empty cached-data state rather than a reliable operational view.
- **05-bookings.png:** Rejected because records displayed customer email addresses, phone numbers, and private notes.
- **07-kitchen-board.png:** Rejected because the board showed a connection-lost/retrying state with no useful order cards.
- **08-bar-board.png:** Rejected because the board showed a connection-lost/retrying state with no useful order cards.
- **11-current-stock.png:** Rejected because the page remained on loading skeletons after the capture wait.
- **13-stock-alerts.png:** Not captured separately; the Forecasting capture demonstrates the current out-of-stock state more clearly.
- **17-suppliers.png:** Rejected because the supplier list exposed phone numbers and email addresses unnecessarily.
- **22-public-booking.png:** Rejected because `/booking` is not a valid current route and returned 404.
- **Waiter sign-in screen:** Rejected because it would show a credential-entry screen; the approved floor-plan capture is safer and more useful.

## Capture Safety

- Production mutations performed: **NONE**
- Runtime, application, database, migration, configuration, and deployment changes: **NONE**
- Credentials, PINs, tokens, cookies, API keys, supplier banking details, and customer contact data: **NOT included**
- Temporary capture scripts and debug artifacts: **removed**
- Batch 4 status: **FIXED - VERIFIED**
- Active runtime mission: **NONE**
