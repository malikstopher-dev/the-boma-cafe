export type OrderType = 'pickup' | 'delivery' | 'dine-in'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'

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
