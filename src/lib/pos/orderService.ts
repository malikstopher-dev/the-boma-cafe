import { getAdminClient } from '@/lib/supabase'
import { getMenuItemsByIds, type DbMenuItem } from '@/lib/menu-prices'
import type { EnrichedItem, OrderItemInput, OrderRecord, OrderStatus, Station, OrderEventType, OrderSplitResult } from './types'

const MIN_TOTAL = 1
const MAX_TOTAL = 99999

interface BarDbItem {
  id: string
  name: string
  single_price: number | null
  bottle: number | null
  glass_price: number | null
  shot_price: number | null
  price: number | null
}

/**
 * Returns the names of any alcoholic bar items in the given order items.
 * Empty array = no alcohol present (order may proceed).
 * Uses is_alcohol when the column exists; falls back to false if not.
 */
export async function getAlcoholItemNames(items: { bar_item_id?: string; menu_item_id?: string; station?: string }[]): Promise<string[]> {
  const barIds = items
    .filter(i => i.station === 'bar' || !!i.bar_item_id)
    .map(i => i.bar_item_id || i.menu_item_id)
    .filter((v): v is string => !!v)
  if (barIds.length === 0) return []
  try {
    const { data, error } = await getAdminClient()
      .from('bar_items')
      .select('id, name, is_alcohol')
      .in('id', barIds)
    if (error) return []
    return (data || [])
      .filter(r => r.is_alcohol === true)
      .map(r => r.name)
  } catch {
    return []
  }
}

async function getBarItemsByIds(ids: string[]): Promise<Map<string, BarDbItem>> {
  const result = new Map<string, BarDbItem>()
  if (ids.length === 0) return result
  try {
    const { data, error } = await getAdminClient()
      .from('bar_items')
      .select('id, name, single_price, bottle, glass_price, shot_price, price')
      .in('id', ids)
    if (!error && data) {
      for (const item of data) result.set(item.id, item)
    }
  } catch { /* ignore */ }
  return result
}

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
      if (match) return { price: Number(match.price), matched: true }
      return { price: -1, matched: false }
    } catch { /* malformed sizes JSON */ }
  }

  return { price: basePrice, matched: false }
}

