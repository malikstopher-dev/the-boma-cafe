-- ============================================================
-- Migration 007: Production guards — constraints + idempotency
-- ============================================================

-- 1. Add idempotency_key for duplicate prevention
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Drop old CHECK constraints and recreate with proper values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('pickup', 'delivery', 'dine-in'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_total_check;
ALTER TABLE orders ADD CONSTRAINT orders_total_check
  CHECK (total >= 0);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'));

-- 3. Verify all constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders'
ORDER BY constraint_name;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';
