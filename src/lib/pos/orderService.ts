import { getAdminClient } from '@/lib/supabase'
import { getMenuItemsByIds, type DbMenuItem } from '@/lib/menu-prices'
import type { EnrichedItem, OrderItemInput, OrderRecord, OrderStatus, OrderEventType } from './types'

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

async function enrichItems(items: OrderItemInput[]): Promise<{
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

function generateIdempotencyKey(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`
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

interface Tracker { key: string; timestamp: number }

let recentSubmissions: Tracker[] = []

function isDuplicateSubmission(key: string): boolean {
  const now = Date.now()
  recentSubmissions = recentSubmissions.filter(s => now - s.timestamp < SUBMISSION_WINDOW_MS)
  const hit = recentSubmissions.find(s => s.key === key)
  if (hit) return true
  recentSubmissions.push({ key, timestamp: now })
  return false
}

async function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

export async function logOrderEvent(event: {
  order_id: string
  event_type: OrderEventType
  from_status?: string
  to_status?: string
  created_by?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await getAdminClient().from('order_events').insert([{
      order_id: event.order_id,
      event_type: event.event_type,
      from_status: event.from_status ?? null,
      to_status: event.to_status ?? null,
      created_by: event.created_by ?? 'system',
      metadata: event.metadata ?? {},
    }])
  } catch { /* non-critical — don't block the order */ }
}

export type CreateOrderResult = {
  order: OrderRecord | null
  duplicate: boolean
  error: string | null
}

export async function createOrder(input: {
  customer_name: string
  phone: string
  order_type: string
  requested_time?: string
  items: OrderItemInput[]
  idempotency_key?: string
  table_number?: string
  delivery_address?: string
}): Promise<CreateOrderResult> {
  const idempotencyKey = input.idempotency_key || generateIdempotencyKey()

  // ── In-memory dedup (same request within 5s window) ────────
  if (isDuplicateSubmission(idempotencyKey)) {
    return { order: null, duplicate: true, error: 'Duplicate submission detected — please wait' }
  }

  // ── DB idempotency check (column may be null, handle gracefully) ──
  try {
    const { data: existing } = await getAdminClient()
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return { order: existing as unknown as OrderRecord, duplicate: true, error: null }
    }
  } catch {
    // Column may not exist yet (schema cache delay) — continue
  }

  // ── Normalize items ────────────────────────────────────────
  const parsedItems: OrderItemInput[] = input.items.map((i: any) => ({
    menu_item_id: i.menu_item_id || i.id,
    quantity: i.quantity ?? 1,
    selected_size: i.selected_size,
    selected_add_ons: i.selected_add_ons,
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

  // ── Build insert payload (ONLY known columns, NO raw passthrough) ──
  const insertPayload: Record<string, unknown> = {
    customer_name: input.customer_name.trim(),
    phone: input.phone.trim(),
    order_type: input.order_type,
    requested_time: input.requested_time || 'ASAP',
    items_json,
    total,
    status: 'pending' as OrderStatus,
    order_ref,
    idempotency_key: idempotencyKey,
  }

  if (input.table_number) {
    insertPayload.table_number = input.table_number.trim()
  }

  if (input.delivery_address) {
    insertPayload.delivery_address = input.delivery_address.trim()
  }

  // ── Insert with retry (handles schema cache delays) ────────
  const MAX_ATTEMPTS = 3
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await wait(1000 * attempt)
    }

    const payload = attempt > 0
      ? { ...insertPayload, order_ref: await generateOrderRef() }
      : insertPayload

    const { data, error } = await getAdminClient()
      .from('orders')
      .insert([payload])
      .select()
      .single()

    if (!error && data) {
      logOrderEvent({
        order_id: data.id,
        event_type: 'ORDER_CREATED',
        to_status: 'pending',
        created_by: 'system',
        metadata: { order_ref: data.order_ref, total },
      })
      return { order: data as unknown as OrderRecord, duplicate: false, error: null }
    }

    if (error) {
      const msg = (error.message ?? '').toLowerCase()

      // Schema cache delay — column not yet visible
      if (msg.includes('column') && msg.includes('does not exist')) {
        continue
      }

      // Duplicate key — return existing
      if (msg.includes('duplicate') || msg.includes('unique')) {
        try {
          const { data: dup } = await getAdminClient()
            .from('orders')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle()
          if (dup) {
            return { order: dup as unknown as OrderRecord, duplicate: true, error: null }
          }
        } catch { /* ignore */ }
        continue
      }

      if (attempt === MAX_ATTEMPTS - 1) {
        return { order: null, duplicate: false, error: error.message || 'Failed to create order' }
      }
    }
  }

  return { order: null, duplicate: false, error: 'Failed to create order after retries' }
}
