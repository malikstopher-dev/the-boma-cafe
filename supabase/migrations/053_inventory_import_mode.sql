-- ============================================================
-- Migration 053: Import Mode
-- Adds mode column to support 3 import workflows:
-- initial (create products), delivery (increase stock),
-- full_replacement (replace all balances).
-- ============================================================

ALTER TABLE inventory_imports
  ADD COLUMN import_mode TEXT NOT NULL DEFAULT 'delivery'
  CHECK (import_mode IN ('initial', 'delivery', 'full_replacement'));
