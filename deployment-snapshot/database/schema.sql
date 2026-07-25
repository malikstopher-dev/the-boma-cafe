-- The Boma Cafe Booking System - Database Schema Snapshot
-- Generated: 2026-07-25T20:22:29.863Z
-- Project Ref: lyksqvqtiysjttwpgeyw

-- Table: bookings (4 rows)
  id (string)
  name (string)
  phone (string)
  email (string)
  booking_date (string)
  booking_time (string)
  guests (number)
  notes (string)
  status (string)
  created_at (string)
  customer_id (unknown)
  booking_type_id (unknown)
  venue_area_id (unknown)
  duration_hours (unknown)
  adults (unknown)
  children (number)
  special_requests (unknown)
  source (string)
  quote_id (unknown)

-- Table: booking_types (12 rows)
  id (string)
  name (string)
  slug (string)
  description (string)
  icon (string)
  min_guests (number)
  max_guests (number)
  min_duration_hours (number)
  max_duration_hours (number)
  is_active (boolean)
  sort_order (number)
  created_at (string)

-- Table: venue_areas (5 rows)
  id (string)
  venue_id (string)
  name (string)
  description (string)
  capacity_min (number)
  capacity_max (number)
  base_price_weekday (number)
  base_price_weekend (number)
  minimum_spend (number)
  hourly_rate_weekday (number)
  hourly_rate_weekend (number)
  is_active (boolean)
  sort_order (number)
  created_at (string)

-- Table: food_packages (4 rows)
  id (string)
  name (string)
  slug (string)
  description (string)
  per_person_weekday (number)
  per_person_weekend (number)
  child_price_weekday (number)
  child_price_weekend (number)
  child_multiplier (number)
  min_guests (number)
  is_active (boolean)
  sort_order (number)
  created_at (string)

-- Table: drink_packages (5 rows)
  id (string)
  name (string)
  slug (string)
  description (string)
  pricing_model (string)
  amount_weekday (number)
  amount_weekend (number)
  min_guests (number)
  is_active (boolean)
  sort_order (number)
  created_at (string)

-- Table: addons (22 rows)
  id (string)
  category_id (string)
  name (string)
  description (string)
  icon (string)
  pricing_model (string)
  amount_weekday (number)
  amount_weekend (number)
  max_quantity (number)
  is_active (boolean)
  sort_order (number)
  created_at (string)

-- Table: addon_categories (6 rows)
  id (string)
  name (string)
  slug (string)
  description (string)
  sort_order (number)
  created_at (string)

-- Table: customers (1 rows)
  id (string)
  name (string)
  phone (string)
  email (string)
  company (string)
  notes (unknown)
  total_bookings (number)
  total_spend (number)
  created_at (string)
  updated_at (string)

-- Table: quotes (1 rows)
  id (string)
  booking_id (string)
  quote_number (string)
  status (string)
  subtotal (number)
  tax_rate (number)
  tax_amount (number)
  total (number)
  deposit_percentage (number)
  deposit_amount (number)
  balance_amount (number)
  validity_days (number)
  valid_until (string)
  notes (unknown)
  version (number)
  created_at (string)
  updated_at (string)
  access_token (unknown)
  pdf_path (unknown)
  storage_path (unknown)
  pdf_version (number)
  generated_at (unknown)
  generated_by (string)

-- Table: quote_items (4 rows)
  id (string)
  quote_id (string)
  item_type (string)
  reference_id (string)
  label (string)
  description (string)
  quantity (number)
  unit_price (number)
  total_price (number)
  sort_order (number)
  created_at (string)

-- Table: quote_versions (0 rows)

-- Table: site_settings (9 rows)
  id (string)
  key (string)
  value (string)
  updated_at (string)

-- Table: notification_queue (7 rows)
  id (string)
  recipient_type (string)
  recipient_identifier (string)
  notification_type (string)
  template_data (object)
  status (string)
  sent_at (unknown)
  error_message (unknown)
  created_at (string)

-- Table: booking_status_history (9 rows)
  id (string)
  booking_id (string)
  previous_status (string)
  new_status (string)
  changed_by (string)
  changed_by_id (unknown)
  reason (unknown)
  created_at (string)

