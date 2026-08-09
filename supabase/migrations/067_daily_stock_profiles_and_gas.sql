-- ============================================================
-- Migration 067: Daily Stock Input profiles + Gas tracker
--
-- 1. Counting profiles & sections for the Daily Stock Input
--    spreadsheet (sections like "Bottles" / "Tots" so the same
--    beverage can be counted in different units).
-- 2. Gas tracker: new inventory_type GAS, gas_usage transaction
--    type + GAS_USAGE reason, and the 5 LPG cylinder products
--    (1kg / 2kg / 9kg / 19kg / 48kg).
--
-- All changes are additive; existing CHECK constraints are
-- re-created with the SAME lists plus one new value each.
-- ============================================================

-- ------------------------------------------------------------
-- 1. inventory_type: add GAS (products)
-- ------------------------------------------------------------
ALTER TABLE inventory_products DROP CONSTRAINT IF EXISTS inventory_products_inventory_type_check;
ALTER TABLE inventory_products ADD CONSTRAINT inventory_products_inventory_type_check CHECK (
  inventory_type IN ('FOOD','BEVERAGE','CLEANING','PACKAGING','GENERAL','GAS')
);

-- ------------------------------------------------------------
-- 2. transaction_type: add gas_usage (transactions)
-- ------------------------------------------------------------
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check CHECK (
  transaction_type IN (
    'opening', 'purchase', 'sale', 'sale_bottle', 'breakage', 'spillage',
    'comp', 'staff', 'waste', 'expiry_loss', 'adjustment', 'physical_count',
    'transfer_in', 'transfer_out', 'return', 'production', 'theft', 'donation',
    'gas_usage'
  )
);

-- ------------------------------------------------------------
-- 3. reason_type: add GAS_USAGE (transactions)
-- ------------------------------------------------------------
ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_reason_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_reason_type_check CHECK (
  reason_type IN (
    'BREAKAGE','WASTE','STAFF_MEAL','PROMOTION','EXPIRED','THEFT',
    'DONATION','COMP','TRANSFER','ADJUSTMENT','SALE','BOOKING',
    'RETURN','OPENING','CLOSING','PRODUCTION','SPILLAGE','DELIVERY',
    'GAS_USAGE'
  )
);

-- ------------------------------------------------------------
-- 4. Counting profiles (Daily Stock Input sections)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_count_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  location_id    UUID REFERENCES inventory_locations(id),
  inventory_type TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_count_profile_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES inventory_count_profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES inventory_products(id),
  section_label TEXT NOT NULL DEFAULT 'General',
  count_uom_id  UUID REFERENCES inventory_uoms(id),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_count_profiles_location
  ON inventory_count_profiles(location_id, is_active);
CREATE INDEX IF NOT EXISTS idx_count_profile_items_profile
  ON inventory_count_profile_items(profile_id);

-- ------------------------------------------------------------
-- 5. Gas products (LPG cylinders)
-- ------------------------------------------------------------
INSERT INTO inventory_products (name, sku, inventory_type, is_active)
SELECT 'LPG Cylinder 1kg',  'GAS-001', 'GAS', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_products WHERE sku = 'GAS-001');

INSERT INTO inventory_products (name, sku, inventory_type, is_active)
SELECT 'LPG Cylinder 2kg',  'GAS-002', 'GAS', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_products WHERE sku = 'GAS-002');

INSERT INTO inventory_products (name, sku, inventory_type, is_active)
SELECT 'LPG Cylinder 9kg',  'GAS-003', 'GAS', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_products WHERE sku = 'GAS-003');

INSERT INTO inventory_products (name, sku, inventory_type, is_active)
SELECT 'LPG Cylinder 19kg', 'GAS-004', 'GAS', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_products WHERE sku = 'GAS-004');

INSERT INTO inventory_products (name, sku, inventory_type, is_active)
SELECT 'LPG Cylinder 48kg', 'GAS-005', 'GAS', TRUE
WHERE NOT EXISTS (SELECT 1 FROM inventory_products WHERE sku = 'GAS-005');

-- ------------------------------------------------------------
-- 6. Access control (migration 063/064 pattern)
-- ------------------------------------------------------------
REVOKE ALL ON public.inventory_count_profiles      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.inventory_count_profile_items FROM PUBLIC, anon, authenticated;