export interface Booking {
  id: string
  name: string
  phone: string
  email: string
  booking_date: string
  booking_time: string
  guests: number
  notes: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
}

export interface Order {
  id: string
  customer_name: string
  phone: string
  order_type: 'pickup' | 'delivery' | 'dine-in'
  requested_time: string
  items_json: string
  total: number
  status: OrderStatus
  created_at: string
  table_number: string | null
  delivery_address: string | null
  order_ref: string | null
  server_computed_total: number | null
  idempotency_key: string | null
  payment_status: string | null
  payment_confirmed_at: string | null
  payment_confirmed_by: string | null
  waiter_name: string | null
  preparation_time_minutes: number | null
  source: string | null
  created_by: string | null
  cancellation_reason: string | null
  station: 'kitchen' | 'bar' | null
  parent_order_id: string | null
}

export interface ContactMessage {
  id: string
  name: string
  phone: string | null
  email: string
  message: string
  created_at: string
}

export type BookingStatus = Booking['status']
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'packing' | 'ready' | 'served' | 'completed' | 'cancelled' | 'rejected'
