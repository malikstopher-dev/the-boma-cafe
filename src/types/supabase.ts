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
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  created_at: string
  table_number: string | null
  delivery_address: string | null
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
export type OrderStatus = Order['status']
