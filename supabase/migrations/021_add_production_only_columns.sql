-- ============================================================
-- Migration 021: Catch-up — production-only columns
-- ============================================================
-- These columns exist in the production database (added manually
-- via Supabase dashboard or by code) but were never defined in
-- any migration file. This migration documents them idempotently
-- so the migration history is complete.
-- ============================================================

-- 1. Add created_by to orders (stores admin/kitchen/waiter role of order creator)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 2. Add cancellation_reason to orders (stores reason when order is cancelled)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 3. Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_cancellation_reason ON orders (cancellation_reason);

-- 4. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
