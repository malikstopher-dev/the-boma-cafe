# Architecture Review Board — V3 + V3.1 Inventory Engine Assessment

**Date:** 2026-07-29
**Document:** ARB-001
**Project:** The Boma Café Inventory Engine
**Reviewers:**
- Principal Software Architect
- Enterprise Solutions Architect
- PostgreSQL Database Architect
- Hospitality ERP Consultant
- Restaurant Operations Manager
- Inventory & Supply Chain Expert
- UX Architect
- Security Architect
- DevOps / Scalability Architect

---

## 1. Overall Architecture

**Score: 8/10**

### Strengths

**Modularity (9/10).** The separation between the generic engine (`inventory/engine/`) and the bar module (`inventory/modules/bar/`) is exactly correct. The engine has no alcohol knowledge. This is the single strongest architectural decision in the proposal. It means kitchen, coffee, consumables modules can be added without touching the engine.

**Separation of concerns (9/10).** The proposal correctly isolates:
- Transaction ledger (append-only, immutable)
- Product catalog (CRUD)
- Import engine (Excel + matching)
- Stock counts (session-based)
- Intelligence layer (future, separate package)

Each has a distinct responsibility. The `inventory/lib/` and `inventory/api/` split is clean.

**Integration with existing system (8/10).** The M:N join table `bar_item_inventory_links` for menu-to-inventory is correct. The principle of "no breaking changes, additive FKs only" is pragmatic. The existing CMS remains untouched.

### Weaknesses

**File structure anticipates modules that don't exist yet (kitchen/, coffee/, consumables/).** This violates YAGNI. The directory tree promises functionality that may never be built. Empty module directories create unused imports, dead navigation, and confusion for developers.

**Recommendation:** Remove `kitchen/`, `coffee/`, `consumables/` directories from the V1 file tree. Re-add them only when a concrete second module is planned. The engine is already generic — there is no architectural debt in waiting.

**Coupling to Next.js App Router (6/10).** The entire subsystem lives in `src/inventory/pages/` as Next.js pages. This is appropriate for V1 (Boma Café is a Next.js project), but if this becomes a standalone SaaS product later, the inventory engine is tightly coupled to Next.js routing. The engine logic (`ledger.ts`, `conversion.ts`, etc.) is properly isolated, but the API routes are not.

**Recommendation:** Accept this coupling for V1. If commercial SaaS happens, the API routes would need to be extracted into a separate Express/Fastify service. The engine logic is already portable.

**Module orchestrator missing.** There is no single entry point for the inventory subsystem. A hypothetical `inventory/index.ts` or `inventory/engine.ts` that exports the full public API is absent. Developers will need to know the internal file structure to import anything.

**Recommendation:** Add an `inventory/index.ts` barrel file that exports the engine's public API: `createTransaction`, `getBalance`, `reconcile`, `parseImport`, etc. This is a small change with large maintainability benefit.

---

## 2. Database Architecture

**Score: 7/10**

### Strengths

**Transaction-ledger model (9/10).** This is the right choice. Append-only INSERTs, no UPDATEs on balance, `SUM(quantity)` for current stock. The advantages over a snapshot table are definitive: perfect audit trail, trivial rollback, impossible for stock and transactions to disagree. The proposal correctly identifies this and provides a clear comparison table.

**Soft delete strategy (8/10).** The rules are well-defined: products with history are immutable, zero-history products can be hard-deleted, import batches and transactions are permanent. The audit log table captures all archival and restoration events.

**Suppliers, locations, and categories as master tables (9/10).** Free-text fields would have caused a painful migration later. Proper FKs with UUID primary keys are correct.

**UOM architecture (8/10).** The base UOM vs display UOM separation, discrete vs continuous types, and conversion chains are well-designed. Storing all quantities in the base UOM and converting at display time is the standard approach.

### Weaknesses

**Empty UUIDs in unique index (3/10).**

```sql
CREATE UNIQUE INDEX idx_balance_product_location
  ON inventory_product_balances(product_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'));
```

The magic UUID `00000000-0000-0000-0000-000000000000` as a NULL sentinel in a unique index is fragile. If a real UUID with this value ever appears (extremely unlikely but possible via `gen_random_uuid()`), it will conflict. The standard PostgreSQL approach is a partial unique index:

```sql
CREATE UNIQUE INDEX idx_balance_product_location
  ON inventory_product_balances(product_id, location_id)
  WHERE location_id IS NOT NULL;
```

This is cleaner and avoids magic values.

**`product_type` on `inventory_uom_conversions` is ambiguous.**

```sql
product_type TEXT, -- nullable: general conversion vs product-specific
```

The proposal doesn't define what values `product_type` accepts, how it relates to `inventory_categories.module`, or whether it's meant as a free-text tag or a foreign key. This is a maintenance liability.

**Recommendation:** Either remove `product_type` and use category-level defaults, or make it a proper FK to `inventory_categories`. Free-text categorisation always becomes inconsistent.

**`inventory_uom_conversions` allows a product_type of '' (empty string).** The `COALESCE(product_type, '')` in the UNIQUE constraint means an empty string and NULL are treated as distinct values. This is a subtle source of duplicate conversion rows.

**Recommendation:** Remove the `COALESCE` trick. Use separate tables for global conversions and product-specific overrides:

```sql
-- Global conversions (apply to all products)
CREATE TABLE inventory_uom_conversions_global (...)

-- Product-specific overrides
CREATE TABLE inventory_uom_conversions_product (
  product_id UUID NOT NULL REFERENCES inventory_products(id),
  from_uom_id UUID NOT NULL REFERENCES inventory_uoms(id),
  to_uom_id UUID NOT NULL REFERENCES inventory_uoms(id),
  factor NUMERIC(20,6) NOT NULL,
  UNIQUE(product_id, from_uom_id, to_uom_id)
);
```

