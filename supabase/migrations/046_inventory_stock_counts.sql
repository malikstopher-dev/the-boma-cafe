-- ============================================================
-- Migration 046: Stock Counts and Dashboard Cache
-- ============================================================

-- Physical stock count sessions
CREATE TABLE inventory_stock_counts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  status            TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'submitted', 'approved', 'cancelled')),
  snapshot_tx_before UUID,
  snapshot_tx_after  UUID,
  performed_by      UUID REFERENCES staff_profiles(id),
  approved_by       UUID REFERENCES staff_profiles(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- Individual stock count items
CREATE TABLE inventory_stock_count_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id    UUID NOT NULL REFERENCES inventory_stock_counts(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  physical_bottles  NUMERIC(10,2),
  physical_tots     NUMERIC(10,2),
  physical_quantity NUMERIC(15,4) NOT NULL,
  expected_quantity NUMERIC(15,4),
  variance          NUMERIC(15,4) GENERATED ALWAYS AS (physical_quantity - expected_quantity) STORED,
  variance_reason   TEXT,
  UNIQUE(stock_count_id, product_id)
);

-- Dashboard cache (read-only, refreshed periodically)
CREATE TABLE inventory_dashboard_cache (
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  total_products    INTEGER NOT NULL DEFAULT 0,
  total_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_alerts      INTEGER NOT NULL DEFAULT 0,
  low_stock_count   INTEGER NOT NULL DEFAULT 0,
  drinks_sold_today INTEGER NOT NULL DEFAULT 0,
  estimated_loss    NUMERIC(12,2) NOT NULL DEFAULT 0,
  refreshed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (location_id)
);
