-- Payment Confirmation Workflow
-- Adds payment tracking fields to orders table

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT NULL;

-- Constraint: only allow valid payment_status values
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'refunded'));

-- Index for filtering unpaid orders quickly
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);

-- Ensure realtime publication includes new columns
-- (realtime is already enabled on orders table)
-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
