import { getAdminClient } from '@/lib/supabase'
import { getMenuItemsByIds, type DbMenuItem } from '@/lib/menu-prices'
import { generateOrderTrackingToken, hashOrderTrackingToken } from '@/lib/order-public-auth'
import type { EnrichedItem, OrderItemInput, OrderRecord, OrderStatus, Station, OrderEventType } from './types'

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

  // ── Server-authoritative station derivation ────────────────
  // The station is derived from item TYPE, never from the client payload:
  //   1. a resolvable bar_items row            -> 'bar'
  //   2. a menu_item in an is_bar category     -> 'bar' (cocktails that live
  //      on the food menu — migration 028 signal)
  //   3. any other resolved menu_item          -> 'kitchen'
  // A client-supplied `station` field is accepted for API compatibility but
  // is never trusted for routing or pricing.
  const foodIds = items
    .filter(i => i.menu_item_id)
    .map(i => i.menu_item_id!)
  const barIds = items
    .filter(i => i.bar_item_id)
    .map(i => i.bar_item_id!)
  const [menuMap, barMap] = await Promise.all([
    foodIds.length > 0 ? getMenuItemsByIds(foodIds) : Promise.resolve(new Map<string, DbMenuItem>()),
    barIds.length > 0 ? getBarItemsByIds(barIds) : Promise.resolve(new Map<string, BarDbItem>()),
  ])

  for (const item of items) {
    const barRow = item.bar_item_id ? barMap.get(item.bar_item_id) : undefined
    if (barRow) {
      // Real bar_items product -> BAR (single/bottle/glass/shot pricing).
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

    const menuRow = item.menu_item_id ? menuMap.get(item.menu_item_id) : undefined
    if (!menuRow) {
      // Preserve the legacy wording per missing-ID kind.
      if (item.bar_item_id) {
        return { enriched: [], total: 0, error: `Bar item not found: ${item.bar_item_id}` }
      }
      return { enriched: [], total: 0, error: `Menu item not found: ${item.menu_item_id ?? 'unknown'}` }
    }

    // Food-menu product -> kitchen, unless it sits in a bar category.
    const station: Station = menuRow.category_is_bar === true ? 'bar' : 'kitchen'
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
      station,
      ...(sizeMatched && item.selected_size ? { selected_size: { name: item.selected_size, price: itemPrice } } : {}),
      ...(resolvedAddOns.length > 0 ? { selected_add_ons: resolvedAddOns } : {}),
      ...(item.notes ? { notes: item.notes } : {}),
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
  trackingToken: string | null
}

function toOrderRecord(row: Record<string, unknown>): OrderRecord {
  const { tracking_token_hash: _trackingHash, ...safe } = row
  return safe as unknown as OrderRecord
}

export async function createOrder(
  input: CreateOrderInputType,
  precomputed?: { enriched: EnrichedItem[]; total: number; trackingToken?: string },
): Promise<CreateOrderResult> {
  const idempotencyKey = input.idempotency_key || generateIdempotencyKey()

  // ── In-memory dedup (same request within 5s window) ────────
  if (isDuplicateSubmission(idempotencyKey)) {
    return { order: null, duplicate: true, error: 'Duplicate submission detected — please wait', trackingToken: null }
  }

  // ── DB idempotency check (column may be null, handle gracefully) ──
  try {
    const { data: existing } = await getAdminClient()
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existing) {
      return { order: toOrderRecord(existing as unknown as Record<string, unknown>), duplicate: true, error: null, trackingToken: null }
    }
  } catch {
    // Column may not exist yet (schema cache delay) — continue
  }

  // ── Server-authoritative pricing + station derivation ─────
  // Split callers pass precomputed enrichment so mixed carts are priced and
  // station-derived exactly once; solo callers enrich here.
  let enriched: EnrichedItem[]
  let total: number
  if (precomputed) {
    enriched = precomputed.enriched
    total = precomputed.total
  } else {
    const parsedItems: OrderItemInput[] = input.items.map((i: any) => ({
      menu_item_id: i.menu_item_id || i.id,
      quantity: i.quantity ?? 1,
      selected_size: i.selected_size,
      selected_add_ons: i.selected_add_ons,
      notes: i.notes,
      station: i.station,
      bar_item_id: i.bar_item_id,
    }))
    const result = await enrichItems(parsedItems)
    if (result.error) {
      return { order: null, duplicate: false, error: result.error, trackingToken: null }
    }
    enriched = result.enriched
    total = result.total
  }

  if (total < MIN_TOTAL || total > MAX_TOTAL) {
    return { order: null, duplicate: false, error: 'Invalid total', trackingToken: null }
  }

  const metadata: Record<string, any> = {}
  if (input.order_notes) {
    metadata.orderNotes = input.order_notes
  }
  const items_json = JSON.stringify({ items: enriched, metadata })
  const order_ref = await generateOrderRef()
  const trackingToken = precomputed?.trackingToken ?? generateOrderTrackingToken()

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
    tracking_token_hash: hashOrderTrackingToken(trackingToken),
  }

  if (input.table_number) {
    insertPayload.table_number = input.table_number.trim()
  }

  if (input.delivery_address) {
    insertPayload.delivery_address = input.delivery_address.trim()
  }

  // Station is derived from the enriched item TYPES (bar_items row or bar
  // category) — the client-supplied station field is never trusted.
  if (enriched.some(i => i.station === 'bar')) {
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
      return {
        order: toOrderRecord(data as unknown as Record<string, unknown>),
        duplicate: false,
        error: null,
        trackingToken,
      }
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
            return {
              order: toOrderRecord(dup as unknown as Record<string, unknown>),
              duplicate: true,
              error: null,
              trackingToken: null,
            }
          }
        } catch { /* ignore */ }
        continue
      }

      if (attempt === MAX_ATTEMPTS - 1) {
        return { order: null, duplicate: false, error: error.message || 'Failed to create order', trackingToken: null }
      }
    }
  }

  return { order: null, duplicate: false, error: 'Failed to create order after retries', trackingToken: null }
}

