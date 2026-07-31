CREATE TABLE inventory_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  yield_uom_id UUID REFERENCES inventory_uoms(id),
  category TEXT,
  prep_time_minutes INTEGER,
  wastage_pct NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES staff_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES inventory_recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id),
  quantity NUMERIC(12,4) NOT NULL,
  uom_id UUID REFERENCES inventory_uoms(id),
  wastage_pct NUMERIC(5,2) DEFAULT 0,
  substitution_product_id UUID REFERENCES inventory_products(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(recipe_id, product_id)
);

CREATE TABLE inventory_recipe_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES inventory_recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  uom_id UUID REFERENCES inventory_uoms(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe ON inventory_recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_product ON inventory_recipe_ingredients(product_id);
CREATE INDEX idx_recipe_outputs_recipe ON inventory_recipe_outputs(recipe_id);
