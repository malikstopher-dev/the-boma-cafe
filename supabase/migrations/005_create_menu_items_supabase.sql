-- ============================================================
-- Migration 005: menu_items_supabase table for serverless pricing
-- ============================================================
-- Orders route uses this table for server-authoritative pricing
-- instead of SQLite (which is unavailable on Vercel serverless).
-- Populated via scripts/seed-menu-prices.ts at build time.
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items_supabase (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  sizes TEXT,
  add_ons TEXT
);

-- Allow service_role (supabaseAdmin) full access
ALTER TABLE menu_items_supabase ENABLE ROW LEVEL SECURITY;

-- Admin: full CRUD
CREATE POLICY "menu_items_admin_all"
  ON menu_items_supabase FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Kitchen: read only (for future use)
CREATE POLICY "menu_items_kitchen_select"
  ON menu_items_supabase FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'kitchen');

-- Anon/public: no access (pricing is server-internal only)

-- ============================================================
-- VERIFICATION
-- SELECT * FROM menu_items_supabase ORDER BY name;
-- ============================================================
