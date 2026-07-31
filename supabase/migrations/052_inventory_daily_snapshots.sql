-- ============================================================
-- Migration 052: Inventory Daily Snapshots
-- Per-product per-day snapshot for instant morning-load and
-- report queries. Refreshed after reconciliation saves.
-- ============================================================

CREATE TABLE inventory_daily_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES inventory_products(id),
  location_id     UUID NOT NULL REFERENCES inventory_locations(id),
  date            DATE NOT NULL,
  inventory_type  TEXT NOT NULL,
  opening_qty     NUMERIC(15,4) NOT NULL,
  sales_qty       NUMERIC(15,4) NOT NULL DEFAULT 0,
  waste_qty       NUMERIC(15,4) NOT NULL DEFAULT 0,
  adjustments_qty NUMERIC(15,4) NOT NULL DEFAULT 0,
  deliveries_qty  NUMERIC(15,4) NOT NULL DEFAULT 0,
  transfers_qty   NUMERIC(15,4) NOT NULL DEFAULT 0,
  closing_qty     NUMERIC(15,4) NOT NULL DEFAULT 0,
  stock_value     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, location_id, date)
);

CREATE INDEX idx_snapshots_date
  ON inventory_daily_snapshots(date, inventory_type);

CREATE INDEX idx_snapshots_product
  ON inventory_daily_snapshots(product_id, date);
