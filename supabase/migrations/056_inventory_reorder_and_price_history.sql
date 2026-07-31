CREATE TABLE inventory_reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  min_level NUMERIC(12,4) NOT NULL DEFAULT 0,
  max_level NUMERIC(12,4),
  par_level NUMERIC(12,4),
  lead_time_days INTEGER NOT NULL DEFAULT 3,
  auto_suggest BOOLEAN NOT NULL DEFAULT true,
  preferred_supplier_id UUID REFERENCES inventory_suppliers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

CREATE TABLE inventory_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES inventory_suppliers(id),
  unit_cost NUMERIC(12,2) NOT NULL,
  quantity NUMERIC(12,4),
  transaction_id UUID REFERENCES inventory_transactions(id),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reorder_rules_product ON inventory_reorder_rules(product_id);
CREATE INDEX idx_reorder_rules_location ON inventory_reorder_rules(location_id);
CREATE INDEX idx_reorder_rules_supplier ON inventory_reorder_rules(preferred_supplier_id);
CREATE INDEX idx_price_history_product ON inventory_price_history(product_id);
CREATE INDEX idx_price_history_supplier ON inventory_price_history(supplier_id);
CREATE INDEX idx_price_history_effective ON inventory_price_history(effective_date DESC);
