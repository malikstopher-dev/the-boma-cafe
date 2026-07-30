-- ============================================================
-- Migration 039: Inventory Engine Core Tables
-- Creates the generic inventory engine schema with no
-- alcohol-specific knowledge.
-- ============================================================

-- Units of Measure
CREATE TABLE inventory_uoms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  symbol      TEXT,
  category    TEXT NOT NULL DEFAULT 'discrete'
              CHECK (category IN ('discrete', 'continuous')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global UOM conversion rates (shared across all products)
CREATE TABLE inventory_uom_conversions_global (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id       UUID NOT NULL REFERENCES inventory_uoms(id),
  to_uom_id         UUID NOT NULL REFERENCES inventory_uoms(id),
  factor            NUMERIC(20,6) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_uom_id, to_uom_id)
);

-- Locations
CREATE TABLE inventory_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suppliers
CREATE TABLE inventory_suppliers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  contact_person    TEXT,
  phone             TEXT,
  email             TEXT,
  vat_number        TEXT,
  payment_terms     TEXT,
  lead_time_days    INTEGER,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product categories (hierarchical)
CREATE TABLE inventory_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  parent_id     UUID REFERENCES inventory_categories(id),
  module        TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master product registry
CREATE TABLE inventory_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  sku               TEXT,
  barcode           TEXT,
  category_id       UUID REFERENCES inventory_categories(id),
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  preferred_supplier_id UUID REFERENCES inventory_suppliers(id),
  supplier_code         TEXT,
  reorder_threshold     NUMERIC(10,2),
  reorder_quantity      NUMERIC(10,2),
  has_expiry        BOOLEAN NOT NULL DEFAULT false,
  shelf_life_days   INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku),
  UNIQUE(barcode)
);

-- Product-specific UOM assignments and conversions
CREATE TABLE inventory_product_uoms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  uom_id            UUID NOT NULL REFERENCES inventory_uoms(id),
  is_base           BOOLEAN NOT NULL DEFAULT false,
  is_display        BOOLEAN NOT NULL DEFAULT false,
  conversion_factor NUMERIC(20,6) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, uom_id),
  CONSTRAINT one_base_uom CHECK (
    NOT (is_base = true AND is_display = true)
  )
);

-- Transaction ledger — the single source of truth
CREATE TABLE inventory_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN (
    'opening', 'purchase', 'sale', 'sale_bottle', 'breakage', 'spillage',
    'comp', 'staff', 'waste', 'expiry_loss', 'adjustment', 'physical_count',
    'transfer_in', 'transfer_out', 'return', 'production', 'theft', 'donation'
  )),
  quantity          NUMERIC(15,4) NOT NULL,
  unit_cost         NUMERIC(10,2),
  reference_type    TEXT CHECK (reference_type IN (
    'import_batch', 'stock_count', 'purchase_order', 'booking', 'pos_order', 'manual'
  )),
  reference_id      UUID,
  performed_by      UUID REFERENCES staff_profiles(id),
  notes             TEXT,
  import_batch_id   UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_tx_balance_lookup
  ON inventory_transactions(product_id, location_id, quantity);
CREATE INDEX idx_tx_product_history
  ON inventory_transactions(product_id, created_at DESC);
CREATE INDEX idx_tx_date
  ON inventory_transactions(created_at);
CREATE INDEX idx_tx_reference
  ON inventory_transactions(reference_type, reference_id);
CREATE INDEX idx_tx_import
  ON inventory_transactions(import_batch_id);

-- Cached balance (read-only, not authoritative)
CREATE TABLE inventory_product_balances (
  product_id    UUID NOT NULL REFERENCES inventory_products(id),
  location_id   UUID NOT NULL REFERENCES inventory_locations(id),
  balance       NUMERIC(15,4) NOT NULL,
  refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, location_id)
);

-- Audit log
CREATE TABLE inventory_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored', 'hard_deleted')),
  changes       JSONB,
  performed_by  UUID REFERENCES staff_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
