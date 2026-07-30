-- ============================================================
-- Migration 045: Inventory Imports and Supplier Tracking
-- Schema for Excel import pipeline. Created now for referential
-- integrity; logic implemented in Phase 1D.
-- ============================================================

-- Import batches
CREATE TABLE inventory_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type     TEXT NOT NULL CHECK (import_type IN ('supplier_delivery', 'physical_count', 'adjustment')),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'previewed', 'approved', 'applied', 'rolled_back', 'failed')),
  supplier_id     UUID REFERENCES inventory_suppliers(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  row_count       INTEGER,
  matched_count   INTEGER,
  unknown_count   INTEGER,
  error_count     INTEGER,
  errors          JSONB,
  applied_by      UUID REFERENCES staff_profiles(id),
  applied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import product mappings (remembers fuzzy-match decisions)
CREATE TABLE inventory_import_mappings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           UUID REFERENCES inventory_suppliers(id),
  supplier_product_name TEXT NOT NULL,
  supplier_sku          TEXT,
  normalized_name       TEXT,
  matched_product_id    UUID REFERENCES inventory_products(id),
  confidence            NUMERIC(5,4),
  auto_approve          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, supplier_product_name)
);
