import { getAdminClient } from '@/lib/supabase'
import { getMenuItemsByIds, type DbMenuItem } from '@/lib/menu-prices'
import type { CreateOrderInput, EnrichedItem, OrderItemInput, OrderRecord, OrderType, OrderStatus } from './types'

const MIN_TOTAL = 1
const MAX_TOTAL = 99999

function resolveSizePrice(
  dbItem: DbMenuItem,
  selectedSize?: string,
): { price: number; matched: boolean } {
  const basePrice = parseFloat(dbItem.price ?? '0')
  if (isNaN(basePrice) || basePrice < 0) return { price: -1, matched: false }

  if (selectedSize && dbItem.sizes) {
    try {
      const sizes: { name: string; price: number }[] = JSON.parse(dbItem.sizes)
      const match = sizes.find((s) => s.name === selectedSize)
      if (match) return { price: match.price, matched: true }
      return { price: -1, matched: false }
    } catch { /* malformed sizes JSON */ }
  }

  return { price: basePrice, matched: false }
}

function resolveAddOnPrices(
  dbItem: DbMenuItem,
  selectedAddOns?: string[],
): { name: string; price: number }[] {
  if (!selectedAddOns || !dbItem.add_ons) return []
  try {
    const dbAddOns: { name: string; price: number }[] = JSON.parse(dbItem.add_ons)
    return selectedAddOns
      .map((name) => {
        const match = dbAddOns.find((a) => a.name === name)
        return match ? { name: match.name, price: match.price } : null
      })
      .filter(Boolean) as { name: string; price: number }[]
  } catch {
    return []
  }
}

export async function enrichItems(items: OrderItemInput[]): Promise<{
  enriched: EnrichedItem[]
  total: number
  error: string | null
}> {
  const enriched: EnrichedItem[] = []
  let total = 0

  const itemIds = Array.from(new Set(items.map(i => i.menu_item_id)))
  const menuMap = await getMenuItemsByIds(itemIds)

  for (const item of items) {
    const row = menuMap.get(item.menu_item_id)
    if (!row) {
      return { enriched: [], total: 0, error: `Menu item not found: ${item.menu_item_id}` }
    }

    const { price: itemPrice, matched: sizeMatched } = resolveSizePrice(row, item.selected_size)
    if (itemPrice < 0) {
      const reason = item.selected_size
        ? `Size "${item.selected_size}" not found for item: ${row.name}`
        : `Invalid price for item: ${row.name}`
      return { enriched: [], total: 0, error: reason }
    }

    const resolvedAddOns = resolveAddOnPrices(row, item.selected_add_ons)
    const addOnTotal = resolvedAddOns.reduce((s, a) => s + a.price, 0)
    const linePrice = itemPrice + addOnTotal
    const subtotal = linePrice * item.quantity

    enriched.push({
      menu_item_id: row.id,
      name: row.name,
      price: linePrice,
      quantity: item.quantity,
      subtotal,
      ...(sizeMatched && item.selected_size ? { selected_size: { name: item.selected_size, price: itemPrice } } : {}),
      ...(resolvedAddOns.length > 0 ? { selected_add_ons: resolvedAddOns } : {}),
    })

    total += subtotal
  }

  return { enriched, total: Math.round(total * 100) / 100, error: null }
}

async function generateOrderRef(): Promise<string> {
  const now = new Date()
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '')
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  const random = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `BOMA-${yymmdd}-${random}`
}

const SUBMISSION_WINDOW_MS = 5000

interface SubmissionTracker {
  key: string
  timestamp: number
}

let recentSubmissions: SubmissionTracker[] = []

function isDuplicateSubmission(input: CreateOrderInput): boolean {
  const now = Date.now()
  const key = input.idempotency_key || JSON.stringify({ name: input.customer_name, phone: input.phone, items: input.items })
  recentSubmissions = recentSubmissions.filter(s => now - s.timestamp < SUBMISSION_WINDOW_MS)
  const hit = recentSubmissions.find(s => s.key === key)
  if (hit) return true
  recentSubmissions.push({ key, timestamp: now })
  return false
}

export async function insertOrder(input: CreateOrderInput): Promise<{
  order: OrderRecord | null
  duplicate: boolean
  error: string | null
}> {
  // ── Dedup check (in-memory window) ─────────────────────────
  if (isDuplicateSubmission(input)) {
    return { order: null, duplicate: true, error: 'Duplicate submission detected — please wait' }
  }

  // ── Idempotency check (DB) ─────────────────────────────────
  if (input.idempotency_key) {
    const { data: existing } = await getAdminClient()
      .from('orders')
      .select('*')
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle()

    if (existing) {
      return { order: existing as unknown as OrderRecord, duplicate: true, error: null }
    }
  }

  // ── Normalize items ────────────────────────────────────────
  const parsedItems: OrderItemInput[] = input.items.map((i: any) => ({
    menu_item_id: i.menu_item_id || i.id,
    quantity: i.quantity ?? 1,
    selected_size: i.selected_size || (i.selectedSize ? (typeof i.selectedSize === 'string' ? i.selectedSize : i.selectedSize.name) : undefined),
    selected_add_ons: i.selected_add_ons || (i.selectedAddOns ? i.selectedAddOns.map((a: any) => typeof a === 'string' ? a : a.name) : undefined),
  }))

  // ── Server-authoritative pricing ───────────────────────────
  const { enriched, total, error: enrichError } = await enrichItems(parsedItems)
  if (enrichError) {
    return { order: null, duplicate: false, error: enrichError }
  }

  if (total < MIN_TOTAL || total > MAX_TOTAL) {
    return { order: null, duplicate: false, error: 'Invalid total' }
  }

  const items_json = JSON.stringify({ items: enriched, metadata: {} })
  const order_ref = await generateOrderRef()

  const insertPayload: Record<string, any> = {
    customer_name: input.customer_name.trim(),
    phone: input.phone.trim(),
    order_type: input.order_type,
    requested_time: input.requested_time || 'ASAP',
    items_json,
    total,
    status: 'pending' as OrderStatus,
    order_ref,
    ...(input.table_number ? { table_number: input.table_number.trim() } : {}),
    ...(input.delivery_address ? { delivery_address: input.delivery_address.trim() } : {}),
  }

  if (input.idempotency_key) {
    insertPayload.idempotency_key = input.idempotency_key
  }

  // ── Insert with retry on duplicate key ─────────────────────
  const MAX_RETRIES = 2
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, error } = await getAdminClient()
      .from('orders')
      .insert([attempt > 0 ? { ...insertPayload, order_ref: await generateOrderRef() } : insertPayload])
      .select()
      .single()

    if (!error && data) {
      return { order: data as unknown as OrderRecord, duplicate: false, error: null }
    }

    if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
      if (input.idempotency_key) {
        const { data: dup } = await getAdminClient()
          .from('orders')
          .select('*')
          .eq('idempotency_key', input.idempotency_key)
          .maybeSingle()
        if (dup) {
          return { order: dup as unknown as OrderRecord, duplicate: true, error: null }
        }
      }
      continue
    }

    if (attempt === MAX_RETRIES) {
      return { order: null, duplicate: false, error: error?.message || 'Failed to create order' }
    }
  }

  return { order: null, duplicate: false, error: 'Failed to create order after retries' }
}
