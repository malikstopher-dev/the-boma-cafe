-- 073_stock_count_item_transaction_link.sql
-- F7 (P0/P1 remediation): make stock-count approval retry- and race-safe.
--
-- 1. inventory_stock_count_items.transaction_id links each variance
--    adjustment to its ledger transaction. approveStockCount skips items
--    that already carry a transaction_id, so a failed or interrupted
--    approval can be retried without double-posting (the same retry-safe
--    pattern completeProductionRun already uses for production runs).
-- 2. A new 'approving' claim state on inventory_stock_counts. The approve
--    action transitions submitted -> approving (optimistic lock), creates
--    the adjustments, then approving -> approved. A concurrent approve
--    affects zero rows and is rejected before it can post duplicate
--    adjustments; a crash mid-approval leaves the session in 'approving',
--    which the approve action may safely re-enter.

ALTER TABLE inventory_stock_count_items
  ADD COLUMN transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL;

CREATE INDEX idx_stock_count_items_txn
  ON inventory_stock_count_items(transaction_id);

ALTER TABLE inventory_stock_counts
  DROP CONSTRAINT inventory_stock_counts_status_check;

ALTER TABLE inventory_stock_counts
  ADD CONSTRAINT inventory_stock_counts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'approving', 'approved', 'cancelled'));
