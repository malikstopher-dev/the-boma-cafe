-- ============================================================
-- Migration 034: Booking & Quotation System
--
-- New tables for the multi-step booking wizard, quotation engine,
-- availability checking, pricing editor, and payment tracking.
-- Extends the existing bookings table with new columns and statuses.
-- ============================================================

-- ============================================================
-- 1. LOOKUP / CONFIG TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  min_guests INTEGER NOT NULL DEFAULT 1,
  max_guests INTEGER NOT NULL DEFAULT 500,
  min_duration_hours NUMERIC(4,1) NOT NULL DEFAULT 1,
  max_duration_hours NUMERIC(4,1) NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venue_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity_min INTEGER NOT NULL DEFAULT 1,
  capacity_max INTEGER NOT NULL DEFAULT 200,
  base_price_weekday NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_price_weekend NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  hourly_rate_weekday NUMERIC(10,2) NOT NULL DEFAULT 0,
  hourly_rate_weekend NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  per_person_weekday NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_person_weekend NUMERIC(10,2) NOT NULL DEFAULT 0,
  child_price_weekday NUMERIC(10,2),
  child_price_weekend NUMERIC(10,2),
  child_multiplier NUMERIC(3,2),
  min_guests INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drink_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  pricing_model TEXT NOT NULL DEFAULT 'per_person'
    CHECK (pricing_model IN ('per_person', 'flat_rate', 'consumption')),
  amount_weekday NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_weekend NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_guests INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addon_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES addon_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  pricing_model TEXT NOT NULL DEFAULT 'flat_fee'
    CHECK (pricing_model IN ('flat_fee', 'per_person', 'per_hour')),
  amount_weekday NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_weekend NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_quantity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'day_of_week', 'date_range', 'month', 'guest_count', 'minimum_spend'
  )),
  rule_config JSONB NOT NULL DEFAULT '{}',
  multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_area_id UUID REFERENCES venue_areas(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ============================================================
-- 2. CUSTOMER TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  notes TEXT,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. EXTEND BOOKINGS TABLE
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type_id UUID REFERENCES booking_types(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS venue_area_id UUID REFERENCES venue_areas(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4,1);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_id UUID;

-- Add source CHECK constraint (separate ALTER to avoid column+constraint issues)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_source_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_source_check
  CHECK (source IN ('web', 'admin', 'phone', 'email', 'walk_in'));

-- Migrate existing booking statuses to new workflow
-- 'pending' maps to 'quote_sent' (existing pending reservations become quoted)
UPDATE bookings SET status = 'quote_sent' WHERE status = 'pending';
-- 'confirmed', 'completed', 'cancelled' remain the same value

-- Extend status enum for full booking workflow
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'draft', 'quote_sent', 'awaiting_deposit', 'deposit_paid',
    'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'
  ));

