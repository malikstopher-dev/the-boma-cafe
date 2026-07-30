-- ============================================================
-- Migration 048: Purchase Orders & Goods Receiving
-- Adds PO workflow, receiving events, and audit.
-- ============================================================

-- Purchase order headers
CREATE TABLE inventory_purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES inventory_suppliers(id),
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'approved', 'ordered', 'partial', 'received', 'cancelled')),
  quotation_ref   TEXT,
  ordered_at      TIMESTAMPTZ,
  expected_at     DATE,
  received_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES staff_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase order line items
CREATE TABLE inventory_purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  location_id       UUID NOT NULL REFERENCES inventory_locations(id),
  quantity_ordered  NUMERIC(10,2) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost         NUMERIC(12,2),
  UNIQUE(po_id, product_id)
);

-- Receiving events (supports partial deliveries)
CREATE TABLE inventory_po_receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           UUID NOT NULL REFERENCES inventory_purchase_orders(id),
  invoice_number  TEXT,
  notes           TEXT,
  received_by     UUID REFERENCES staff_profiles(id),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items received in each receiving event
CREATE TABLE inventory_po_receipt_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id        UUID NOT NULL REFERENCES inventory_po_receipts(id) ON DELETE CASCADE,
  po_item_id        UUID REFERENCES inventory_purchase_order_items(id),
  product_id        UUID NOT NULL REFERENCES inventory_products(id),
  quantity_received NUMERIC(10,2) NOT NULL CHECK (quantity_received > 0),
  unit_cost         NUMERIC(12,2)
);

-- Performance indexes
CREATE INDEX idx_po_supplier ON inventory_purchase_orders(supplier_id, status);
CREATE INDEX idx_po_status ON inventory_purchase_orders(status, expected_at);
CREATE INDEX idx_po_items_po ON inventory_purchase_order_items(po_id);
CREATE INDEX idx_po_items_product ON inventory_purchase_order_items(product_id);
CREATE INDEX idx_po_receipts_po ON inventory_po_receipts(po_id);
CREATE INDEX idx_po_receipt_items_product ON inventory_po_receipt_items(product_id);
