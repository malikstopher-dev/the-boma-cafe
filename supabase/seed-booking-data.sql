-- Seed data for The Boma Cafe Booking System
-- Run AFTER migration 034

-- Booking Types
INSERT INTO booking_types (name, slug, description, icon, min_guests, max_guests, sort_order) VALUES
  ('Table Reservation', 'table-reservation', 'Book a table for dining', 'Table', 1, 20, 1),
  ('Birthday Party', 'birthday', 'Celebrate your special day', 'Birthday', 5, 200, 2),
  ('Wedding', 'wedding', 'Your perfect wedding day', 'Wedding', 20, 500, 3),
  ('Bridal Shower', 'bridal-shower', 'Celebrate the bride-to-be', 'Bridal', 10, 100, 4),
  ('Baby Shower', 'baby-shower', 'Welcome the new arrival', 'Baby', 10, 80, 5),
  ('Corporate Event', 'corporate', 'Business meetings and functions', 'Corporate', 5, 300, 6),
  ('Graduation', 'graduation', 'Celebrate academic achievement', 'Graduation', 10, 150, 7),
  ('Venue Hire', 'venue-hire', 'Exclusive use of our venue', 'Venue', 20, 500, 8),
  ('Conference', 'conference', 'Full-day conference events', 'Conference', 10, 200, 9),
  ('Catering', 'catering', 'Food and beverage catering', 'Catering', 20, 500, 10),
  ('Live Entertainment', 'live-entertainment', 'Music and performance events', 'Music', 10, 300, 11),
  ('Private Dining', 'private-dining', 'Exclusive dining experience', 'Dining', 2, 30, 12)
ON CONFLICT (slug) DO NOTHING;

-- Venues
INSERT INTO venues (name, slug, description) VALUES
  ('The Boma Cafe Main', 'the-boma-cafe-main', 'Main restaurant and event space at The Boma Cafe Sandton')
ON CONFLICT (slug) DO NOTHING;

-- Venue Areas (idempotent: only seeds when table is empty)
INSERT INTO venue_areas (venue_id, name, description, capacity_min, capacity_max, base_price_weekday, base_price_weekend, minimum_spend, hourly_rate_weekday, hourly_rate_weekend, sort_order)
SELECT v.id, area.name, area.descr, area.min_cap, area.max_cap, area.wd, area.we, area.ms, area.hwd, area.hwe, area.sort
FROM venues v
CROSS JOIN (VALUES
  ('Indoor', 'Air-conditioned indoor dining area with rustic charm', 2, 80, 0, 0, 5000, 0, 0, 1),
  ('Outdoor', 'Open-air thatched roof area with firepits', 2, 150, 0, 0, 8000, 0, 0, 2),
  ('VIP Section', 'Exclusive VIP area with premium service', 2, 40, 2000, 3000, 10000, 500, 750, 3),
  ('Private Room', 'Enclosed private room for intimate events', 2, 30, 1500, 2000, 6000, 400, 500, 4),
  ('Entire Venue', 'Exclusive use of the entire restaurant', 20, 500, 15000, 25000, 50000, 3000, 5000, 5)
) AS area(name, descr, min_cap, max_cap, wd, we, ms, hwd, hwe, sort)
WHERE v.slug = 'the-boma-cafe-main'
  AND NOT EXISTS (SELECT 1 FROM venue_areas);

-- Food Packages
INSERT INTO food_packages (name, slug, description, per_person_weekday, per_person_weekend, child_price_weekday, child_price_weekend, child_multiplier, min_guests, sort_order) VALUES
  ('Bronze', 'bronze', 'Classic starter package with selected starters, mains, and desserts', 250, 350, 150, 200, 0.50, 10, 1),
  ('Silver', 'silver', 'Premium package with expanded menu and additional courses', 450, 550, 250, 300, 0.50, 10, 2),
  ('Gold', 'gold', 'Ultimate dining experience with chef''s premium selection and dessert bar', 650, 850, 350, 450, 0.50, 20, 3),
  ('Custom', 'custom', 'Tailored menu created with our chef to suit your event', 0, 0, 0, 0, 0.50, 20, 4)
ON CONFLICT (slug) DO NOTHING;

-- Drink Packages
INSERT INTO drink_packages (name, slug, description, pricing_model, amount_weekday, amount_weekend, min_guests, sort_order) VALUES
  ('Cash Bar', 'cash-bar', 'Guests purchase their own drinks at the bar', 'consumption', 0, 0, 1, 1),
  ('Soft Drinks', 'soft-drinks', 'Unlimited soft drinks, juices, and water', 'per_person', 80, 100, 10, 2),
  ('Cocktail Package', 'cocktail-package', 'Selected signature cocktails and mocktails', 'per_person', 250, 350, 10, 3),
  ('Open Bar', 'open-bar', 'Unlimited beer, wine, selected spirits, and soft drinks', 'per_person', 350, 450, 20, 4),
  ('Premium Bar', 'premium-bar', 'Unlimited premium spirits, champagne, cocktails, and all beverages', 'per_person', 550, 700, 20, 5)