export async function getSiblingOrders(orderId: string): Promise<OrderRecord[]> {
  try {
    const { data: current } = await getAdminClient()
      .from('orders')
      .select('id, parent_order_id')
      .eq('id', orderId)
      .single()
    if (!current) return []
    // Symmetric group resolution: children point at the root, but the root
    // itself has no parent — so the root is its own group id. Querying both
    // sides of the relationship returns the complete group from ANY member,
    // fixing the old asymmetric behavior (root saw no siblings).
    const row = current as unknown as { id: string; parent_order_id: string | null }
    const groupId = row.parent_order_id ?? row.id
    const { data: siblings } = await getAdminClient()
      .from('orders')
      .select('*')
      .or(`parent_order_id.eq.${groupId},id.eq.${groupId}`)
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
  trackingToken: string | null
}> {
  const baseKey = input.idempotency_key || generateIdempotencyKey()

  // Enrich ONCE with server-side station derivation, then split the ENRICHED
  // lines — a client-supplied item.station can no longer influence grouping.
  const parsedItems: OrderItemInput[] = input.items.map((i: any) => ({
    menu_item_id: i.menu_item_id || i.id,
    quantity: i.quantity ?? 1,
    selected_size: i.selected_size,
    selected_add_ons: i.selected_add_ons,
    notes: i.notes,
    station: i.station,
    bar_item_id: i.bar_item_id,
  }))
  const { enriched, error: enrichError } = await enrichItems(parsedItems)
  if (enrichError) {
    return { orders: [], duplicate: false, error: enrichError, trackingToken: null }
  }

  const kitchenItems = enriched.filter(i => i.station !== 'bar')
  const barItems = enriched.filter(i => i.station === 'bar')
  const parts: { items: EnrichedItem[]; total: number }[] = []
  if (kitchenItems.length > 0) {
    parts.push({ items: kitchenItems, total: Math.round(kitchenItems.reduce((s, i) => s + i.subtotal, 0) * 100) / 100 })
  }
  if (barItems.length > 0) {
    parts.push({ items: barItems, total: Math.round(barItems.reduce((s, i) => s + i.subtotal, 0) * 100) / 100 })
  }
  if (parts.length === 0) {
    return { orders: [], duplicate: false, error: 'No items to order', trackingToken: null }
  }

  const createdOrders: OrderRecord[] = []
  let firstId: string | null = null
  const trackingToken = generateOrderTrackingToken()

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx]!
    const res = await createOrder(
      {
        ...input,
        items: part.items as unknown as OrderItemInput[],
        idempotency_key: idx === 0 ? `${baseKey}-first` : `${baseKey}-second`,
        ...(idx > 0 && firstId ? { parent_order_id: firstId } : {}),
      },
      { enriched: part.items, total: part.total, trackingToken },
    )

    if (res.error || !res.order) {
      if (idx === 0) {
        return { orders: [], duplicate: res.duplicate, error: res.error ?? 'Failed to create order', trackingToken: null }
      }

      // ── Compensating rollback: supabase-js cannot wrap both inserts in one
      // transaction, so a second-station failure DELETES the already-created
      // first order (order_events cascade with it). The caller receives an
      // error and NO partial state survives. A brief order.created signal for
      // the rolled-back row may have fanned out; consumers refetch and simply
      // won't find it. If the rollback itself fails, surface it loudly rather
      // than pretending nothing happened.
      const rollbackIds: string[] = createdOrders.map(o => o.id)
      let rollbackOk = true
      for (const rid of rollbackIds) {
        try {
          const { error: delError } = await getAdminClient()
            .from('orders')
            .delete()
            .eq('id', rid)
          if (delError) {
            console.error(`[splitAndCreateOrders] rollback delete failed for ${rid}:`, delError.message)
            rollbackOk = false
          }
        } catch (delThrow) {
          console.error(`[splitAndCreateOrders] rollback delete threw for ${rid}:`, String(delThrow))
          rollbackOk = false
        }
      }

      return {
        orders: rollbackOk ? [] : createdOrders,
        duplicate: false,
        error: `First order created (${createdOrders[0]?.order_ref ?? ''}) but second failed${rollbackOk ? ' and was rolled back' : ' AND ROLLBACK FAILED — manual cleanup required'}: ${res.error}`,
        trackingToken: null,
      }
    }

    createdOrders.push(res.order)
    if (idx === 0) firstId = res.order.id
  }

  return { orders: createdOrders, duplicate: false, error: null, trackingToken }
}
