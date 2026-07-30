-- ============================================================
-- Migration 047: Add has_inventory to bar_items
-- Additive, backward-compatible change. No existing data affected.
-- ============================================================

ALTER TABLE bar_items
  ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN NOT NULL DEFAULT false;
