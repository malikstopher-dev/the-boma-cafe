// ============================================================
// Booking & Quotation System — TypeScript Types
// ============================================================

// --- Lookup / Config ---

export interface BookingType {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  min_guests: number
  max_guests: number
  min_duration_hours: number
  max_duration_hours: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Venue {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface VenueArea {
  id: string
  venue_id: string
  name: string
  description: string | null
  capacity_min: number
  capacity_max: number
  base_price_weekday: number
  base_price_weekend: number
  minimum_spend: number
  hourly_rate_weekday: number
  hourly_rate_weekend: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface FoodPackage {
  id: string
  name: string
  slug: string
  description: string | null
  per_person_weekday: number
  per_person_weekend: number
  child_price_weekday: number | null
  child_price_weekend: number | null
  child_multiplier: number | null
  min_guests: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DrinkPackage {
  id: string
  name: string
  slug: string
  description: string | null
  pricing_model: 'per_person' | 'flat_rate' | 'consumption'
  amount_weekday: number
  amount_weekend: number
  min_guests: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface AddonCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Addon {
  id: string
  category_id: string | null
  name: string
  description: string | null
  icon: string | null
  pricing_model: 'flat_fee' | 'per_person' | 'per_hour'
  amount_weekday: number
  amount_weekend: number
  max_quantity: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PricingRule {
  id: string
  name: string
  rule_type: 'day_of_week' | 'date_range' | 'month' | 'guest_count' | 'minimum_spend'
  rule_config: Record<string, unknown>
  multiplier: number
  priority: number
  is_active: boolean
  created_at: string
}

export interface BlockedDate {
  id: string
  venue_area_id: string | null
  start_date: string
  end_date: string
  reason: string | null
  is_recurring: boolean
  recurring_pattern: string | null
  created_at: string
}

// --- Customer ---

export interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  notes: string | null
  total_bookings: number
  total_spend: number
  created_at: string
  updated_at: string
}

// --- Extended Booking ---

export type BookingStatus =
  | 'draft'
  | 'quote_sent'
  | 'awaiting_deposit'
  | 'deposit_paid'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export type BookingSource = 'web' | 'admin' | 'phone' | 'email' | 'walk_in'

export interface Booking {
  id: string
  customer_id: string | null
  booking_type_id: string | null
  venue_area_id: string | null
  duration_hours: number | null
  adults: number | null
  children: number
  special_requests: string | null
  source: BookingSource
  quote_id: string | null
  // Legacy fields from original bookings table
  name: string
  phone: string
  email: string
  booking_date: string
  booking_time: string
  guests: number
  notes: string | null
  status: BookingStatus
  created_at: string
  // Joined relations
  booking_type?: BookingType
  venue_area?: VenueArea
  customer?: Customer
  quote?: Quote
}

// --- Quotation ---

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'expired'
  | 'converted'
  | 'cancelled'

export interface Quote {
  id: string
  booking_id: string
  quote_number: string
  status: QuoteStatus
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
  validity_days: number
  valid_until: string
  notes: string | null
  version: number
  created_at: string
  updated_at: string
  items?: QuoteItem[]
}

export type QuoteItemType =
  | 'venue_area'
  | 'food_package'
  | 'drink_package'
  | 'addon'
  | 'custom'

export interface QuoteItem {
  id: string
  quote_id: string
  item_type: QuoteItemType
  reference_id: string | null
  label: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  sort_order: number
  created_at: string
}

// --- Payments ---

export type PaymentType = 'deposit' | 'balance' | 'full' | 'refund'
export type PaymentMethod =
  | 'payfast'
  | 'ozow'
  | 'yoco'
  | 'stripe'
  | 'peach_payments'
  | 'cash'
  | 'card'
  | 'eft'
  | 'other'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'

export interface Payment {
  id: string
  booking_id: string
  quote_id: string | null
  amount: number
  payment_type: PaymentType
  payment_method: PaymentMethod | null
  status: PaymentStatus
  transaction_id: string | null
  gateway_response: Record<string, unknown> | null
  paid_at: string | null
  refunded_at: string | null
  notes: string | null
  created_at: string
}

// --- Booking Wizard ---

export interface BookingWizardState {
  step: number
  bookingType: BookingType | null
  date: string
  time: string
  duration: number
  adults: number
  children: number
  venueArea: VenueArea | null
  foodPackage: FoodPackage | null
  drinkPackage: DrinkPackage | null
  addons: Array<{ addon: Addon; quantity: number }>
  customer: {
    name: string
    phone: string
    email: string
    company: string
    specialRequests: string
  }
}

export interface QuotationBreakdown {
  line_items: Array<{
    label: string
    description: string | null
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
}

// --- Availability ---

export interface AvailabilitySlot {
  venue_area_id: string
  venue_area_name: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  guest_count: number
  capacity_max: number
}

export interface AvailabilityCheck {
  date: string
  venue_area_id: string
  is_available: boolean
  alternative_areas: string[]
  alternative_times: string[]
}

// --- Audit & Notifications ---

export interface BookingStatusHistory {
  id: string
  booking_id: string
  previous_status: string | null
  new_status: string
  changed_by: string
  changed_by_id: string | null
  reason: string | null
  created_at: string
}

export interface NotificationQueue {
  id: string
  recipient_type: 'customer' | 'admin' | 'manager' | 'staff'
  recipient_identifier: string
  notification_type:
    | 'quote_ready'
    | 'booking_confirmed'
    | 'deposit_received'
    | 'payment_failed'
    | 'booking_cancelled'
    | 'reminder'
    | 'balance_due'
    | 'admin_new_booking'
    | 'admin_deposit_received'
  template_data: Record<string, unknown>
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  sent_at: string | null
  error_message: string | null
  created_at: string
}

// --- Booking Settings (from site_settings) ---

export interface BookingSettings {
  deposit_percentage: number
  tax_rate: number
  quote_validity_days: number
  min_advance_days: number
  max_advance_days: number
  enabled: boolean
  auto_confirm: boolean
  business_hours_start: string
  business_hours_end: string
}