**Materialized view refresh trigger on EVERY transaction INSERT is excessive.** The proposal recommends `REFRESH MATERIALIZED VIEW CONCURRENTLY` after every INSERT. Even with CONCURRENTLY, this adds significant overhead at scale (10M transactions = 10M refreshes).

**Recommendation:** Replace the per-statement trigger with a periodic refresh (every 60 seconds via pg_cron or application-level scheduler). This is documented as an alternative but the proposal's primary trigger-based approach is the default. Flip the default: use periodic refresh, document the trigger approach as an optimisation for high-frequency reads.

**No table partitioning strategy.** At 10M transactions, queries filtering by date range will scan unnecessary partitions. The proposal mentions "partition by month if needed" in the risks section but provides no design.

**Recommendation:** Add a partitioning strategy to the V3 spec:

```sql
CREATE TABLE inventory_transactions (
  ...same columns...
) PARTITION BY RANGE (created_at);

-- Monthly partitions:
CREATE TABLE inventory_transactions_2026_07
  PARTITION OF inventory_transactions
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE inventory_transactions_2026_08
  PARTITION OF inventory_transactions
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

Partitioning is low-effort at creation time but painful to add later.

**`running_balance` column is still in the schema despite V3.1 recommending its removal.** The V3 proposal defines `running_balance NUMERIC(15,4)` on `inventory_transactions`. The V3.1 addendum recommends skipping it. The documents contradict each other.

**Recommendation:** Remove `running_balance` from the V3 schema definitively. V3.1's recommendation is correct: the race condition is not worth the marginal performance gain. If the column is needed later, it can be added via a migration that backfills it from the ledger — this is a safe additive change.

---

## 3. Inventory Engine

**Score: 8/10**

### Strengths

**Transaction-ledger as single truth (10/10).** This is the definitive strength of the entire proposal. Every inventory system struggles with synchronisation between stock snapshots and transaction history. This one doesn't have that problem because there is no snapshot. All queries derive from the ledger.

**UOM conversion engine (8/10).** The base/display unit separation is correct. The display conversion function is simple and correct. Support for diverse unit types (bottle→tot, case→bottle, kg→g) covers future expansion without engine changes.

**Reconciliation calculation (9/10).** Expected stock is computed from the ledger at count start time, then compared with physical counts. This is correct. Storing expected stock would create a second source of truth.

**Costed variance (9/10).** Displaying variance in monetary terms ("−24 tots = −R72.00") is the difference between a report that gets read and one that gets ignored. Managers care about money. The proposal understands this.

**Stock count UX is restaurant-ready (9/10).** Card-based, swipeable, large touch targets, stepper controls, save-as-you-go, expected values shown. This is not an accountant's tool — it's a bartender's tool. The proposal's UX section is the strongest part of the document.

### Weaknesses

**Conversion engine design is described but not tested.** The proposal assumes all conversions are linear (bottle→tot = factor, case→bottle = factor). Real hospitality has edge cases:

- **Wine:** A bottle is 750ml, a standard pour is 150ml, so 5 glasses per bottle. But a "glass of wine" at a restaurant might be 125ml, 150ml, or 175ml depending on the pour policy. Does the conversion change per menu item?
- **Beer draught:** A keg might be 30L or 50L. A glass might be 300ml or 500ml. A pitcher might be 1L. The conversion chain is: keg → L → glass OR keg → L → pitcher. Branching conversions are not discussed.
- **Portion-controlled spirits:** Some venues use 35ml pours for premium spirits and 25ml for standard. The conversion factor depends on which menu item is sold, not just which product.

**Recommendation:** The `bar_item_inventory_links` table already has a `pour_size_ml` column that handles pour-size-per-menu-item. Document this explicitly as the solution to branching conversions. Add a note that the conversion engine first checks the menu-item-level pour size, then falls back to the product-level default.

**No `price` or `cost` on `inventory_products`.** The proposal has `cost_price` (cost per unit) but no `sell_price`. For valuation reports and margin calculations, sell price is needed. The pricing engine (which lives outside inventory) handles the menu sell price, but inventory should track the **latest purchase cost** and optionally a **default sell price** for valuation purposes.

**Recommendation:** Add `latest_unit_cost` (already present as `cost_price`) and rename it for clarity. Keep the sell price concern outside inventory — the pricing engine already handles this. Accept that inventory only tracks cost, not price.

**Opening balance transactions are manually inserted.** The proposal shows an `opening` transaction with quantity +20 for initial stock. This works, but bulk migration from an existing manual system will require a way to import opening balances from Excel (which the proposal mentions in the risks section but doesn't design).

**Recommendation:** In the Phase 1A task list, add "Bulk opening balance import" as a specific deliverable. The import parser already supports `physical_count` type. Use this: an Excel file with product names and current quantities is imported as `physical_count` transactions. No separate migration tool needed.

---

## 4. Import Engine

**Score: 7/10**

### Strengths

**Three-stage workflow (Upload → Parse/Validate → Preview → Approve/Apply) (9/10).** This is the correct pattern for any import system where accuracy matters. The manager sees exactly what will change before it changes. No surprises.

**Rollback mechanism (9/10).** Reversal transactions are the cleanest rollback strategy. They preserve audit history, are themselves audited, and can themselves be reversed. The 24-hour window is pragmatic.

**Import mapping memory (8/10).** The `inventory_import_mappings` table that remembers "Jameson" → Jameson 750ml for supplier Distell is a clever feature. It gets smarter with every import. The `auto_approve` flag for silent matching is well-judged.

**Matching algorithm priority (supplier code → mapping → exact name → fuzzy → unknown) (9/10).** This is the correct priority chain. Supplier SKU is the most reliable identifier. Fuzzy match is the last resort.

**Preview screen with per-row decisions (Create / Merge / Skip / Always Map) (8/10).** The UI mockups are clear and actionable. The "Create New Product" inline form is a well-designed shortcut.

### Weaknesses

**No template download endpoint.** The proposal assumes suppliers will format spreadsheets as Boma Café expects. Real-world suppliers send wildly different formats: PDF invoices, screenshots, CSV exports from their own systems, handwritten delivery notes. An import template that managers can send to suppliers (or use to transcribe from supplier formats) is essential.

**Recommendation:** Add `GET /api/inventory/imports/template?type=supplier_delivery` and `GET /api/inventory/imports/template?type=physical_count` endpoints that return pre-formatted Excel files with correct columns and validation rules. Add a [Download Template] button on the import page.

**Fuzzy matching threshold tuning is not discussed.** The proposal specifies thresholds (≥0.8 = strong, 0.6–0.8 = weak, <0.6 = unknown) but does not explain how these are determined, whether they are configurable, or how the system handles locale-specific matching (e.g., "Jameson" vs "Jameson Irish Whiskey" vs "Jameson 750ml" vs "Whisky Jameson" — all legitimate from different suppliers).

**Recommendation:** In V1, hardcode thresholds and use PostgreSQL's `pg_trgm` extension for trigram similarity. Document that threshold tuning and supplier-specific matching will be improved in V2 based on real-world data. The mapping memory (section 5.2, step 2) already handles the most common case of repeated fuzzy matches from the same supplier.

**No validation of cost prices during import.** The proposal validates quantities and product names but does not validate that cost prices are reasonable (e.g., R180/bottle for Jameson vs R1,800/bottle — a likely decimal error). A decimal-point error in unit cost can distort inventory valuation by an order of magnitude.

**Recommendation:** Add a simple validation rule: if `unit_cost` is more than 3× the existing `cost_price` or less than 0.3×, flag it as a warning and require manager confirmation in the preview step.

**No idempotency for imports.** If a manager taps [Apply Import] twice (network delay, double-click, browser back-button), does the import apply twice? The proposal wraps everything in a single transaction, which is good, but there's no idempotency key on the import batch.

**Recommendation:** Generate an idempotency key client-side before the upload and store it on the `import_batches` table with a UNIQUE constraint. If the same key is submitted twice, the second request returns the existing result instead of creating duplicate transactions. This is a common pattern and prevents a real failure mode.

---

## 5. Restaurant Workflow Walkthrough

### 5.1 Supplier Delivers

```
Flow: Supplier arrives → Manager checks delivery → Uploads Excel → Preview → Approve
Architecture support: ✅
```

The import workflow covers this end-to-end. The supplier code matching and import mapping memory will make this faster with each delivery.

**Gap:** The proposal assumes a spreadsheet is always provided. Realistically, suppliers sometimes deliver with no spreadsheet. The manager needs a quick-add form like "Product: Jameson, Qty: 10 cases, Confirm." This is not part of the Import flow — it's a manual purchase transaction.

**Recommendation:** The existing manual transaction entry (Phase 1A) covers this. Products can be selected from a dropdown with quantity and type "purchase." No new feature needed — just ensure the UI makes this fast (<10 seconds per product).

### 5.2 Bartender Opens

```
Flow: Bartender starts shift → Opens inventory system → Sees current stock
Architecture support: ✅
```

The dashboard shows current stock per location. The product list is searchable. No login barrier — staff already have accounts.

### 5.3 Customers Order

```
Flow: Customer orders Jameson → Bartender pours → System records (manual in V1)
Architecture support: ⚠️ (V1 manual, V3 POS)
```

**Gap:** V1 relies on manual transaction entry for every sale. Bartenders will not record every tot they pour during a busy Friday night. This is acknowledged in the proposal as a design trade-off, but the consequence is that V1 stock levels will drift from reality between stock counts. The reconciliation screen is the only safety net.

**Recommendation:** Accept this as a V1 limitation. Document it clearly for stakeholders so they understand that V1 is count-to-count tracking, not real-time stock. The POS integration (V3) solves this. Ship V1 knowing this limitation.

### 5.4 Bottle Breaks

```
Flow: Bottle drops → Bartender taps "Breakage" → Product: Jameson → Qty: 1 → Reason: "Accidental drop"
Architecture support: ✅
```

Manual transaction entry with type `breakage` covers this. The proposal's single-tap design for common actions is correctly targeted.

### 5.5 Happy Hour

```
Flow: 6–8 PM, all spirits are 25% cheaper → Higher volume → More spillage → Stock drops faster
Architecture support: ⚠️
```

**Gap:** Happy hour affects pour cost (same cost per tot, lower sell price per tot) but the proposal's prediction engine doesn't account for time-of-day or day-of-week consumption patterns. The V1 system will correctly record higher transaction volume during happy hour (if bartenders record them), but the forecasting features (V2+) don't mention happy hour as a factor.

**Recommendation:** Add a `rate_multiplier` concept to the forecasting engine: "Friday 6-8 PM consumes 2.3× average hourly rate." This is a V2+ enhancement but should be in the intelligence design.

### 5.6 Corporate Booking

```
Flow: Corporate event booked for 80 guests → System estimates consumption → Checks stock → Flags low items
Architecture support: ✅ (design only, Phase 3)
```

The booking integration design covers estimation, stock check, and purchase suggestions. The reconciliation after the event is well-designed.

**Gap:** The booking estimation engine uses fixed multipliers (3 beers per guest, 2 glasses of wine, etc.). These should be configurable per event type and learn from historical data. The proposal mentions learning but doesn't specify how.

**Recommendation:** Accept the V1 fixed-multiplier approach. Document that V2+ will use `AVG(actual_quantity) WHERE booking_type = 'corporate' AND guest_count BETWEEN 50 AND 100` for progressively better estimates. The `inventory_booking_estimates` table already supports this.

### 5.7 Closing Stock

```
Flow: End of day → Manager initiates stock count → Counts 84 products → Approves variance → Adjustments applied
Architecture support: ✅
```

The card-based stock count UI is excellent. The variance review step with reason dropdowns is thorough. The approval workflow (submit → review → approve) is correct.

**Gap:** No mandatory two-person rule for high-value variances. If the variance is >R1,000, the system should require a second manager to approve.

**Recommendation:** Add a configurable variance threshold. If costed variance exceeds the threshold (default: R1,000), require two approvals before the count can be finalised. This is standard practice for inventory control.

### 5.8 Weekly Audit

```
Flow: Manager reviews weekly variance report → Identifies patterns → Investigates
Architecture support: ✅
```

The reports (daily stock, variance, waste/breakage, fast/slow movers) cover this completely. The supplier performance tracking adds another dimension.

### 5.9 Monthly Reporting

```
Flow: Owner reviews monthly summary → Sees total consumption, stock value, loss → Makes purchasing decisions
Architecture support: ✅
```

The dashboard KPIs (inventory value, estimated loss, fast/slow movers) and reports cover this.

### Overall Workflow Assessment: 8/10

The architecture covers almost all real-world workflows. The two significant gaps are:
1. No happy-hour/time-based consumption patterns in forecasting (V2+)
2. No two-person approval for high-value variances (should be V1)

---

## 6. Booking Integration

**Score: 7/10** (design only, not implemented)

### Strengths

**Estimation engine (8/10).** The parameter-based estimation (guests × event type × duration) is a good starting point. The reconciliation after each event that feeds back into better estimates is the right learning loop.

**Stock reservation concept (7/10).** The proposal doesn't explicitly reserve stock but implies it via the estimation and purchase suggestion flow. Soft reservations (advisory, not hard-blocking) are appropriate for hospitality — you don't want to block the sale of a Jameson shot to a walk-in customer because a wedding next month might need it.

**Booking reconciliation report (9/10).** Estimated vs actual consumption per product, with costed variance. This is exactly what event managers need.

### Weaknesses

**No hard reservation mechanism.** The proposal checks stock but doesn't reserve it. For large events (wedding with 200 guests), a hard reservation is important: "Don't sell the last 5 cases of Castle Lite to walk-ins because the Smith wedding needs them on Saturday." Without reservation, the system can warn but cannot protect.

**Recommendation:** Add a `soft_reservation` boolean to `inventory_booking_estimates`. If true, the stock check treats the estimated quantity as consumed for availability purposes, even though the actual transactions haven't happened yet. This is a read-side concern — it doesn't affect the ledger — but it improves the accuracy of stock-out predictions.

**No integration with the existing booking system design.** The proposal mentions `booking_id UUID REFERENCES bookings(id)` but doesn't describe how the inventory engine discovers new bookings, when it generates estimates, or at what point it checks stock.

**Recommendation:** Add a booking lifecycle hook:
1. Booking created → trigger inventory estimation (async job)
2. Booking confirmed → trigger stock check (async job)
3. 7 days before event → trigger shortage alert (async job)
4. Booking completed → trigger reconciliation (async job)

These can be implemented as background jobs, reusing the existing `background_jobs` infrastructure.

---

## 7. Future Kitchen Expansion

**Score: 6/10**

### Strengths

**Generic engine foundation (9/10).** The core engine (`inventory_products`, `inventory_transactions`, `inventory_uoms`, `inventory_locations`, `inventory_suppliers`) is genuinely agnostic. It doesn't know about alcohol, bottles, or tots. This is the right foundation.

**UOM system supports kitchen units (8/10).** Kilograms, grams, litres, millilitres, pieces, units — all are supported by the UOM architecture. Conversion chains (1 kg = 1000 g, 1 bag of flour = 25 kg) work identically.

**Recipe/ingredient model is pre-designed (7/10).** The cocktail recipe engine (`bar_recipes` + `bar_recipe_ingredients`) is structurally identical to a kitchen recipe engine. Rename "cocktail" to "dish" and it works.

### Weaknesses

**Kitchen inventory is fundamentally different from bar inventory in ways the proposal doesn't address.**

1. **Perishability.** A bottle of Jameson doesn't expire. Fresh produce, dairy, and meat do. The proposal has `has_expiry` and `shelf_life_days` columns but no FIFO (First-In, First-Out) costing, no batch tracking, no spoilage forecasting. Without FIFO, kitchen inventory valuation will be inaccurate.

2. **Recipe yield variance.** A cocktail recipe is precise: 40ml rum, 15ml syrup, etc. A kitchen recipe is variable: "3 tomatoes" can mean 150g or 300g depending on the tomato. The quantity-per-serving is inherently fuzzy. The current recipe model assumes fixed quantities.

3. **Partial consumption.** A bottle of Jameson can be partially used (19 bottles + 10 tots). A bag of flour cannot be partially tracked once it's opened — it's either a full bag or an unknown remainder. The discrete vs continuous UOM distinction helps but doesn't fully address the "opened-but-unmeasured" problem.

4. **Waste tracking is different.** Bar waste is spillage or broken bottles. Kitchen waste is trim loss, overcooking, spoilage, plate waste, and batch-end leftovers. The transaction types (`breakage`, `spillage`, `waste`) need extension.

5. **Supplier units differ.** A bar buys spirits by the bottle. A kitchen buys flour by the 25kg bag, tomatoes by the 5kg crate, herbs by the bunch. The purchase order system needs to support mixed units within a single order.

**Recommendation:** Document these differences explicitly. Do NOT build kitchen-specific features in V1. The engine is generic enough to support kitchen expansion, but the kitchen module itself will need significant design work in areas the current proposal doesn't address. Add a "Kitchen Expansion — Design Gap Analysis" appendix that lists these five points as pre-requisite design work before the kitchen module can be built.

---

## 8. Performance

**Score: 6/10**

### Strengths

**Realistic performance targets (8/10).** The targets (dashboard <2s, stock lookup <100ms, import apply <2s, reconciliation <3s) are achievable with the proposed architecture. They're not aspirational — they're engineering targets.

**Index strategy is sound (8/10).** The covering index for balance lookups (`product_id`, `location_id`, `quantity`) and the transaction history index (`product_id`, `created_at DESC`) are correct. Cursor-based pagination is the right choice.

**Materialized view is optional (9/10).** Starting without a materialized view, measuring performance, and adding it only when needed is the correct approach. Premature optimisation is a common failure mode.

### Weaknesses

**The 10M transaction / 5-branch / 20-bar target is not stress-tested.**

At 10M transactions:
- The `inventory_product_balances` materialized view needs to aggregate 10M rows. Even with a covering index, `SUM(quantity)` over 10M rows for a single product is fast (index-only scan, <50ms). But `SUM(quantity)` for ALL products (dashboard load) is a full index scan of 10M rows — potentially 500ms–2s even with an index.
- The dashboard query (KPIs, alerts, fast/slow movers, recent activity) involves 5–10 separate queries. If each takes 500ms, the dashboard takes 5s. The 2-second target is not achievable at 10M transactions without caching.

**Recommendation:** Define the dashboard as a set of pre-computed aggregates, refreshed every 60 seconds:

```sql
CREATE TABLE inventory_dashboard_cache (
  location_id UUID,
  total_products INTEGER,
  total_value NUMERIC(10,2),
  total_alerts INTEGER,
  low_stock_count INTEGER,
  out_of_stock_count INTEGER,
  drinks_sold_today INTEGER,
  estimated_loss NUMERIC(10,2),
  fast_movers JSONB,
  slow_movers JSONB,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (location_id)
);
```

Refresh this via pg_cron every 60 seconds. The dashboard reads from the cache. Real-time counts are available from the API endpoints but are not the default dashboard query.

**No write-throughput testing.** At 5 branches with 20 bars and POS integration, transaction volume could spike to 100+ INSERTs/second during peak hours (Friday 8 PM). The single `inventory_transactions` table with a trigger-based materialized view refresh will struggle.

**Recommendation:** Remove the trigger-based materialized view refresh (already discussed in section 2). Partition the transactions table by month. Use a write-ahead queue (Redis or PgBouncer transaction queue) if write throughput becomes a bottleneck. Neither of these is needed in V1, but the architecture should document that they are available.

**No read-replica strategy.** At 5 branches, each branch manager reads the dashboard simultaneously. With 5 branches × 3 locations × 2 managers = 30 concurrent dashboard users, plus bartenders viewing product balances, read concurrency could reach 100+ queries/second. The single Supabase instance handles this poorly under heavy load.

**Recommendation:** For V1 (single branch, <5 concurrent users), this is irrelevant. Document that read replicas and/or the dashboard cache table are the escape hatch for multi-branch scaling.

---

## 9. Security

**Score: 7/10**

### Strengths

**Append-only ledger is tamper-evident (9/10).** Because the ledger is INSERT-only, there is no way to silently change historical stock levels. Any correction MUST be a new transaction, which is audited. This is inherently more secure than an UPDATE-based model.

**Soft delete prevents data loss (8/10).** Products with history cannot be deleted. This prevents accidental destruction of audit trails.

**RLS policies inherited from existing pattern (8/10).** Reusing the existing service-role-based access pattern is pragmatic. Adding granular permissions later is possible.

**Variance reason tracking (8/10).** Requiring a reason for each variance creates accountability. The dropdown of common reasons makes it fast while maintaining audit quality.

### Weaknesses

**No role-based access control design.** The proposal mentions permissions (Manager, Assistant Manager, Bartender, Owner) in the V3.1 proposal but does not design the enforcement mechanism. RLS policies for inventory tables are not specified (unlike the existing `bar_items` and `bar_categories` policies).

**Recommendation:** Design the RLS policies in the spec:

```sql
-- Inventory products: all staff can read, only managers can write
CREATE POLICY "Staff can read inventory products"
  ON inventory_products FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('manager', 'assistant_manager', 'bartender', 'admin'))
  );

