import type { CreateOrderInput, OrderType, ValidationResult } from './types'

const VALID_ORDER_TYPES: OrderType[] = ['pickup', 'delivery', 'dine-in']

export function validateOrder(input: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = []

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'Request body is required' }] }
  }

  const body = input as Record<string, unknown>

  // ── customer_name ──────────────────────────────────────────
  if (!body.customer_name || typeof body.customer_name !== 'string' || !body.customer_name.trim()) {
    errors.push({ field: 'customer_name', message: 'Full name is required' })
  }

  // ── phone ──────────────────────────────────────────────────
  if (!body.phone || typeof body.phone !== 'string' || !body.phone.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' })
  } else if (!/^[\d\s+\-()]{7,20}$/.test(body.phone.trim())) {
    errors.push({ field: 'phone', message: 'Enter a valid phone number (7-20 digits)' })
  }

  // ── order_type ─────────────────────────────────────────────
  if (!body.order_type || typeof body.order_type !== 'string') {
    errors.push({ field: 'order_type', message: 'Select an order type' })
  } else if (!VALID_ORDER_TYPES.includes(body.order_type as OrderType)) {
    errors.push({ field: 'order_type', message: `Order type must be one of: ${VALID_ORDER_TYPES.join(', ')}` })
  }

  // ── Conditional: type-specific fields ──────────────────────
  if (body.order_type === 'dine-in') {
    if (!body.table_number || typeof body.table_number !== 'string' || !body.table_number.trim()) {
      errors.push({ field: 'table_number', message: 'Table number is required for dine-in orders' })
    }
  }

  if (body.order_type === 'delivery') {
    if (!body.delivery_address || typeof body.delivery_address !== 'string' || !body.delivery_address.trim()) {
      errors.push({ field: 'delivery_address', message: 'Delivery address is required for delivery orders' })
    }
  }

  // ── items ──────────────────────────────────────────────────
  if (!Array.isArray(body.items)) {
    errors.push({ field: 'items', message: 'At least one item is required' })
  } else if (body.items.length === 0) {
    errors.push({ field: 'items', message: 'Your cart is empty — add items before ordering' })
  } else {
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      if (!item || typeof item !== 'object') {
        errors.push({ field: `items[${i}]`, message: `Item at position ${i} is invalid` })
        continue
      }
      const it = item as Record<string, unknown>
      if (!it.menu_item_id || typeof it.menu_item_id !== 'string') {
        errors.push({ field: `items[${i}].menu_item_id`, message: `Item ${i + 1} is missing a menu item ID` })
      }
      if (typeof it.quantity !== 'number' || it.quantity < 1) {
        errors.push({ field: `items[${i}].quantity`, message: `Item ${i + 1} must have quantity of at least 1` })
      }
    }
  }

  // ── idempotency_key ────────────────────────────────────────
  if (body.idempotency_key && typeof body.idempotency_key !== 'string') {
    errors.push({ field: 'idempotency_key', message: 'Invalid idempotency key format' })
  }

  return { valid: errors.length === 0, errors }
}
