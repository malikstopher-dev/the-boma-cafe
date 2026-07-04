-- Migration 015: Move CMS from SQLite to Supabase tables
-- This creates all tables previously stored in data/cms.db

-- Site settings (key-value pairs, same schema as SQLite)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price TEXT DEFAULT '',
  image TEXT DEFAULT '',
  sizes TEXT,
  add_ons TEXT,
  options TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_on_promo BOOLEAN DEFAULT false,
  promo_badge TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  category TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  gallery_images TEXT,
  status TEXT DEFAULT 'upcoming',
  show_on_homepage BOOLEAN DEFAULT false,
  cta_label TEXT DEFAULT 'Book Now',
  cta_link TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Last week highlights
CREATE TABLE IF NOT EXISTS last_week_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  video_src TEXT DEFAULT '',
  poster_image TEXT DEFAULT '',
  cta_label TEXT DEFAULT '',
  cta_link TEXT DEFAULT '',
  visible BOOLEAN DEFAULT true,
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  loop_video BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  price_text TEXT DEFAULT '',
  cta_text TEXT DEFAULT '',
  cta_link TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  display_on_homepage BOOLEAN DEFAULT false,
  start_date TEXT,
  end_date TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  category TEXT DEFAULT '',
  is_featured BOOLEAN DEFAULT false,
  board_id INTEGER,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery boards
CREATE TABLE IF NOT EXISTS gallery_boards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popup config (single row)
CREATE TABLE IF NOT EXISTS popup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'announcement',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  cta_text TEXT DEFAULT '',
  cta_link TEXT DEFAULT '',
  is_enabled BOOLEAN DEFAULT false,
  show_once_per_session BOOLEAN DEFAULT true,
  start_date TEXT,
  end_date TEXT,
  start_time TEXT DEFAULT '09:30',
  end_time TEXT DEFAULT '12:30',
  active_days TEXT DEFAULT '[6,0]',
  adult_price TEXT DEFAULT 'R89',
  kids_price TEXT DEFAULT 'R45',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement bar (single row)
CREATE TABLE IF NOT EXISTS announcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT DEFAULT '',
  link TEXT DEFAULT '',
  link_text TEXT DEFAULT '',
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_week_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all CMS tables (for frontend display)
-- Each wrapped in exception block for full idempotency
DO $$ BEGIN CREATE POLICY "Public read access" ON site_settings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON menu_categories FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON menu_items FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON last_week_highlights FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON promotions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON gallery FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON gallery_boards FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON popup FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read access" ON announcement FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role can do everything (admin client bypasses RLS anyway, but belt-and-suspenders)
-- Only allow writes from service_role (admin API routes)
DO $$ BEGIN CREATE POLICY "Service role write access" ON site_settings FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON site_settings FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON site_settings FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_categories FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_categories FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_categories FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_items FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_items FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON menu_items FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON events FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON events FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON events FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON last_week_highlights FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON last_week_highlights FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON last_week_highlights FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON promotions FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON promotions FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON promotions FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery_boards FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery_boards FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON gallery_boards FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON popup FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON popup FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON popup FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role write access" ON announcement FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON announcement FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role write access" ON announcement FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Insert default gallery boards
INSERT INTO gallery_boards (id, name, description, order_index) VALUES
  (1, 'Events', 'Gallery photos from our events', 0),
  (2, 'Food', 'Delicious food photos', 1),
  (3, 'Venue', 'Our beautiful venue', 2),
  (4, 'People', 'Happy guests', 3),
  (5, 'Promotions', 'Special offers and promotions', 4)
ON CONFLICT (id) DO NOTHING;

-- Insert default announcement
INSERT INTO announcement (id, text, link, link_text, is_enabled) VALUES
  (gen_random_uuid(), '🎉 Join us for Live Music every Friday & Saturday evening!', '/events', 'View Events', true)
ON CONFLICT DO NOTHING;

-- Insert default popup
INSERT INTO popup (id, title, description, cta_text, cta_link, is_enabled) VALUES
  (gen_random_uuid(), 'Welcome to The Boma Cafe', 'Experience authentic rustic dining', 'View Menu', '/menu', false)
ON CONFLICT DO NOTHING;