CREATE POLICY "Managers can write inventory products"
  ON inventory_products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- Transactions: all staff can read, bartenders can only insert certain types
CREATE POLICY "Bartenders can record wastage"
  ON inventory_transactions FOR INSERT WITH CHECK (
    transaction_type IN ('spillage', 'breakage', 'comp', 'staff')
    AND performed_by = auth.uid()
  );

CREATE POLICY "Only managers can adjust"
  ON inventory_transactions FOR INSERT WITH CHECK (
    transaction_type = 'adjustment'
    AND EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  );
```

These are examples, not final design. But the proposal should include this level of detail.

**No audit trail for access (who viewed what).** The `inventory_audit_log` table only captures creates, updates, archives, restores, and hard deletes. It does not capture reads. For sensitive inventory (high-value spirits, restricted items), knowing who viewed the stock level and when is important for theft investigations.

**Recommendation:** Add an `inventory_access_log` table for highly restricted products (optional, per-product config). Only log views for products flagged as `restricted`. This is a V2 enhancement but should be documented.

**No two-person approval for high-risk operations.** The proposal has single-person approval for imports and stock counts. A malicious manager could import a fake delivery (+10 bottles Jameson), then adjust stock (−10 bottles), then export the stock as "loss." Without two-person approval on imports and adjustments, this is undetectable (the transactions are valid — they just shouldn't have happened).

**Recommendation:** Add two-person approval for:
- Imports > R10,000 value
- Adjustments > R1,000 value
- Rollbacks

The second approver must be a different person from the first. This is standard financial controls practice.

---

## 10. UX

**Score: 9/10**

### Strengths

**Stock count card UI is best-in-class (10/10).** The card-based, swipeable, stepper-controlled design is genuinely restaurant-appropriate. Large touch targets, progress bar, save-as-you-go, variance reasons as dropdowns, costed variance shown — every decision here is correct. This is the strongest part of the entire proposal.

**Dashboard layout is clear (9/10).** KPIs at the top, alerts in the middle, quick actions, reconciliation summary, fast/slow movers. The hierarchy matches what a manager cares about most. The location dropdown at the top is correct.

**Import preview is well-designed (9/10).** Per-row status, unknown product handling (Create/Merge/Skip/Always Map), inline form for new products. The design anticipates the most common import friction point and solves it.

**Product detail page (8/10).** Configuration and stock summary side by side. Transaction history below. The balance display in bottles+tots is correct for the bar module.

### Weaknesses

**Transaction entry for bartenders is underspecified.** The proposal mentions "Record sale, breakage, spillage, comp, staff" but provides no mockup. This is the most frequent interaction for non-manager staff — it needs to be a single-tap action from anywhere in the UI, not a multi-step form buried in a sub-page.

**Recommendation:** Design a bottom-sheet or floating action button that is always visible:

```
┌─────────────────────────────────────┐
│  [Product Search]                   │
│  ┌────────────────────────────────┐ │
│  │ Jameson                        │ │
│  │ 19B + 10T  ·  Pour: 25ml       │ │
│  │ [Sale] [Comp] [Staff] [Spill]  │ │
│  └────────────────────────────────┘ │
│     Qty: [−]  1  [+]               │
│     [RECORD]                        │
└─────────────────────────────────────┘
```

This should be accessible from the dashboard, product list, and anywhere in the inventory module. It's the most frequent action for the largest user group (bartenders).

**No batch adjustment UI.** If a bartender spills 5 different drinks during a busy service, they need to record 5 separate transactions. The card-based stock count is for end-of-day counts. The mid-service workflow needs a quicker "bulk wastage" entry.

**Recommendation:** Add a multi-select mode to the product list. Select products → tap "Record Wastage" → enter quantity → one button creates all transactions. This is a V1.1 enhancement but should be in the spec.

**The sidebar has too many items for a single inventory group.** Seven items (Dashboard, Products, Transactions, Stock Counts, Imports, Suppliers, Locations, Reports) is a lot for a single nav group. Managers will primarily use Dashboard, Stock Counts, and Imports. The rest are configuration.

**Recommendation:** Split into two groups:

```
Inventory:
  📊 Dashboard
  📸 Stock Count        ← frequent
  📤 Import Excel       ← frequent

