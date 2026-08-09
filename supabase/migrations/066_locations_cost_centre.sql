-- ============================================================
-- Migration 066: Locations carry a cost centre
--
-- Root cause of the production receiving failure:
--   every inventory_transactions row must have cost_centre_id
--   (migration 050, NOT NULL, no column default). The receiving
--   engine created 'purchase' transactions without one, so
--   PostgreSQL rejected them:
--     null value in column "cost_centre_id" ... violates
--     not-null constraint
--
-- Fix (applied in code, this migration completes it):
--   each location owns a cost centre, so every movement can
--   resolve one automatically from its location_id.
--
-- Backfill rules mirror src/inventory/lib/cost-centre.ts:
--   name ILIKE '%bar%'                              -> Bar
--   name ILIKE '%kitchen%'                          -> Kitchen
--   name ILIKE '%event%' OR '%lounge%'              -> Events
--   name ILIKE '%vip%'                              -> VIP Room
--   name ILIKE '%store%' OR '%room%' OR '%storage%' -> Restaurant
--   name ILIKE '%takeaway%' OR '%delivery%'         -> Takeaway
--   anything else (fallback)                        -> Restaurant
-- ============================================================

ALTER TABLE inventory_locations
  ADD COLUMN cost_centre_id UUID
  REFERENCES cost_centres(id);

UPDATE inventory_locations AS loc
  SET cost_centre_id = cc.id
  FROM cost_centres AS cc
  WHERE loc.cost_centre_id IS NULL
    AND (
      (loc.name ILIKE '%bar%' AND cc.name = 'Bar')
      OR (loc.name ILIKE '%kitchen%' AND cc.name = 'Kitchen')
      OR ((loc.name ILIKE '%event%' OR loc.name ILIKE '%lounge%') AND cc.name = 'Events')
      OR (loc.name ILIKE '%vip%' AND cc.name = 'VIP Room')
      OR ((loc.name ILIKE '%store%' OR loc.name ILIKE '%room%' OR loc.name ILIKE '%storage%') AND cc.name = 'Restaurant')
      OR ((loc.name ILIKE '%takeaway%' OR loc.name ILIKE '%delivery%') AND cc.name = 'Takeaway')
    );

-- Fallback: any location not matched by the rules above gets the
-- general 'Restaurant' cost centre so NOT NULL can be enforced.
UPDATE inventory_locations AS loc
  SET cost_centre_id = cc.id
  FROM cost_centres AS cc
  WHERE loc.cost_centre_id IS NULL
    AND cc.name = 'Restaurant';

ALTER TABLE inventory_locations
  ALTER COLUMN cost_centre_id SET NOT NULL;

-- Location stock listings now show the centre
CREATE INDEX idx_locations_cost_centre
  ON inventory_locations(cost_centre_id);