export type OrderType = 'pickup' | 'delivery' | 'dine-in'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'

export interface OrderItemInput {
  menu_item_id: string
  quantity: number
  selected_size?: string
  selected_add_ons?: string[]
}

export interface EnrichedItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  subtotal: number
  selected_size?: { name: string; price: number }
  selected_add_ons?: { name: string; price: number }[]
}

export interface CreateOrderInput {
  customer_name: string
  phone: string
  order_type: OrderType
  requested_time?: string
  items: OrderItemInput[]
  idempotency_key?: string
  table_number?: string
  delivery_address?: string
}

export const ALLOWED_ORDER_FIELDS = new Set([
  'customer_name', 'phone', 'order_type', 'requested_time', 'items',
  'idempotency_key', 'table_number', 'delivery_address',
])

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface OrderRecord {
  id: string
  order_ref: string
  customer_name: string
  phone: string
  order_type: OrderType
  requested_time: string
  items_json: string
  total: number
  status: OrderStatus
  created_at: string
  table_number?: string
  delivery_address?: string
  idempotency_key?: string
}
