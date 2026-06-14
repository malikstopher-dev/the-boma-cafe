-- ============================================================
-- Migration 006: Add table_number and delivery_address columns
-- ============================================================
-- Supports dine-in (table_number required) and delivery
-- (delivery_address required) order types.
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- ============================================================
-- VERIFICATION
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- ORDER BY ordinal_position;
-- ============================================================
