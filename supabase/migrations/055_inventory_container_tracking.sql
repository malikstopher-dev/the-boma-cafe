CREATE TABLE inventory_container_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_trackable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_products ADD COLUMN container_type_id UUID REFERENCES inventory_container_types(id);
ALTER TABLE inventory_products ADD COLUMN units_per_container NUMERIC(12,4);

ALTER TABLE inventory_transactions ADD COLUMN container_quantity NUMERIC(12,4);
ALTER TABLE inventory_transactions ADD COLUMN container_type_id UUID REFERENCES inventory_container_types(id);

CREATE INDEX idx_products_container ON inventory_products(container_type_id);
CREATE INDEX idx_transactions_container ON inventory_transactions(container_type_id);

INSERT INTO inventory_container_types (name, display_name, description, sort_order) VALUES
  ('bottle', 'Bottle', 'Glass or plastic bottle', 10),
  ('keg', 'Keg', 'Pressurised beer keg', 20),
  ('case', 'Case', 'Multi-pack case (12/24 units)', 30),
  ('crate', 'Crate', 'Returnable crate', 40),
  ('box', 'Box', 'Cardboard box', 50),
  ('packet', 'Packet', 'Sealed packet or sachet', 60),
  ('bag', 'Bag', 'Bag (flour, sugar, etc.)', 70),
  ('tub', 'Tub', 'Plastic tub (ice cream, condiments)', 80),
  ('bucket', 'Bucket', 'Bucket (cleaning supplies)', 90);