-- Table: menu_items (146 rows)
  id (string)
  category_id (string)
  name (string)
  description (string)
  price (string)
  image (string)
  sizes (unknown)
  add_ons (string)
  options (unknown)
  is_available (boolean)
  is_featured (boolean)
  is_on_promo (boolean)
  promo_badge (string)
  order_index (number)
  created_at (string)
  updated_at (string)
  available_for_all_order_types (boolean)

-- Table: menu_categories (19 rows)
  id (string)
  name (string)
  description (string)
  order_index (number)
  is_active (boolean)
  created_at (string)
  updated_at (string)
  is_bar (boolean)

-- Table: orders (22 rows)
  id (string)
  customer_name (string)
  phone (string)
  order_type (string)
  requested_time (string)
  items_json (string)
  total (number)
  status (string)
  created_at (string)
  order_ref (string)
  table_number (string)
  delivery_address (unknown)
  created_by (unknown)
  idempotency_key (string)
  payment_status (string)
  payment_confirmed_at (unknown)
  payment_confirmed_by (unknown)
  waiter_name (string)
  preparation_time_minutes (unknown)
  cancellation_reason (unknown)
  source (string)
  station (unknown)
  parent_order_id (unknown)
  staff_id (unknown)
  created_by_employee_id (unknown)
  updated_by_employee_id (unknown)
  estimated_prep_minutes (unknown)
  prep_started_at (unknown)
  estimated_ready_at (unknown)
  actual_ready_at (unknown)

-- Table: payments (0 rows)

-- Table: media (0 rows)

-- Table: events (0 rows)

-- Table: promotions (0 rows)

-- Table: staff_sessions (3 rows)
  id (string)
  staff_id (string)
  session_token (string)
  device_fingerprint (string)
  device_name (string)
  user_agent (string)
  ip_address (string)
  role (string)
  started_at (string)
  last_active_at (string)
  expires_at (string)
  signed_out_at (unknown)
  signed_out_reason (unknown)

-- Table: staff_conversations (9 rows)
  id (string)
  title (unknown)
  is_group (boolean)
  created_at (string)

-- Table: contact_messages (1 rows)
  id (string)
  name (string)
  phone (string)
  email (string)
  message (string)
  created_at (string)
  subject (unknown)
  is_read (boolean)
  read_at (unknown)

-- Table: push_subscriptions (0 rows)

-- Table: gallery (0 rows)

-- Table: blocked_dates (0 rows)

-- Table: pricing_rules (0 rows)

-- =====================================================
-- DATA DUMP: CONFIGURATION TABLES
-- =====================================================

