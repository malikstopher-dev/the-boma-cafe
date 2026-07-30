-- ============================================================
-- Migration 049: Inventory Reservations + Drink Package Products
-- ============================================================
-- Architecture: Reservation model — stock is reserved on booking
-- confirm, released on cancel, consumed (SALE ledger txn) on complete.
-- drink_package_products enables auto-reservation based on package × guest count.

-- Table 1: Drink Package → Inventory Product mapping
-- Enables automatic reservation calculation on booking confirm.
CREATE TABLE IF NOT EXISTS drink_package_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_package_id    UUID NOT NULL REFERENCES drink_packages(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES inventory_products(id),
  quantity_per_person NUMERIC(15,4) NOT NULL CHECK (quantity_per_person > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(drink_package_id, product_id)
);

-- Table 2: Inventory Reservations
-- Soft hold on stock for a booking. No ledger impact until consumed.
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  quantity_reserved NUMERIC(15,4) NOT NULL CHECK (quantity_reserved > 0),
  quantity_consumed NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (quantity_consumed >= 0),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'partially_consumed', 'consumed', 'cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, product_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_reservations_booking ON inventory_reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_inv_reservations_product ON inventory_reservations(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_inv_reservations_status ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_dpp_package ON drink_package_products(drink_package_id);
