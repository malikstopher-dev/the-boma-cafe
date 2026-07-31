CREATE TABLE inventory_production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES inventory_recipes(id),
  location_id UUID NOT NULL REFERENCES inventory_locations(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  quantity_planned NUMERIC(12,4) NOT NULL DEFAULT 1,
  quantity_completed NUMERIC(12,4),
  cost_centre_id UUID REFERENCES cost_centres(id),
  started_by UUID REFERENCES staff_profiles(id),
  started_at TIMESTAMPTZ,
  completed_by UUID REFERENCES staff_profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_production_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_run_id UUID NOT NULL REFERENCES inventory_production_runs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id),
  direction TEXT NOT NULL CHECK (direction IN ('consumed','produced')),
  quantity NUMERIC(12,4) NOT NULL,
  transaction_id UUID REFERENCES inventory_transactions(id),
  wastage_pct NUMERIC(5,2) DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_production_runs_recipe ON inventory_production_runs(recipe_id);
CREATE INDEX idx_production_runs_location ON inventory_production_runs(location_id);
CREATE INDEX idx_production_runs_status ON inventory_production_runs(status);
CREATE INDEX idx_production_run_items_run ON inventory_production_run_items(production_run_id);
CREATE INDEX idx_production_run_items_product ON inventory_production_run_items(product_id);

ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check CHECK (
  transaction_type IN (
    'opening', 'purchase', 'sale', 'sale_bottle', 'breakage', 'spillage',
    'comp', 'staff', 'waste', 'expiry_loss', 'adjustment', 'physical_count',
    'transfer_in', 'transfer_out', 'return', 'production', 'theft', 'donation'
  )
);

ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_reference_type_check;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_reference_type_check CHECK (
  reference_type IN (
    'import_batch', 'stock_count', 'purchase_order',
    'booking', 'pos_order', 'manual', 'production_run'
  )
);