function resolveBarSizePrice(
  barItem: BarDbItem,
  selectedSize?: string,
): { price: number; matched: boolean } {
  if (selectedSize === 'single' && barItem.single_price != null) return { price: Number(barItem.single_price), matched: true }
  if (selectedSize === 'bottle' && barItem.bottle != null) return { price: Number(barItem.bottle), matched: true }
  if (selectedSize === 'glass' && barItem.glass_price != null) return { price: Number(barItem.glass_price), matched: true }
  if (selectedSize === 'shot' && barItem.shot_price != null) return { price: Number(barItem.shot_price), matched: true }
  if (barItem.single_price != null) return { price: Number(barItem.single_price), matched: false }
  if (barItem.price != null) return { price: Number(barItem.price), matched: false }
  return { price: -1, matched: false }
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
        return match ? { name: match.name, price: Number(match.price) } : null
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

  // Look up in the food menu (menu_items): kitchen items plus cocktail-style
  // items that live in the food menu but carry station:"bar".
  const foodIds = items
    .filter(i => i.menu_item_id && (i.station !== 'bar' || !i.bar_item_id))
    .map(i => i.menu_item_id!)
  // bar_items lookup only applies when a real bar_item_id is supplied.
  const barIds = items
    .filter(i => i.station === 'bar' && i.bar_item_id)
    .map(i => i.bar_item_id!)
  const [menuMap, barMap] = await Promise.all([
    foodIds.length > 0 ? getMenuItemsByIds(foodIds) : Promise.resolve(new Map<string, DbMenuItem>()),
    barIds.length > 0 ? getBarItemsByIds(barIds) : Promise.resolve(new Map<string, BarDbItem>()),
  ])

  for (const item of items) {
    if (item.station === 'bar') {
      // A real bar_item_id resolves via bar_items (single/bottle/glass/shot pricing).
      const barRow = item.bar_item_id ? barMap.get(item.bar_item_id) : undefined
      if (barRow) {
        const { price: itemPrice, matched: sizeMatched } = resolveBarSizePrice(barRow, item.selected_size)
        if (itemPrice < 0) {
          return { enriched: [], total: 0, error: `Invalid price for bar item: ${barRow.name}` }
        }
        const linePrice = itemPrice
        const subtotal = linePrice * item.quantity
        enriched.push({
          menu_item_id: barRow.id,
          name: barRow.name,
          price: linePrice,
          quantity: item.quantity,
          subtotal,
          station: 'bar',
          ...(sizeMatched && item.selected_size ? { selected_size: { name: item.selected_size, price: itemPrice } } : {}),
          ...(item.notes ? { notes: item.notes } : {}),
        })
        total += subtotal
        continue
      }

      // No bar_item_id (or not in bar_items): this is a food-menu item whose
      // station is "bar" (e.g. a cocktail in menu_items). Enrich via the food
      // menu but keep station:"bar" so it routes to the bar station.
      const menuRow = item.menu_item_id ? menuMap.get(item.menu_item_id) : undefined
      if (menuRow) {
        const { price: itemPrice, matched: sizeMatched } = resolveSizePrice(menuRow, item.selected_size)
        if (itemPrice < 0) {
          const reason = item.selected_size
            ? `Size "${item.selected_size}" not found for item: ${menuRow.name}`
            : `Invalid price for item: ${menuRow.name}`
          return { enriched: [], total: 0, error: reason }
        }
        const resolvedAddOns = resolveAddOnPrices(menuRow, item.selected_add_ons)
        const addOnTotal = resolvedAddOns.reduce((s, a) => s + a.price, 0)
        const linePrice = itemPrice + addOnTotal
        const subtotal = linePrice * item.quantity
        enriched.push({
          menu_item_id: menuRow.id,
          name: menuRow.name,
          price: linePrice,
          quantity: item.quantity,
          subtotal,
          station: 'bar',
          ...(sizeMatched && item.selected_size ? { selected_size: { name: item.selected_size, price: itemPrice } } : {}),
          ...(resolvedAddOns.length > 0 ? { selected_add_ons: resolvedAddOns } : {}),
          ...(item.notes ? { notes: item.notes } : {}),
        })
        total += subtotal
        continue
      }

      return { enriched: [], total: 0, error: `Bar item not found: ${item.menu_item_id ?? item.bar_item_id}` }
    } else {
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
        station: 'kitchen',
        ...(sizeMatched && item.selected_size ? { selected_size: { name: item.selected_size, price: itemPrice } } : {}),
        ...(resolvedAddOns.length > 0 ? { selected_add_ons: resolvedAddOns } : {}),
        ...(item.notes ? { notes: item.notes } : {}),
      })
      total += subtotal
    }
  }

  return { enriched, total: Math.round(total * 100) / 100, error: null }
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`
}

async function generateOrderRef(): Promise<string> {
  const now = new Date()
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '')

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const { count, error } = await getAdminClient()
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())

  const seq = ((count ?? 0) + 1).toString().padStart(3, '0')
  return `${yyyymmdd}-${seq}`
}

export function splitItemsByStation(input: CreateOrderInputType): OrderSplitResult {
  const kitchenItems = input.items.filter(i => i.station !== 'bar')
  const barItems = input.items.filter(i => i.station === 'bar')
  const result: OrderSplitResult = {}
  if (kitchenItems.length > 0) {
    result.kitchen = { ...input, items: kitchenItems }
  }
  if (barItems.length > 0) {
    result.bar = { ...input, items: barItems }
  }
  return result
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

export type CreateOrderInputType = {
  customer_name: string
  phone: string
  order_type: string
  requested_time?: string
  items: OrderItemInput[]
  idempotency_key?: string
  table_number?: string
  delivery_address?: string
  waiter_name?: string
  created_by?: string
  order_notes?: string
  station?: Station
  parent_order_id?: string
}

export type CreateOrderResult = {
  order: OrderRecord | null
  duplicate: boolean
  error: string | null
}

export async function createOrder(input: CreateOrderInputType): Promise<CreateOrderResult> {
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
    notes: i.notes,
    station: i.station,
    bar_item_id: i.bar_item_id,
  }))

  // ── Server-authoritative pricing ───────────────────────────
  const { enriched, total, error: enrichError } = await enrichItems(parsedItems)
  if (enrichError) {
    return { order: null, duplicate: false, error: enrichError }
  }

  if (total < MIN_TOTAL || total > MAX_TOTAL) {
    return { order: null, duplicate: false, error: 'Invalid total' }
  }

  const metadata: Record<string, any> = {}
  if (input.order_notes) {
    metadata.orderNotes = input.order_notes
  }
  const items_json = JSON.stringify({ items: enriched, metadata })
  const order_ref = await generateOrderRef()

  const ORDER_TYPE_NORMALIZATIONS: Record<string, string> = {
    'dine-in': 'dine-in', 'dinein': 'dine-in', 'dine in': 'dine-in', 'dine_in': 'dine-in', 'dine': 'dine-in',
    'pickup': 'pickup', 'pick-up': 'pickup', 'pick up': 'pickup', 'takeaway': 'pickup', 'collection': 'pickup',
    'delivery': 'delivery', 'deliver': 'delivery',
  }
  const normalizedType = ORDER_TYPE_NORMALIZATIONS[String(input.order_type || '').trim().toLowerCase()] || input.order_type

  // ── Build insert payload (ONLY known columns, NO raw passthrough) ──
  const insertPayload: Record<string, unknown> = {
    customer_name: input.customer_name.trim(),
    phone: input.phone?.trim() || '',
    order_type: normalizedType,
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

  if (input.station) {
    insertPayload.station = input.station
  } else if (enriched.some(i => i.station === 'bar')) {
    insertPayload.station = 'bar'
  } else {
    insertPayload.station = 'kitchen'
  }

  if (input.parent_order_id) {
    insertPayload.parent_order_id = input.parent_order_id
  }

  if (input.waiter_name) {
    insertPayload.waiter_name = input.waiter_name.trim()
    insertPayload.source = 'waiter'
  } else {
    insertPayload.source = 'online'
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
        created_by: input.created_by ?? 'system',
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

export async function getSiblingOrders(orderId: string): Promise<OrderRecord[]> {
  try {
    const { data: current } = await getAdminClient()
      .from('orders')
      .select('parent_order_id')
      .eq('id', orderId)
      .single()
    if (!current?.parent_order_id) return []
    const { data: siblings } = await getAdminClient()
      .from('orders')
      .select('*')
      .eq('parent_order_id', current.parent_order_id)
      .neq('id', orderId)
    return (siblings || []) as unknown as OrderRecord[]
  } catch {
    return []
  }
}

export async function splitAndCreateOrders(input: CreateOrderInputType): Promise<{
  orders: OrderRecord[]
  duplicate: boolean
  error: string | null
}> {
  const splits = splitItemsByStation(input)
  if (!splits.kitchen && !splits.bar) {
    return { orders: [], duplicate: false, error: 'No items to order' }
  }

  const orders: OrderRecord[] = []
  const baseKey = input.idempotency_key || generateIdempotencyKey()

  const firstSplit = splits.kitchen ?? splits.bar!
  const firstRes = await createOrder({ ...firstSplit, idempotency_key: `${baseKey}-first` })
  if (firstRes.error) return { orders: [], duplicate: firstRes.duplicate, error: firstRes.error }
  const first = firstRes.order!
  orders.push(first)

  const secondSplit = splits.kitchen && splits.bar
    ? (firstSplit === splits.kitchen ? splits.bar : splits.kitchen)
    : undefined

  if (secondSplit) {
    const secondRes = await createOrder({
      ...secondSplit,
      idempotency_key: `${baseKey}-second`,
      parent_order_id: first.id,
    })
    if (secondRes.error) {
      return { orders: [first], duplicate: false, error: `First order created (${first.order_ref}) but second failed: ${secondRes.error}` }
    }
    if (secondRes.order) orders.push(secondRes.order)
  }

  return { orders, duplicate: firstRes.duplicate, error: null }
}
