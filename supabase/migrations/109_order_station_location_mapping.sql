-- Migration 109: explicit order-station -> inventory-location authority.
-- A completed order must carry the resolved location into its durable job;
-- worker retries never choose a different location later.

ALTER TABLE public.inventory_locations
  ADD COLUMN IF NOT EXISTS order_station TEXT;

ALTER TABLE public.inventory_locations
  DROP CONSTRAINT IF EXISTS inventory_locations_order_station_check;
ALTER TABLE public.inventory_locations
  ADD CONSTRAINT inventory_locations_order_station_check
  CHECK (order_station IS NULL OR order_station IN ('kitchen', 'bar'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_locations_order_station
  ON public.inventory_locations(order_station)
  WHERE order_station IS NOT NULL;

-- Seed the existing canonical locations when present. If either location is
-- absent, no guess is made: completion fails visibly until an administrator
-- configures the mapping on the location record.
WITH kitchen_location AS (
  SELECT id
  FROM public.inventory_locations
  WHERE is_active = TRUE
    AND deleted_at IS NULL
    AND (UPPER(code) = 'KITCHEN' OR LOWER(name) = 'kitchen')
  ORDER BY CASE WHEN UPPER(code) = 'KITCHEN' THEN 0 ELSE 1 END, created_at, id
  LIMIT 1
)
UPDATE public.inventory_locations location
SET order_station = 'kitchen'
FROM kitchen_location
WHERE location.id = kitchen_location.id
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_locations WHERE order_station = 'kitchen'
  );

WITH bar_location AS (
  SELECT id
  FROM public.inventory_locations
  WHERE is_active = TRUE
    AND deleted_at IS NULL
    AND (
      LOWER(name) = 'main bar'
      OR UPPER(code) IN ('MAIN_BAR', 'MAINBAR', 'BAR', 'MAIN')
    )
  ORDER BY
    CASE
      WHEN LOWER(name) = 'main bar' THEN 0
      WHEN UPPER(code) IN ('MAIN_BAR', 'MAINBAR') THEN 1
      ELSE 2
    END,
    created_at,
    id
  LIMIT 1
)
UPDATE public.inventory_locations location
SET order_station = 'bar'
FROM bar_location
WHERE location.id = bar_location.id
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_locations WHERE order_station = 'bar'
  );

COMMENT ON COLUMN public.inventory_locations.order_station IS
  'Optional authoritative POS station mapping. Exactly one active location should map to kitchen and one to bar.';

NOTIFY pgrst, 'reload schema';
