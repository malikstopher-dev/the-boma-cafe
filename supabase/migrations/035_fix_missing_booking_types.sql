-- Fix: Insert missing booking types (only Table Reservation + Birthday Party exist)
-- Uses ON CONFLICT DO NOTHING so it's safe to run multiple times

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
