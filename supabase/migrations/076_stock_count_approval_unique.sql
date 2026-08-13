-- 076_stock_count_approval_unique.sql
-- H1 (P0/P1 remediation): close the stock-count approval double-post
-- windows at the database level.
--
-- Problem: approveStockCount creates each item's adjustment with
-- createTransaction() and then stamps inventory_stock_count_items.
-- transaction_id in a separate round-trip. Two races can double-post:
--   1. a concurrent approve re-enters the loop while the winner is still
--      mid-approval (items not yet stamped are not visible as done), and
--   2. a crash between createTransaction and the stamp leaves an
--      unstamped adjustment that a retry re-creates.
--
-- One stock-count item maps to exactly one physical_count adjustment
-- (saveCountItem upserts on stock_count_id + product_id), so the
-- invariant "at most one physical_count transaction per (reference_id,
-- product_id)" is enforced here. The engine (stock-counts.ts) catches the
-- resulting 23505 duplicate-key error and reuses the posted adjustment
-- instead of re-posting it.

CREATE UNIQUE INDEX idx_inventory_transactions_stock_count_item
  ON public.inventory_transactions (reference_id, product_id)
  WHERE transaction_type = 'physical_count';