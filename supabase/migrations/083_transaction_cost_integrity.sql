-- ============================================================
-- Migration 083: Transaction Cost Integrity + Reason Types
-- P0 ledger fixes from the Owner Dashboard KPI audit:
--
--  1. Backfill unit_cost on every historical row that has NULL
--     cost, from the product's latest known cost. Idempotent:
--     only rows with unit_cost IS NULL are touched.
--  2. Backfill reason_type = 'ADJUSTMENT' on adjustment rows
--     that never received a reason (the /inv/adjustments form
--     previously wrote free text to reason_notes only).
--  3. Extend the reason_type CHECK with 'DAMAGED' and
--     'FOUND_STOCK' (owner-approved adjustment reason types).
--
-- Future transactions get unit_cost attached automatically by
-- the ledger engine (src/inventory/engine/ledger.ts) at write
-- time; this migration only heals history.
-- ============================================================

-- 1. Cost backfill: latest non-NULL unit_cost per product
WITH latest_cost AS (
  SELECT DISTINCT ON (product_id) product_id, unit_cost
  FROM inventory_transactions
  WHERE unit_cost IS NOT NULL
  ORDER BY product_id, created_at DESC, id DESC
)
UPDATE inventory_transactions t
SET unit_cost = lc.unit_cost
FROM latest_cost lc
WHERE t.product_id = lc.product_id
  AND t.unit_cost IS NULL;

-- 2. Reason backfill for adjustment rows only (never guesses
--    semantics for other transaction types)
UPDATE inventory_transactions
SET reason_type = 'ADJUSTMENT'
WHERE transaction_type = 'adjustment'
  AND reason_type IS NULL;

-- 3. Extend the reason_type allow-list (additive; existing
--    values and history are preserved)
ALTER TABLE inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_reason_type_check;

ALTER TABLE inventory_transactions
  ADD CONSTRAINT inventory_transactions_reason_type_check
  CHECK (reason_type IN (
    'BREAKAGE','WASTE','STAFF_MEAL','PROMOTION','EXPIRED','THEFT',
    'DONATION','COMP','TRANSFER','ADJUSTMENT','SALE','BOOKING',
    'RETURN','OPENING','CLOSING','PRODUCTION','SPILLAGE','DELIVERY',
    'GAS_USAGE',
    'DAMAGED','FOUND_STOCK'
  ));