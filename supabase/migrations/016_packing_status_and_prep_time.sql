-- Adds 'packing' status to orders and preparation_time_minutes column

-- Add preparation_time_minutes column
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER NULL;

-- Update status CHECK constraint to include 'packing'
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'packing', 'ready', 'completed', 'cancelled'));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
