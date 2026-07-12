-- Fix: Add 'served' and 'rejected' to orders.status CHECK constraint
-- These statuses are used by the order state machine but were never added to the DB constraint

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'packing', 'ready', 'served', 'completed', 'cancelled', 'rejected'));

-- Add missing indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