Inventory Settings:
  🏷️ Products
  🏢 Suppliers
  📍 Locations
  📈 Reports
  📋 Transactions       ← infrequent, mostly for audit
```

This reduces cognitive load. The "Inventory Settings" group is collapsed by default.

---

## 11. Commercial Readiness

**Score: 5/10**

### Could this become Boma ERP, sold commercially?

**Yes, but not without significant changes.**

### What works for commercialisation

**Transaction-ledger model is enterprise-grade (9/10).** This is the right foundation for a multi-tenant SaaS product. Append-only ledgers are auditable, scalable, and tamper-evident. Financial systems use this pattern.

**Generic engine is multi-tenant compatible (8/10).** The engine has no hardcoded assumptions about alcohol. Adding a `tenant_id` column to all tables is a straightforward migration.

**UOM system is flexible enough for diverse industries (7/10).** Manufacturing, retail, hospitality, and healthcare all need unit tracking. The base/display UOM separation supports this.

**Import engine with mapping memory is a competitive advantage (7/10).** Most inventory systems expect perfect data. The fuzzy matching + learning approach reduces onboarding friction significantly.

### What needs work for commercialisation

**Multi-tenancy is not designed.** There is no `tenant_id`, no tenant isolation strategy, no per-tenant configuration. The RLS policies would need to be rewritten for multi-tenant access. The existing Supabase instance is single-tenant.

**No billing model support.** Commercial SaaS needs metered billing (per-location, per-transaction, per-user). The architecture has no usage tracking.

**No onboarding workflow.** A commercial product needs: trial creation → data import → training → go-live. The proposal has data import but no concept of a structured onboarding flow.

**No API versioning.** The API endpoints are versionless (`/api/inventory/products`). Commercial APIs need versioning (`/api/v1/inventory/products`) for backward compatibility.

**No webhook support.** Commercial platforms need webhooks for external integrations (POS systems, accounting software, supplier portals). The architecture doesn't mention webhooks.

**No marketplace / extension system.** A commercial ERP would need plugins (kitchen module, coffee module, accounting connector, etc.). The module system (`inventory/modules/*`) is a start but doesn't define a plugin API.

**No SLA monitoring.** Commercial customers expect uptime guarantees, response time SLAs, and incident reporting. None of this is addressed.

**No multi-language / multi-currency support.** The proposal assumes English and ZAR. Commercial hospitality software needs: French, Spanish, Portuguese (for Brazil), Arabic; USD, EUR, GBP, BRL.

**Recommendation:** Do NOT build for commercialisation in V1. The proposal explicitly scopes V1 as a single-venue tool for The Boma Café. The commercialisation gap analysis should be a separate document, written only when the decision to commercialise is made.

**Score the proposal as a commercial platform: 5/10 (it wasn't designed for this).**
**Score the proposal as a single-venue inventory tool: 9/10 (it was designed for this, and it succeeds).**

---

## 12. Missing Features

### High Value

1. **Two-person approval for high-value operations.** Imports >R10K, adjustments >R1K, rollbacks should require a second manager to approve. This is standard financial controls. The cost of implementation is low. The value in fraud prevention is high.

2. **Quick-add transaction from anywhere (global action button).** Bartenders need to record spillage/comp in under 5 seconds. A floating action button or bottom sheet accessible from any page solves this. The current design requires navigating to the transactions page.

3. **Import template download.** Suppliers will not format spreadsheets to match Boma's expectations. A downloadable template that managers can send to suppliers (or use to transcribe from supplier PDFs) removes the biggest barrier to import adoption.

4. **Idempotency key on imports.** Double-tap Apply Import creates duplicate stock. An idempotency key (generated client-side before upload) prevents this. Simple, critical, cheap.

5. **Dashboard cache for performance.** The spec acknowledges performance concerns but doesn't design the cache. A pre-computed dashboard aggregate table refreshed every 60 seconds solves the multi-branch performance problem.

### Medium Value

6. **Restricted product audit log.** For high-value items (premium spirits, large wine stock), log who viewed the stock level and when. Theft investigations often start with "Who knew we had 20 cases of Dom Pérignon?"

7. **Bulk opening balance import from Excel.** Migration from an existing manual system will involve hundreds of products. The proposal mentions this in the risks section but doesn't design it. Reuse the existing `physical_count` import type — it already works for this.

8. **Time-of-day consumption patterns in forecasting.** Happy hour, Friday night, Sunday lunch — these patterns are predictable. The forecasting engine should account for them even in V2.

### Low Value (Do Not Add Yet)

9. **Barcode scanning.** The proposal mentions this for future phases but doesn't include it in V1. Correct decision. Barcode scanning requires hardware, which adds cost and complexity. Not needed for V1.

10. **Offline mode.** Service Worker + IndexedDB for stock counts. The proposal mentions this as future. Correct decision. Add only when staff complain about connectivity issues.

---

## 13. Remove Features

### Over-engineered Items (Remove from V1)

1. **`forecasting.ts` in the V1 file tree.** The file exists (or is planned) but the features it contains (predictive purchasing, theft detection, pattern analysis) are V3. An empty or stub file creates confusion about what's implemented.

**Recommendation:** Remove `forecasting.ts` from the V1 file structure. Add it when V3 intelligence work begins.

2. **Purchase order pages and components in the V1 file tree.** The proposal lists `purchase-orders/page.tsx` and related files as "Future" but includes them in the directory structure. Developers will wonder whether to build them.

**Recommendation:** Remove `purchase-orders/` from the V1 file tree. Add it when Phase 2 begins.

3. **Cocktail recipe tables (`bar_cocktail_recipes`, `bar_cocktail_ingredients`).** These are well-designed but are explicitly V3 features. Creating the tables in V1 means they exist with zero data, zero tests, and zero queries for 6–12 months. This is dead weight.

**Recommendation:** Remove these tables from the V1 migration. Add them in the V3 migration when cocktail deduction is implemented. The design is documented — it doesn't need to be in the database to be valid.

4. **`inventory_uom_conversions` table with product-type override pattern.** The current design (single table with nullable `product_type` and `COALESCE(product_type, '')`) is fragile. Replace with the cleaner two-table design (global + product-specific overrides) or simplify to product-level conversions only for V1.

**Recommendation:** For V1, simplify UOM conversions to product-level only (each product defines its own conversion chain via `inventory_product_uoms`). Remove the general `inventory_uom_conversions` table until cross-product conversion rules are needed.

### Keep as-Is (Correctly Scoped)

- **Booking integration.** Correctly deferred to Phase 3.
- **Purchase orders.** Correctly deferred to Phase 2.
- **Theft detection.** Correctly deferred to Phase 3.
- **AI reorder assistant.** Correctly deferred to Phase 3.
- **Multi-branch support.** Correctly deferred to post-V1.

---

## 14. Final Verdict

### Scores

| Category | Score | Rationale |
|---|---|---|
| **Architecture** | 8/10 | Strong modularity and separation of concerns. Minor YAGNI issues with empty directories. Missing barrel export file. |
| **Database** | 7/10 | Transaction-ledger model is excellent. Contradiction on `running_balance` between V3 and V3.1. Fragile UUID sentinel in unique index. No partitioning strategy. Trigger-based MV refresh is excessive. |
| **Scalability** | 6/10 | Targets are realistic but not stress-tested. No dashboard cache design at 10M transactions. No read-replica strategy. No write-throughput analysis. Acceptable for V1 scale. |
| **Maintainability** | 8/10 | Clean module boundaries. Well-documented design decisions. Missing barrel export and some contradictory spec sections will cause developer confusion. |
| **Security** | 7/10 | Append-only ledger is inherently secure. Missing RLS policy design. No two-person approval for high-value operations. No restricted-product access log. |
| **Restaurant Operations** | 9/10 | Stock count UX is best-in-class. Import workflow is thorough. Dashboard is well-prioritised. Booking integration is well-designed. Gap: no global quick-add transaction button for bartenders. |
| **Commercial Readiness** | 5/10 | Engine is a good foundation. Multi-tenancy, billing, API versioning, webhooks, onboarding workflow, and multi-language support are all absent. Proposal was not designed for commercialisation — this is the correct score for an honest assessment. |
| **Overall** | 50/70 | Strong proposal with clear strengths and manageable weaknesses. No fundamental architectural flaws. |

### Overall Score: 71/100

### Decision

**⚠️ APPROVED WITH MINOR CHANGES**

The proposal is sound. The transaction-ledger model, generic engine design, M:N menu-inventory separation, and card-based stock count UX are all correct decisions. No fundamental redesign is needed.

The weaknesses are in execution details, not architecture:
- Spec contradictions (running_balance)
- Fragile SQL patterns (UUID sentinel, COALESCE on unique index)
- Missing production-hardening (two-person approval, idempotency, dashboard cache, RLS policies)
- V1 scope creep (future modules in file tree, deferred features in migrations)
- YAGNI violations (empty directories, unused tables)

These are fixable. They do not require a V4.

---

## 15. Action List (20 Items, Ranked by Priority)

### Critical (Must Fix Before V1 Implementation)

| # | Priority | Item | Category | Effort |
|---|---|---|---|---|
| 1 | **Critical** | Remove `running_balance` column from `inventory_transactions` schema. V3 has it, V3.1 says skip it. V3.1 is correct. Remove it. Decide. | Database | 1h |
| 2 | **Critical** | Define RLS policies for all inventory tables. The existing system uses RLS. Inventory tables need the same. Provide example policies for each table and each role. | Security | 4h |
| 3 | **Critical** | Add idempotency key to `import_batches` table. Double-tap Apply Import is a real failure mode. UNIQUE constraint on client-generated idempotency key. | Import | 2h |
| 4 | **Critical** | Add two-person approval for imports >R10K value and adjustments >R1K value. Standard financial control. Implementation: `requires_approval BOOLEAN`, `approved_by UUID REFERENCES staff(id)`. | Security | 1d |
| 5 | **Critical** | Resolve the `inventory_uom_conversions` design. Current design with `product_type TEXT` and `COALESCE(product_type, '')` is fragile. Either simplify to product-level conversions only (V1), or use the two-table approach (global + product-specific). | Database | 4h |

### High (Fix Before Phase 1A Completes)

| # | Priority | Item | Category | Effort |
|---|---|---|---|---|
| 6 | **High** | Remove empty/planned directories from V1 file tree: `kitchen/`, `coffee/`, `consumables/`, `purchase-orders/`, `forecasting.ts`. Re-add when each feature is actually planned. | Architecture | 1h |
| 7 | **High** | Remove `bar_cocktail_recipes` and `bar_cocktail_ingredients` tables from V1 migration. Defer to V3. The design is documented. No need for empty tables. | Database | 2h |
| 8 | **High** | Replace magic UUID in unique index with `WHERE location_id IS NOT NULL` partial index. Cleaner, safer, standard PostgreSQL. | Database | 1h |
| 9 | **High** | Add `inventory/index.ts` barrel file that exports the engine's public API. Developers should not need to know internal file structure to import `createTransaction()` or `getBalance()`. | Architecture | 2h |
| 10 | **High** | Design and add a global quick-add transaction button (bottom sheet / floating action button) accessible from any inventory page. This is the most frequent action for the largest user group (bartenders). Ship it in Phase 1A, not V2. | UX | 2d |
| 11 | **High** | Add `GET /api/inventory/imports/template` endpoint for downloading formatted Excel templates. Without this, managers manually format spreadsheets and format mismatches become the top support issue. | Import | 1d |
| 12 | **High** | Define the dashboard cache table design. Pre-computed aggregates refreshed every 60 seconds. Required to meet the 2-second dashboard target at 10M transactions. | Performance | 4h |

### Medium (Fix Before Phase 1B)

| # | Priority | Item | Category | Effort |
|---|---|---|---|---|
| 13 | **Medium** | Add bulk opening balance import to Phase 1A task list. Reuse `physical_count` import type. Existing migration from manual systems will need this. | Import | — (already designed, just needs scheduling) |
| 14 | **Medium** | Add cost-price sanity validation to import preview (flag if unit cost >3× or <0.3× existing cost). Decimal-point errors in pricing are common and expensive. | Import | 1d |
| 15 | **Medium** | Add table partitioning strategy to the spec. Monthly partitions by `created_at`. Easy to add at creation time, hard to add later. | Database | 2h |
| 16 | **Medium** | Replace trigger-based materialized view refresh with periodic refresh (every 60s via pg_cron). The trigger approach does not scale to 10M transactions. Document both approaches but default to periodic. | Performance | 2h |
| 17 | **Medium** | Split Sidebar inventory section into "Inventory" (Dashboard, Stock Count, Import) and "Inventory Settings" (Products, Suppliers, Locations, Reports, Transactions). Reduces cognitive load for daily users. | UX | 1h |

### Low (Fix Before Phase 2)

| # | Priority | Item | Category | Effort |
|---|---|---|---|---|
| 18 | **Low** | Document the booking integration lifecycle (create→estimate, confirm→check, 7-day→alert, complete→reconcile) as background jobs. The hooks are referenced but not designed. | Booking | 4h |
| 19 | **Low** | Add kitchen expansion gap analysis appendix. The engine supports kitchen generically but 5 specific differences need design work before implementation. | Future | 4h |
| 20 | **Low** | Add restricted product access log to the spec. Optional per-product flag. V2 enhancement. Theft investigations need this. | Security | 2h |

---

*Architecture Review Board — The Boma Café Inventory Engine*
*Assessment Complete — 2026-07-29*
*Next Step: Implement action items #1–5 before beginning Phase 1A development.*
