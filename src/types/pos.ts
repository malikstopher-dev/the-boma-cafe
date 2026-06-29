export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'packing' | 'ready' | 'completed' | 'cancelled'

export type PaymentMethod = 'cash' | 'card' | 'mobile'

export type PaymentStatus = 'pending' | 'paid' | 'refunded'

export type OrderType = 'pickup' | 'delivery' | 'dine-in'

export type TableStatus = 'empty' | 'occupied' | 'billing'

export interface TableInfo {
  tableNumber: number
  status: TableStatus
  currentOrderId?: string
  total: number
  customerName?: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
  notes?: string
  selectedSize?: { name: string; price: number }
  selectedAddOns?: { name: string; price: number }[]
}

export interface OrderMeta {
  tableNumber?: number
  paymentMethod?: PaymentMethod
  paymentStatus?: 'unpaid' | 'paid'
}

export interface SupabaseOrder {
  id: string
  order_ref: string | null
  customer_name: string
  phone: string
  order_type: string
  requested_time: string
  items_json: string
  total: number
  status: string
  payment_status: string
  payment_confirmed_at: string | null
  payment_confirmed_by: string | null
  waiter_name: string | null
  table_number: string | null
  created_at: string
  preparation_time_minutes: number | null
}

export function parseOrderItems(itemsJson: string): OrderItem[] {
  try {
    const parsed = JSON.parse(itemsJson)
    if (Array.isArray(parsed)) return parsed as OrderItem[]
    if (parsed && Array.isArray(parsed.items)) return parsed.items as OrderItem[]
    return []
  } catch {
    return []
  }
}

export function parseOrderMeta(itemsJson: string): OrderMeta {
  try {
    const parsed = JSON.parse(itemsJson)
    if (parsed && !Array.isArray(parsed) && parsed.metadata) {
      return parsed.metadata as OrderMeta
    }
  } catch { /* ignore */ }
  return {}
}

export function buildItemsJson(items: OrderItem[], meta?: OrderMeta): string {
  if (meta && (meta.tableNumber !== undefined || meta.paymentMethod || meta.paymentStatus)) {
    return JSON.stringify({ items, metadata: meta })
  }
  return JSON.stringify(items)
}

export function getOrderTableNumber(order: SupabaseOrder): number | undefined {
  if (order.table_number) {
    const n = parseInt(order.table_number)
    if (!isNaN(n)) return n
  }
  return parseOrderMeta(order.items_json).tableNumber
}

export function getPaymentStatus(order: SupabaseOrder): 'unpaid' | 'paid' | 'refunded' {
  if (order.payment_status === 'paid') return 'paid'
  if (order.payment_status === 'refunded') return 'refunded'
  return 'unpaid'
}

export function getPaymentMethod(order: SupabaseOrder): PaymentMethod | undefined {
  return parseOrderMeta(order.items_json).paymentMethod
}
