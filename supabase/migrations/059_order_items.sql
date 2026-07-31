-- ============================================================
-- Migration 059: Order Items
-- Normalizes orders.items_json into line items linked to
-- inventory products, enabling SALE ledger auto-deduction when
-- an order is completed.
-- ============================================================

CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name        TEXT NOT NULL,
  quantity         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  selected_size    TEXT,
  notes            TEXT,
  product_id       UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  pour_size_ml     NUMERIC(10,3),
  base_quantity    NUMERIC(10,3),
  transaction_id   UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL,
  matched_at       TIMESTAMPTZ,
  deducted_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, item_name)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_transaction ON order_items(transaction_id);
