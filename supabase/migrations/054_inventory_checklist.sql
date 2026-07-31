CREATE TABLE inventory_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  inventory_type TEXT CHECK (inventory_type IN ('FOOD','BEVERAGE','CLEANING','PACKAGING','GENERAL')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_checklist_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  checklist_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','skipped')),
  opened_by UUID REFERENCES staff_profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID REFERENCES staff_profiles(id),
  completed_at TIMESTAMPTZ,
  manager_notes TEXT,
  UNIQUE(location_id, checklist_date)
);

CREATE TABLE inventory_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES inventory_checklist_instances(id) ON DELETE CASCADE,
  template_id UUID REFERENCES inventory_checklist_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','failed')),
  completed_by UUID REFERENCES staff_profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_checklist_instances_location_date ON inventory_checklist_instances(location_id, checklist_date);
CREATE INDEX idx_checklist_instances_status ON inventory_checklist_instances(status);
CREATE INDEX idx_checklist_items_instance ON inventory_checklist_items(instance_id);

INSERT INTO inventory_checklist_templates (title, description, category, sort_order, is_required, inventory_type) VALUES
  ('Verify fridge temperatures', 'Check and record all fridge and freezer temperatures', 'refrigeration', 10, true, NULL),
  ('Check delivery received', 'Confirm any overnight or early morning deliveries', 'stock', 20, true, NULL),
  ('Record opening stock levels', 'Count and record opening stock for high-value items', 'stock', 30, true, 'BEVERAGE'),
  ('Verify previous day closing', 'Review yesterday closing stock levels and variances', 'reconciliation', 40, true, NULL),
  ('Check cleanliness standards', 'Verify kitchen and service areas are clean', 'cleanliness', 50, true, NULL),
  ('Review staff attendance', 'Confirm all scheduled staff have clocked in', 'admin', 60, false, NULL),
  ('Check equipment operation', 'Verify all key equipment is operational', 'equipment', 70, true, NULL),
  ('Review daily specials', 'Confirm ingredients for daily specials are available', 'menu', 80, false, 'FOOD'),
  ('Check bar stock levels', 'Verify par levels for opening bar stock', 'stock', 90, true, 'BEVERAGE'),
  ('Verify POS system online', 'Confirm point of sale system is operational', 'admin', 100, true, NULL);
