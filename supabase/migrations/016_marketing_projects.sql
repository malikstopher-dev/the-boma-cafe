-- Migration 016: Marketing Studio
-- Creates tables for marketing projects, version history, brand assets, and templates
-- Fully idempotent — safe to run multiple times

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flyer','social','poster','voucher','loyalty','table_tent','event_poster','qr','campaign')),
  template_id UUID,
  project_data JSONB NOT NULL DEFAULT '{}',
  thumbnail TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','deleted')),
  tags TEXT[] DEFAULT '{}',
  campaign TEXT DEFAULT '',
  language TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  locked_by TEXT DEFAULT '',
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES marketing_projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  project_data JSONB NOT NULL DEFAULT '{}',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flyer','social','poster','voucher','loyalty','table_tent','event_poster','qr','campaign')),
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  design_data JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_built_in BOOLEAN DEFAULT false,
  language TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('logo','font','color','icon','background','food_image','pattern','qr_preset','campaign_image')),
  url TEXT DEFAULT '',
  value TEXT DEFAULT '',
  preview TEXT DEFAULT '',
  category TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_marketing_projects_status ON marketing_projects(status);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_type ON marketing_projects(type);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_campaign ON marketing_projects(campaign);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_created_by ON marketing_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_projects_tags ON marketing_projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketing_project_versions_project ON marketing_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_type ON marketing_templates(type);
CREATE INDEX IF NOT EXISTS idx_marketing_brand_assets_type ON marketing_brand_assets(type);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE marketing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_brand_assets ENABLE ROW LEVEL SECURITY;

-- ── Policies ────────────────────────────────────────────────────────────────
-- Each CREATE POLICY is wrapped in a sub-block with EXCEPTION for duplicate_object (42710)
-- to make re-runs safe on any PG version.

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Public read access" ON marketing_projects FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Public read access" ON marketing_project_versions FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Public read access" ON marketing_templates FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Public read access" ON marketing_brand_assets FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    CREATE POLICY "Service role write access" ON marketing_projects FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_projects FOR UPDATE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_projects FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    CREATE POLICY "Service role write access" ON marketing_project_versions FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_project_versions FOR UPDATE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_project_versions FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    CREATE POLICY "Service role write access" ON marketing_templates FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_templates FOR UPDATE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_templates FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    CREATE POLICY "Service role write access" ON marketing_brand_assets FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_brand_assets FOR UPDATE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    CREATE POLICY "Service role write access" ON marketing_brand_assets FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ── Seed: built-in templates ────────────────────────────────────────────────
-- Only insert when no built-in templates exist yet

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM marketing_templates WHERE is_built_in = true) THEN
    INSERT INTO marketing_templates (name, type, category, description, design_data, is_built_in, tags) VALUES
      ('Happy Hour Special', 'flyer', 'Promotions', 'Happy hour drink specials flyer', '{"width":2480,"height":3508,"dpi":300,"elements":[{"id":"t1","type":"text","x":200,"y":400,"width":2080,"height":200,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"HAPPY HOUR","fontFamily":"Playfair Display","fontSize":120,"fontWeight":700,"fontStyle":"normal","textAlign":"center","color":"#C26A2D","lineHeight":1.2,"letterSpacing":4,"textTransform":"uppercase"}},{"id":"t2","type":"text","x":200,"y":650,"width":2080,"height":120,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"Every Friday & Saturday • 5PM - 7PM","fontFamily":"Poppins","fontSize":40,"fontWeight":500,"fontStyle":"normal","textAlign":"center","color":"#4B4033","lineHeight":1.5,"letterSpacing":2,"textTransform":"none"}},{"id":"t3","type":"text","x":400,"y":900,"width":1680,"height":600,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"Buy One Get One Free\non selected cocktails\n\n*T&Cs apply","fontFamily":"Poppins","fontSize":36,"fontWeight":400,"fontStyle":"normal","textAlign":"center","color":"#7A6A58","lineHeight":1.6,"letterSpacing":0.5,"textTransform":"none"}}],"background":{"type":"gradient","gradient":{"type":"linear","angle":135,"stops":[{"color":"#FDF8F3","position":0},{"color":"#F5EDE3","position":100}]}}}', true, ARRAY['promotion', 'drinks', 'weekend']),
      ('Weekend Buffet', 'social', 'Food', 'Square social post for weekend buffet', '{"width":1080,"height":1080,"dpi":72,"elements":[{"id":"s1","type":"text","x":80,"y":200,"width":920,"height":160,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"WEEKEND BUFFET","fontFamily":"Playfair Display","fontSize":72,"fontWeight":700,"fontStyle":"normal","textAlign":"center","color":"#FFFFFF","lineHeight":1.2,"letterSpacing":3,"textTransform":"uppercase"}},{"id":"s2","type":"text","x":80,"y":400,"width":920,"height":100,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"Saturdays & Sundays","fontFamily":"Poppins","fontSize":32,"fontWeight":500,"fontStyle":"normal","textAlign":"center","color":"#F5EDE3","lineHeight":1.5,"letterSpacing":2,"textTransform":"none"}},{"id":"s3","type":"text","x":80,"y":550,"width":920,"height":200,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"9:30 AM - 2:30 PM\nR89 per adult | R45 per kid","fontFamily":"Poppins","fontSize":28,"fontWeight":400,"fontStyle":"normal","textAlign":"center","color":"#F5EDE3","lineHeight":1.6,"letterSpacing":0.5,"textTransform":"none"}}],"background":{"type":"gradient","gradient":{"type":"linear","angle":180,"stops":[{"color":"#C26A2D","position":0},{"color":"#8B4513","position":100}]}}}', true, ARRAY['food', 'buffet', 'weekend']),
      ('Live Entertainment', 'poster', 'Events', 'Live music event poster', '{"width":3508,"height":4960,"dpi":300,"elements":[{"id":"p1","type":"text","x":300,"y":600,"width":2908,"height":300,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"LIVE ENTERTAINMENT","fontFamily":"Playfair Display","fontSize":160,"fontWeight":700,"fontStyle":"normal","textAlign":"center","color":"#1F1F1F","lineHeight":1.2,"letterSpacing":6,"textTransform":"uppercase"}},{"id":"p2","type":"text","x":300,"y":950,"width":2908,"height":150,"rotation":0,"opacity":1,"visible":true,"zIndex":1,"props":{"content":"Thursday to Sunday","fontFamily":"Poppins","fontSize":48,"fontWeight":500,"fontStyle":"normal","textAlign":"center","color":"#4B4033","lineHeight":1.5,"letterSpacing":3,"textTransform":"none"}}],"background":{"type":"gradient","gradient":{"type":"radial","angle":0,"stops":[{"color":"#FDF8F3","position":0},{"color":"#E8D5C4","position":100}]}}}', true, ARRAY['events', 'music', 'entertainment']);
  END IF;
END $$;