ON CONFLICT (slug) DO NOTHING;

-- Add-on Categories
INSERT INTO addon_categories (name, slug, description, sort_order) VALUES
  ('Entertainment', 'entertainment', 'Music, performances, and activities', 1),
  ('Decor and Design', 'decor', 'Decoration, flowers, and styling', 2),
  ('Catering Extras', 'catering-extras', 'Additional food and beverage options', 3),
  ('Equipment and Tech', 'equipment', 'Technical equipment and rentals', 4),
  ('Services', 'services', 'Additional service staff and coordination', 5),
  ('Kids and Family', 'kids', 'Children activities and facilities', 6)
ON CONFLICT (slug) DO NOTHING;

-- Add-ons (idempotent: only seeds when table is empty)
INSERT INTO addons (category_id, name, description, icon, pricing_model, amount_weekday, amount_weekend, max_quantity, sort_order)
SELECT cat.id, a.name, a.descr, a.icon_img, a.model, a.wd, a.we, a.max_qty, a.sort
FROM addon_categories cat
CROSS JOIN (VALUES
  ('entertainment', 'DJ', 'Professional DJ with sound system', 'DJ', 'flat_fee', 3500, 5000, 1, 1),
  ('entertainment', 'Live Band', 'Live band performance (3-piece)', 'Band', 'flat_fee', 8000, 12000, 1, 2),
  ('entertainment', 'MC', 'Professional master of ceremonies', 'MC', 'flat_fee', 2500, 3500, 1, 3),
  ('entertainment', 'Karaoke', 'Karaoke machine and microphone setup', 'Karaoke', 'flat_fee', 1500, 2500, 1, 4),
  ('decor', 'Flowers', 'Custom floral arrangements for tables and venue', 'Flowers', 'flat_fee', 2000, 3500, 1, 1),
  ('decor', 'Balloon Decor', 'Balloon arches, columns, and table pieces', 'Balloons', 'flat_fee', 1500, 2500, 1, 2),
  ('decor', 'Themed Decor', 'Custom themed decoration setup', 'Themed', 'flat_fee', 3000, 5000, 1, 3),
  ('catering-extras', 'Cake', 'Custom celebration cake (serves 30)', 'Cake', 'flat_fee', 800, 1200, 2, 1),
  ('catering-extras', 'Chocolate Fountain', 'Chocolate fountain with dipping items', 'Fountain', 'flat_fee', 1500, 2000, 1, 2),
  ('catering-extras', 'Sushi Station', 'Live sushi preparation station', 'Sushi', 'per_person', 120, 180, 1, 3),
  ('catering-extras', 'Braai Station', 'Additional braai and bbq station', 'Braai', 'flat_fee', 3000, 4500, 1, 4),
  ('equipment', 'Projector', 'HD projector and screen', 'Projector', 'flat_fee', 1500, 2000, 2, 1),
  ('equipment', 'Generator', 'Backup generator for peace of mind', 'Generator', 'flat_fee', 3000, 4000, 1, 2),
  ('equipment', 'Sound System', 'Additional PA sound system', 'Sound', 'flat_fee', 2500, 3500, 1, 3),
  ('services', 'Photographer', 'Professional event photographer (4 hours)', 'Photographer', 'flat_fee', 3500, 5000, 1, 1),
  ('services', 'Videographer', 'Professional event videography', 'Videographer', 'flat_fee', 5000, 7000, 1, 2),
  ('services', 'Security', 'Professional security personnel (per guard)', 'Security', 'per_person', 500, 700, 10, 3),
  ('services', 'Cleaning', 'Post-event deep cleaning service', 'Cleaning', 'flat_fee', 1500, 2000, 1, 4),
  ('services', 'Parking Attendant', 'Valet parking attendant', 'Parking', 'per_person', 400, 500, 6, 5),
  ('kids', 'Kids Area', 'Supervised kids play area with activities', 'Play Area', 'flat_fee', 2000, 3000, 1, 1),
  ('kids', 'Face Painting', 'Professional face painter for children', 'Face Paint', 'flat_fee', 1500, 2000, 2, 2),
  ('kids', 'Jumping Castle', 'Inflatable jumping castle', 'Jumping Castle', 'flat_fee', 2500, 3500, 1, 3)
) AS a(cat_slug, name, descr, icon_img, model, wd, we, max_qty, sort)
WHERE cat.slug = a.cat_slug
  AND NOT EXISTS (SELECT 1 FROM addons);

-- Booking settings in site_settings
INSERT INTO site_settings (key, value) VALUES
  ('booking:deposit_percentage', '30'),
  ('booking:tax_rate', '0'),
  ('booking:quote_validity_days', '7'),
  ('booking:min_advance_days', '1'),
  ('booking:max_advance_days', '365'),
  ('booking:enabled', 'true'),
  ('booking:auto_confirm', 'true'),
  ('booking:business_hours_start', '08:00'),
  ('booking:business_hours_end', '22:00')
ON CONFLICT (key) DO NOTHING;