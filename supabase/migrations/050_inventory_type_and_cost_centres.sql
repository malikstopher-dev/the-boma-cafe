-- ============================================================
-- Migration 050: Inventory Type + Cost Centres
-- Adds inventory_type to products and cost_centre tracking to
-- every movement.
-- ============================================================

-- Add inventory_type to products (FOOD, BEVERAGE, CLEANING, PACKAGING, GENERAL)
ALTER TABLE inventory_products
  ADD COLUMN inventory_type TEXT NOT NULL DEFAULT 'GENERAL'
  CHECK (inventory_type IN ('FOOD','BEVERAGE','CLEANING','PACKAGING','GENERAL'));

CREATE INDEX idx_products_inventory_type
  ON inventory_products(inventory_type, is_active);

-- Cost centres table
CREATE TABLE cost_centres (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default cost centres
INSERT INTO cost_centres (name) VALUES
  ('Restaurant'),
  ('Bar'),
  ('Kitchen'),
  ('Events'),
  ('Private Functions'),
  ('Takeaway'),
  ('Delivery'),
  ('VIP Room');

-- Add cost_centre_id to transactions
-- Required: every movement belongs to a cost centre
-- (PostgreSQL forbids subqueries in DEFAULT, so: add nullable FK,
--  backfill existing rows to the first seeded cost centre, then NOT NULL)
ALTER TABLE inventory_transactions
  ADD COLUMN cost_centre_id UUID
  REFERENCES cost_centres(id);

UPDATE inventory_transactions
  SET cost_centre_id = (SELECT id FROM cost_centres ORDER BY created_at LIMIT 1)
  WHERE cost_centre_id IS NULL;

ALTER TABLE inventory_transactions
  ALTER COLUMN cost_centre_id SET NOT NULL;