-- booking_types (12 rows)
[
  {
    "id": "c246d5d3-bdf5-479c-b27f-67b53d176256",
    "name": "Table Reservation",
    "slug": "table-reservation",
    "description": "Book a table for dining",
    "icon": "🍽️",
    "min_guests": 1,
    "max_guests": 20,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "b5205995-c4f6-4656-b946-b45bd0c9e168",
    "name": "Birthday Party",
    "slug": "birthday",
    "description": "Celebrate your special day",
    "icon": "🎂",
    "min_guests": 5,
    "max_guests": 200,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "06e4fdb8-e6f8-4c40-ab36-4de67bcd9b33",
    "name": "Wedding",
    "slug": "wedding",
    "description": "Your perfect wedding day",
    "icon": "💍",
    "min_guests": 20,
    "max_guests": 500,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "8fab1aae-0a13-49b3-b225-9ba2a2017fe3",
    "name": "Bridal Shower",
    "slug": "bridal-shower",
    "description": "Celebrate the bride-to-be",
    "icon": "👰",
    "min_guests": 10,
    "max_guests": 100,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "5a30c572-cb1e-4cb8-b4b5-247f753a8468",
    "name": "Baby Shower",
    "slug": "baby-shower",
    "description": "Welcome the new arrival",
    "icon": "👶",
    "min_guests": 10,
    "max_guests": 80,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 5,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "33f8f475-0e31-4e67-809b-9be6845e6442",
    "name": "Corporate Event",
    "slug": "corporate",
    "description": "Business meetings and functions",
    "icon": "💼",
    "min_guests": 5,
    "max_guests": 300,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 6,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "743d4482-a7f3-42da-9d35-96fd940644c4",
    "name": "Graduation",
    "slug": "graduation",
    "description": "Celebrate academic achievement",
    "icon": "🎓",
    "min_guests": 10,
    "max_guests": 150,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 7,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "7283d334-527b-4a9b-b06f-8c19bbe69011",
    "name": "Venue Hire",
    "slug": "venue-hire",
    "description": "Exclusive use of our venue",
    "icon": "🏟️",
    "min_guests": 20,
    "max_guests": 500,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 8,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "11d105f9-5dcc-46ef-a938-283b0daeb490",
    "name": "Conference",
    "slug": "conference",
    "description": "Full-day conference events",
    "icon": "📊",
    "min_guests": 10,
    "max_guests": 200,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 9,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "721f829c-751d-4f25-93c2-f3a2170cebd8",
    "name": "Catering",
    "slug": "catering",
    "description": "Food and beverage catering",
    "icon": "🥘",
    "min_guests": 20,
    "max_guests": 500,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 10,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "bed3fc30-521d-4144-89a2-0402bdd18dcc",
    "name": "Live Entertainment",
    "slug": "live-entertainment",
    "description": "Music and performance events",
    "icon": "🎵",
    "min_guests": 10,
    "max_guests": 300,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 11,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "08fd7e7b-ba2b-43fd-a651-2fd9633b8138",
    "name": "Private Dining",
    "slug": "private-dining",
    "description": "Exclusive dining experience",
    "icon": "🌙",
    "min_guests": 2,
    "max_guests": 30,
    "min_duration_hours": 1,
    "max_duration_hours": 12,
    "is_active": true,
    "sort_order": 12,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- venue_areas (5 rows)
[
  {
    "id": "1929dfc5-c873-42b2-80d8-d592f3285287",
    "venue_id": "c2122598-7f63-4791-95de-464ac8409399",
    "name": "VIP Section",
    "description": "Exclusive VIP area with premium service",
    "capacity_min": 2,
    "capacity_max": 40,
    "base_price_weekday": 2000,
    "base_price_weekend": 3000,
    "minimum_spend": 10000,
    "hourly_rate_weekday": 500,
    "hourly_rate_weekend": 750,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "28d82f5e-f783-45a9-9b63-4e2cb63fbd90",
    "venue_id": "c2122598-7f63-4791-95de-464ac8409399",
    "name": "Private Room",
    "description": "Enclosed private room for intimate events",
    "capacity_min": 2,
    "capacity_max": 30,
    "base_price_weekday": 1500,
    "base_price_weekend": 2000,
    "minimum_spend": 6000,
    "hourly_rate_weekday": 400,
    "hourly_rate_weekend": 500,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "54e48a72-1880-48c1-ad33-244f3436ff0d",
    "venue_id": "c2122598-7f63-4791-95de-464ac8409399",
    "name": "Entire Venue",
    "description": "Exclusive use of the entire restaurant",
    "capacity_min": 20,
    "capacity_max": 500,
    "base_price_weekday": 15000,
    "base_price_weekend": 25000,
    "minimum_spend": 50000,
    "hourly_rate_weekday": 3000,
    "hourly_rate_weekend": 5000,
    "is_active": true,
    "sort_order": 5,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "975f9134-4793-4e02-b044-7a1396bad44e",
    "venue_id": "c2122598-7f63-4791-95de-464ac8409399",
    "name": "Indoor",
    "description": "Air-conditioned indoor dining area with rustic charm",
    "capacity_min": 2,
    "capacity_max": 80,
    "base_price_weekday": 500,
    "base_price_weekend": 550,
    "minimum_spend": 2500,
    "hourly_rate_weekday": 580,
    "hourly_rate_weekend": 750,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "f29e045f-1783-4091-90f7-b12a111e2d84",
    "venue_id": "c2122598-7f63-4791-95de-464ac8409399",
    "name": "Outdoor",
    "description": "Open-air thatched roof area with firepits",
    "capacity_min": 2,
    "capacity_max": 150,
    "base_price_weekday": 350,
    "base_price_weekend": 0,
    "minimum_spend": 10000,
    "hourly_rate_weekday": 500,
    "hourly_rate_weekend": 0,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- food_packages (4 rows)
[
  {
    "id": "51f8a1bb-b393-47b8-9390-b88f802c8419",
    "name": "Bronze",
    "slug": "bronze",
    "description": "Classic starter package with selected starters, mains, and desserts",
    "per_person_weekday": 250,
    "per_person_weekend": 350,
    "child_price_weekday": 150,
    "child_price_weekend": 200,
    "child_multiplier": 0.5,
    "min_guests": 10,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "3ae410d0-8385-449e-8ebe-315fa39c1263",
    "name": "Silver",
    "slug": "silver",
    "description": "Premium package with expanded menu and additional courses",
    "per_person_weekday": 450,
    "per_person_weekend": 550,
    "child_price_weekday": 250,
    "child_price_weekend": 300,
    "child_multiplier": 0.5,
    "min_guests": 10,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "854f0247-8b01-45b3-9953-5451c46aeac0",
    "name": "Gold",
    "slug": "gold",
    "description": "Ultimate dining experience with chef's premium selection and dessert bar",
    "per_person_weekday": 650,
    "per_person_weekend": 850,
    "child_price_weekday": 350,
    "child_price_weekend": 450,
    "child_multiplier": 0.5,
    "min_guests": 20,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "686495d9-42e7-4c9b-b682-143c60d6c3d6",
    "name": "Custom",
    "slug": "custom",
    "description": "Tailored menu created with our chef to suit your event",
    "per_person_weekday": 0,
    "per_person_weekend": 0,
    "child_price_weekday": 0,
    "child_price_weekend": 0,
    "child_multiplier": 0.5,
    "min_guests": 20,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- drink_packages (5 rows)
[
  {
    "id": "b65eb8ab-2141-4b04-9004-1c6783564bc4",
    "name": "Soft Drinks",
    "slug": "soft-drinks",
    "description": "Unlimited soft drinks, juices, and water",
    "pricing_model": "per_person",
    "amount_weekday": 80,
    "amount_weekend": 100,
    "min_guests": 10,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "0d528785-3621-4ab9-9a67-67e87e43e844",
    "name": "Cocktail Package",
    "slug": "cocktail-package",
    "description": "Selected signature cocktails and mocktails",
    "pricing_model": "per_person",
    "amount_weekday": 250,
    "amount_weekend": 350,
    "min_guests": 10,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "64a1ef69-f7b7-44f4-9a3d-95cba28d542f",
    "name": "Open Bar",
    "slug": "open-bar",
    "description": "Unlimited beer, wine, selected spirits, and soft drinks",
    "pricing_model": "per_person",
    "amount_weekday": 350,
    "amount_weekend": 450,
    "min_guests": 20,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "1db9dda1-73ed-4e7f-a26d-fe88d11a0af4",
    "name": "Premium Bar",
    "slug": "premium-bar",
    "description": "Unlimited premium spirits, champagne, cocktails, and all beverages",
    "pricing_model": "per_person",
    "amount_weekday": 550,
    "amount_weekend": 700,
    "min_guests": 20,
    "is_active": true,
    "sort_order": 5,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "c38ba932-71d7-46cb-91ba-3cd935279f32",
    "name": "Cash Bar",
    "slug": "cash-bar",
    "description": "Guests purchase their own drinks at the bar",
    "pricing_model": "per_person",
    "amount_weekday": 1,
    "amount_weekend": 0,
    "min_guests": 2,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- addons (22 rows)
[
  {
    "id": "3c875fed-c2f8-4fef-8885-36fceb25dbc8",
    "category_id": "fc18c78a-6914-435c-9114-1da99e3fe085",
    "name": "DJ",
    "description": "Professional DJ with sound system",
    "icon": "🎧",
    "pricing_model": "flat_fee",
    "amount_weekday": 3500,
    "amount_weekend": 5000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "6b914916-261d-4f71-8e4a-a341a32498d5",
    "category_id": "fc18c78a-6914-435c-9114-1da99e3fe085",
    "name": "Live Band",
    "description": "Live band performance (3-piece)",
    "icon": "🎸",
    "pricing_model": "flat_fee",
    "amount_weekday": 8000,
    "amount_weekend": 12000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "8a634894-32b4-43c5-9f98-75b1229eb26f",
    "category_id": "fc18c78a-6914-435c-9114-1da99e3fe085",
    "name": "MC",
    "description": "Professional master of ceremonies",
    "icon": "🎤",
    "pricing_model": "flat_fee",
    "amount_weekday": 2500,
    "amount_weekend": 3500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "878df934-a199-4773-b058-02c53a1921aa",
    "category_id": "fc18c78a-6914-435c-9114-1da99e3fe085",
    "name": "Karaoke",
    "description": "Karaoke machine and microphone setup",
    "icon": "🎤",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "626776ad-d2c0-4c11-ada0-fe0dd4e53d2f",
    "category_id": "9dd6459f-df8d-4447-8284-b1aebd36d2ee",
    "name": "Flowers",
    "description": "Custom floral arrangements for tables and venue",
    "icon": "💐",
    "pricing_model": "flat_fee",
    "amount_weekday": 2000,
    "amount_weekend": 3500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "71691c15-e05c-4838-8c30-17e544c66cfe",
    "category_id": "9dd6459f-df8d-4447-8284-b1aebd36d2ee",
    "name": "Balloon Decor",
    "description": "Balloon arches, columns, and table pieces",
    "icon": "🎈",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "4168670d-f847-45a9-9f12-37e9a83495e7",
    "category_id": "9dd6459f-df8d-4447-8284-b1aebd36d2ee",
    "name": "Themed Decor",
    "description": "Custom themed decoration setup",
    "icon": "🎨",
    "pricing_model": "flat_fee",
    "amount_weekday": 3000,
    "amount_weekend": 5000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "d3a10473-844d-43cd-ba6c-5c89c69fdb66",
    "category_id": "044288d2-1e70-4b9a-b8dc-a2648a713918",
    "name": "Cake",
    "description": "Custom celebration cake (serves 30)",
    "icon": "🎂",
    "pricing_model": "flat_fee",
    "amount_weekday": 800,
    "amount_weekend": 1200,
    "max_quantity": 2,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "74ce6015-b05e-4b24-ae5a-cb716171cb99",
    "category_id": "044288d2-1e70-4b9a-b8dc-a2648a713918",
    "name": "Chocolate Fountain",
    "description": "Chocolate fountain with dipping items",
    "icon": "🍫",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "e556b0fa-cf2b-4967-bc1d-f9a54a4a6e51",
    "category_id": "044288d2-1e70-4b9a-b8dc-a2648a713918",
    "name": "Sushi Station",
    "description": "Live sushi preparation station",
    "icon": "🍣",
    "pricing_model": "per_person",
    "amount_weekday": 120,
    "amount_weekend": 180,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "4b02ea4c-cbbd-4a9e-939d-6c43fdcb7cef",
    "category_id": "044288d2-1e70-4b9a-b8dc-a2648a713918",
    "name": "Braai Station",
    "description": "Additional braai/bbq station",
    "icon": "🔥",
    "pricing_model": "flat_fee",
    "amount_weekday": 3000,
    "amount_weekend": 4500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "dbb93bc4-ce92-472d-b727-d61cb673e50d",
    "category_id": "be162d61-1be6-451f-b3b7-7486b4258303",
    "name": "Projector",
    "description": "HD projector and screen",
    "icon": "📽️",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2000,
    "max_quantity": 2,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "82dae8b6-36c4-4f23-b336-919b072608e6",
    "category_id": "be162d61-1be6-451f-b3b7-7486b4258303",
    "name": "Generator",
    "description": "Backup generator for peace of mind",
    "icon": "⚡",
    "pricing_model": "flat_fee",
    "amount_weekday": 3000,
    "amount_weekend": 4000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "9d12ff19-e6d8-49f4-b045-8dacc3bda94b",
    "category_id": "be162d61-1be6-451f-b3b7-7486b4258303",
    "name": "Sound System",
    "description": "Additional PA sound system",
    "icon": "🔊",
    "pricing_model": "flat_fee",
    "amount_weekday": 2500,
    "amount_weekend": 3500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "fac71659-0589-4eb3-93a9-0dfdb630f01e",
    "category_id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Photographer",
    "description": "Professional event photographer (4 hours)",
    "icon": "📸",
    "pricing_model": "flat_fee",
    "amount_weekday": 3500,
    "amount_weekend": 5000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "0447cb22-9054-4bd3-b36d-ba7a68aa9838",
    "category_id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Videographer",
    "description": "Professional event videography",
    "icon": "🎥",
    "pricing_model": "flat_fee",
    "amount_weekday": 5000,
    "amount_weekend": 7000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "6fb689bd-fb0f-474e-ba03-ad81e5849758",
    "category_id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Security",
    "description": "Professional security personnel (per guard)",
    "icon": "🛡️",
    "pricing_model": "per_person",
    "amount_weekday": 500,
    "amount_weekend": 700,
    "max_quantity": 10,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "a6c2eb7b-56e7-44d2-ac41-e0e8006f7c50",
    "category_id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Cleaning",
    "description": "Post-event deep cleaning service",
    "icon": "🧹",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "3be823bd-dae7-4132-94b8-5167553d3e6b",
    "category_id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Parking Attendant",
    "description": "Valet parking attendant",
    "icon": "🅿️",
    "pricing_model": "per_person",
    "amount_weekday": 400,
    "amount_weekend": 500,
    "max_quantity": 6,
    "is_active": true,
    "sort_order": 5,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "c1c40fb0-1109-46b2-b17a-f908696d9d11",
    "category_id": "3c786a68-3998-4b97-a848-c1b8731438bb",
    "name": "Kids Area",
    "description": "Supervised kids play area with activities",
    "icon": "🎪",
    "pricing_model": "flat_fee",
    "amount_weekday": 2000,
    "amount_weekend": 3000,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "e42e65fa-dfbb-4c67-9ee2-778d76c7a064",
    "category_id": "3c786a68-3998-4b97-a848-c1b8731438bb",
    "name": "Face Painting",
    "description": "Professional face painter for children",
    "icon": "🎨",
    "pricing_model": "flat_fee",
    "amount_weekday": 1500,
    "amount_weekend": 2000,
    "max_quantity": 2,
    "is_active": true,
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "f9f206ab-d790-4ec3-bfdf-db9fc3b8a6d4",
    "category_id": "3c786a68-3998-4b97-a848-c1b8731438bb",
    "name": "Jumping Castle",
    "description": "Inflatable jumping castle",
    "icon": "🏰",
    "pricing_model": "flat_fee",
    "amount_weekday": 2500,
    "amount_weekend": 3500,
    "max_quantity": 1,
    "is_active": true,
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- addon_categories (6 rows)
[
  {
    "id": "fc18c78a-6914-435c-9114-1da99e3fe085",
    "name": "Entertainment",
    "slug": "entertainment",
    "description": "Music, performances, and activities",
    "sort_order": 1,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "9dd6459f-df8d-4447-8284-b1aebd36d2ee",
    "name": "Decor & Design",
    "slug": "decor",
    "description": "Decoration, flowers, and styling",
    "sort_order": 2,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "044288d2-1e70-4b9a-b8dc-a2648a713918",
    "name": "Catering Extras",
    "slug": "catering-extras",
    "description": "Additional food and beverage options",
    "sort_order": 3,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "be162d61-1be6-451f-b3b7-7486b4258303",
    "name": "Equipment & Tech",
    "slug": "equipment",
    "description": "Technical equipment and rentals",
    "sort_order": 4,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "32233709-c054-45a9-b52b-0cc42ff0da3d",
    "name": "Services",
    "slug": "services",
    "description": "Additional service staff and coordination",
    "sort_order": 5,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "3c786a68-3998-4b97-a848-c1b8731438bb",
    "name": "Kids & Family",
    "slug": "kids",
    "description": "Children's activities and facilities",
    "sort_order": 6,
    "created_at": "2026-07-24T11:31:44.537439+00:00"
  }
]

-- site_settings (9 rows)
[
  {
    "id": "474aa370-c417-48d9-a7cf-843d3ebec49b",
    "key": "booking:tax_rate",
    "value": "0",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "ef25ed21-d636-444f-8a43-f1826868b2c7",
    "key": "booking:quote_validity_days",
    "value": "7",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "a60bc77f-00c8-41ee-9acd-7bd70715c50f",
    "key": "booking:min_advance_days",
    "value": "1",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "d4663191-89a1-4d90-9836-7d63db319fb6",
    "key": "booking:max_advance_days",
    "value": "365",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "38fed9e5-839a-49ae-b00d-9bbefa3c0922",
    "key": "booking:enabled",
    "value": "true",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "213ee919-a204-4020-8310-e6fc5226352f",
    "key": "booking:auto_confirm",
    "value": "true",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "43602714-47fd-4b5f-ab1a-2f1a04def02c",
    "key": "booking:business_hours_start",
    "value": "08:00",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "15d47084-9cc5-43ac-9f00-8b09a974ec02",
    "key": "booking:business_hours_end",
    "value": "22:00",
    "updated_at": "2026-07-24T11:31:44.537439+00:00"
  },
  {
    "id": "73804813-1586-459d-a828-12192ead6667",
    "key": "booking:deposit_percentage",
    "value": "\"50\"",
    "updated_at": "2026-07-25T12:48:25.772+00:00"
  }
]

