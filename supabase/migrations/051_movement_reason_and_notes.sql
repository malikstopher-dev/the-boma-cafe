-- ============================================================
-- Migration 051: Movement Reason & Manager Notes
-- Adds structured reason_type + optional notes to every
-- inventory movement for business-context analytics.
-- ============================================================

ALTER TABLE inventory_transactions
  ADD COLUMN reason_type TEXT
  CHECK (reason_type IN (
    'BREAKAGE','WASTE','STAFF_MEAL','PROMOTION','EXPIRED','THEFT',
    'DONATION','COMP','TRANSFER','ADJUSTMENT','SALE','BOOKING',
    'RETURN','OPENING','CLOSING','PRODUCTION','SPILLAGE','DELIVERY'
  ));

ALTER TABLE inventory_transactions
  ADD COLUMN reason_notes TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN manager_note TEXT;

ALTER TABLE inventory_transactions
  ADD COLUMN note_author TEXT;
