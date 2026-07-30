-- ============================================================
-- Migration 040: Inventory Bar Module
-- Alcohol-specific configuration on top of the generic engine.
-- ============================================================

-- Links bar menu items to inventory products (M:N)
CREATE TABLE bar_item_inventory_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_item_id         UUID NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,
  inventory_product_id UUID NOT NULL REFERENCES inventory_products(id),
  pour_size_ml        NUMERIC(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bar_item_id, inventory_product_id)
);

-- Bottle/pour configuration for alcohol products
CREATE TABLE bar_product_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES inventory_products(id) UNIQUE,
  bottle_size_ml        NUMERIC(10,2) NOT NULL,
  pour_size_ml          NUMERIC(10,2) NOT NULL,
  display_as            TEXT NOT NULL DEFAULT 'bottles_and_tots'
                        CHECK (display_as IN ('bottles_and_tots', 'tots_only', 'ml')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