-- ============================================================
-- 4. QUOTATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'converted', 'cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 30,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 7,
  valid_until DATE NOT NULL,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'venue_area', 'food_package', 'drink_package', 'addon', 'custom'
  )),
  reference_id UUID,
  label TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. PAYMENT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full', 'refund')),
  payment_method TEXT CHECK (payment_method IN (
    'payfast', 'ozow', 'yoco', 'stripe', 'peach_payments', 'cash', 'card', 'eft', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  transaction_id TEXT,
  gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. AUDIT & NOTIFICATION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system',
  changed_by_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'admin', 'manager', 'staff')),
  recipient_identifier TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'quote_ready', 'booking_confirmed', 'deposit_received', 'payment_failed',
    'booking_cancelled', 'reminder', 'balance_due', 'admin_new_booking',
    'admin_deposit_received'
  )),
  template_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. AVAILABILITY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_area_id UUID NOT NULL REFERENCES venue_areas(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guest_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'blocked', 'tentative')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type_id ON bookings(booking_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_area_id ON bookings(venue_area_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_quotes_booking_id ON quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_availability_venue_area_id ON availability(venue_area_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(booking_date);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date_range ON blocked_dates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Each CREATE POLICY is preceded by DROP POLICY IF EXISTS
-- for idempotent re-runs (matching existing migration 001 pattern).

ALTER TABLE booking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Public read access for booking config (types, venues, packages, add-ons)
DROP POLICY IF EXISTS "Allow public read booking_types" ON booking_types;
CREATE POLICY "Allow public read booking_types" ON booking_types FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read venues" ON venues;
CREATE POLICY "Allow public read venues" ON venues FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read venue_areas" ON venue_areas;
CREATE POLICY "Allow public read venue_areas" ON venue_areas FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read food_packages" ON food_packages;
CREATE POLICY "Allow public read food_packages" ON food_packages FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read drink_packages" ON drink_packages;
CREATE POLICY "Allow public read drink_packages" ON drink_packages FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read addon_categories" ON addon_categories;
CREATE POLICY "Allow public read addon_categories" ON addon_categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read addons" ON addons;
CREATE POLICY "Allow public read addons" ON addons FOR SELECT TO public USING (true);

-- Public read for availability info
DROP POLICY IF EXISTS "Allow public read blocked_dates" ON blocked_dates;
CREATE POLICY "Allow public read blocked_dates" ON blocked_dates FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public read availability" ON availability;
CREATE POLICY "Allow public read availability" ON availability FOR SELECT TO public USING (true);

-- Public insert for booking submission flow
DROP POLICY IF EXISTS "Allow public insert customers" ON customers;
CREATE POLICY "Allow public insert customers" ON customers FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert quotes" ON quotes;
CREATE POLICY "Allow public insert quotes" ON quotes FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert quote_items" ON quote_items;
CREATE POLICY "Allow public insert quote_items" ON quote_items FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert booking_status_history" ON booking_status_history;
CREATE POLICY "Allow public insert booking_status_history" ON booking_status_history FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert notification_queue" ON notification_queue;
CREATE POLICY "Allow public insert notification_queue" ON notification_queue FOR INSERT TO public WITH CHECK (true);

-- Authenticated full access (admin/staff)
DROP POLICY IF EXISTS "Allow authenticated all booking_types" ON booking_types;
CREATE POLICY "Allow authenticated all booking_types" ON booking_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all venues" ON venues;
CREATE POLICY "Allow authenticated all venues" ON venues FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all venue_areas" ON venue_areas;
CREATE POLICY "Allow authenticated all venue_areas" ON venue_areas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all food_packages" ON food_packages;
CREATE POLICY "Allow authenticated all food_packages" ON food_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all drink_packages" ON drink_packages;
CREATE POLICY "Allow authenticated all drink_packages" ON drink_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all addon_categories" ON addon_categories;
CREATE POLICY "Allow authenticated all addon_categories" ON addon_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all addons" ON addons;
CREATE POLICY "Allow authenticated all addons" ON addons FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all pricing_rules" ON pricing_rules;
CREATE POLICY "Allow authenticated all pricing_rules" ON pricing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all blocked_dates" ON blocked_dates;
CREATE POLICY "Allow authenticated all blocked_dates" ON blocked_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all customers" ON customers;
CREATE POLICY "Allow authenticated all customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all quotes" ON quotes;
CREATE POLICY "Allow authenticated all quotes" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all quote_items" ON quote_items;
CREATE POLICY "Allow authenticated all quote_items" ON quote_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all payments" ON payments;
CREATE POLICY "Allow authenticated all payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all booking_status_history" ON booking_status_history;
CREATE POLICY "Allow authenticated all booking_status_history" ON booking_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all notification_queue" ON notification_queue;
CREATE POLICY "Allow authenticated all notification_queue" ON notification_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all availability" ON availability;
CREATE POLICY "Allow authenticated all availability" ON availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Anon policies (belt and suspenders, matching existing migration 001 pattern)
DROP POLICY IF EXISTS "Allow anon read booking_types" ON booking_types;
CREATE POLICY "Allow anon read booking_types" ON booking_types FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read venues" ON venues;
CREATE POLICY "Allow anon read venues" ON venues FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read venue_areas" ON venue_areas;
CREATE POLICY "Allow anon read venue_areas" ON venue_areas FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read food_packages" ON food_packages;
CREATE POLICY "Allow anon read food_packages" ON food_packages FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read drink_packages" ON drink_packages;
CREATE POLICY "Allow anon read drink_packages" ON drink_packages FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read addon_categories" ON addon_categories;
CREATE POLICY "Allow anon read addon_categories" ON addon_categories FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read addons" ON addons;
CREATE POLICY "Allow anon read addons" ON addons FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read blocked_dates" ON blocked_dates;
CREATE POLICY "Allow anon read blocked_dates" ON blocked_dates FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read availability" ON availability;
CREATE POLICY "Allow anon read availability" ON availability FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon insert customers" ON customers;
CREATE POLICY "Allow anon insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert quotes" ON quotes;
CREATE POLICY "Allow anon insert quotes" ON quotes FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert quote_items" ON quote_items;
CREATE POLICY "Allow anon insert quote_items" ON quote_items FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert booking_status_history" ON booking_status_history;
CREATE POLICY "Allow anon insert booking_status_history" ON booking_status_history FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================

-- Add booking tables to realtime publication for live admin dashboard updates.
-- ALTER PUBLICATION ... ADD TABLE does NOT support IF NOT EXISTS.
-- Use a DO block with pg_publication_tables check for idempotency.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notification_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;
  END IF;
END $$;