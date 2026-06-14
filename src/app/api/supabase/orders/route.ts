import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAnyRole } from '@/lib/auth'
import { canTransition } from '@/lib/order-state-machine'
import { checkRateLimit } from '@/lib/rate-limit'
import { getMenuItemsByIds, extractBaseItemId, type DbMenuItem } from '@/lib/menu-prices'

const VALID_ORDER_TYPES = ['pickup', 'delivery', 'dine-in']

const ALLOWED_PATCH_FIELDS = new Set([
  'customer_name', 'phone', 'order_type', 'requested_time', 'status',
  'items_json', 'table_number', 'delivery_address',
])

const MAX_TOTAL = 99999
const MIN_TOTAL = 1

async function generateOrderRef(): Promise<string> {
  const now = new Date()
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '')
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  const random = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `BOMA-${yymmdd}-${random}`
}

interface OrderItemInput {
  id: string
  quantity: number
  notes?: string
  selectedSize?: { name: string }
  selectedAddOns?: { name: string }[]
}

interface EnrichedItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  notes: string
  selectedSize?: { name: string; price: number }
  selectedAddOns?: { name: string; price: number }[]
}

function resolveSizePrice(dbItem: DbMenuItem, selectedSize?: { name: string }): { price: number; matched: boolean } {
  const basePrice = parseFloat(dbItem.price ?? '0')
  if (isNaN(basePrice) || basePrice < 0) return { price: -1, matched: false }

  if (selectedSize && dbItem.sizes) {
    try {
      const sizes: { name: string; price: number }[] = JSON.parse(dbItem.sizes)
      const match = sizes.find((s) => s.name === selectedSize.name)
      if (match) return { price: match.price, matched: true }
      return { price: -1, matched: false }
    } catch { /* malformed sizes JSON */ }
  }

  return { price: basePrice, matched: false }
}

function resolveAddOnPrices(dbItem: DbMenuItem, selectedAddOns?: { name: string }[]): { name: string; price: number }[] {
  if (!selectedAddOns || !dbItem.add_ons) return []
  try {
    const dbAddOns: { name: string; price: number }[] = JSON.parse(dbItem.add_ons)
    return selectedAddOns
      .map((s) => {
        const match = dbAddOns.find((a) => a.name === s.name)
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

  const itemIds = Array.from(new Set(items.map(i => i.id)))
  const menuMap = await getMenuItemsByIds(itemIds)

  for (const item of items) {
    const baseId = extractBaseItemId(item.id)
    const row = baseId ? menuMap.get(baseId) : undefined

    if (!row) {
      return { enriched: [], total: 0, error: `Menu item not found: ${item.id}` }
    }

    const { price: itemPrice, matched: sizeMatched } = resolveSizePrice(row, item.selectedSize)
    if (itemPrice < 0) {
      const reason = item.selectedSize ? `Size "${item.selectedSize.name}" not found for item: ${row.name}` : `Invalid price for item: ${row.name}`
      return { enriched: [], total: 0, error: reason }
    }

    const resolvedAddOns = resolveAddOnPrices(row, item.selectedAddOns)
    const addOnTotal = resolvedAddOns.reduce((s, a) => s + a.price, 0)
    const lineTotal = (itemPrice + addOnTotal) * item.quantity

    enriched.push({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      price: itemPrice + addOnTotal,
      quantity: item.quantity,
      notes: item.notes ?? '',
      ...(sizeMatched && item.selectedSize ? { selectedSize: { name: item.selectedSize.name, price: itemPrice } } : {}),
      ...(resolvedAddOns.length > 0 ? { selectedAddOns: resolvedAddOns } : {}),
    })

    total += lineTotal
  }

  return { enriched, total: Math.round(total * 100) / 100, error: null }
}

export async function GET(request: NextRequest) {
  const authError = await requireAnyRole(['admin', 'kitchen'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const orderRef = searchParams.get('order_ref')

  if (orderRef) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('order_ref, customer_name, total, status, created_at')
      .eq('order_ref', orderRef)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`order:${ip}`)) {
      console.error(`order rate limited: ${ip}`)
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const bodyKeys = Object.keys(body)
    console.error(`order body keys: [${bodyKeys.join(', ')}]`)

    const { customer_name, phone, order_type, requested_time, items, metadata, table_number, delivery_address } = body
    const rawItems = items ?? body.items_json

    if (!customer_name || !phone || !order_type || !rawItems) {
      console.error('order missing fields:', {
        hasCustomerName: !!customer_name,
        hasPhone: !!phone,
        hasOrderType: !!order_type,
        hasRawItems: !!rawItems,
        rawItemsType: typeof rawItems,
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_ORDER_TYPES.includes(order_type)) {
      console.error('order invalid type:', order_type)
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    // Order-type-specific validation
    if (order_type === 'dine-in' && !table_number) {
      return NextResponse.json({ error: 'Table number required for dine-in orders' }, { status: 400 })
    }
    if (order_type === 'delivery' && !delivery_address) {
      return NextResponse.json({ error: 'Delivery address required for delivery orders' }, { status: 400 })
    }

    // Parse items from either new format (items[]) or legacy (items_json string)
    let parsedItems: OrderItemInput[]
    let parsedMetadata: Record<string, unknown> = metadata ?? {}

    if (Array.isArray(rawItems)) {
      console.error(`order items array (${rawItems.length} items)`)
      parsedItems = rawItems
    } else if (typeof rawItems === 'string') {
      console.error(`order items_json string (${rawItems.length} chars)`)
      try {
        const legacy = JSON.parse(rawItems)
        const legacyItems = Array.isArray(legacy) ? legacy : legacy.items ?? []
        console.error(`order parsed legacy items: ${legacyItems.length} items`)
        parsedItems = legacyItems.map((i: any) => ({
          id: i.id,
          quantity: i.quantity ?? 1,
          notes: i.notes ?? '',
          ...(i.selectedSize ? { selectedSize: typeof i.selectedSize === 'string' ? { name: i.selectedSize } : { name: i.selectedSize.name } } : {}),
          ...(i.selectedAddOns && i.selectedAddOns.length > 0 ? { selectedAddOns: i.selectedAddOns.map((a: any) => typeof a === 'string' ? { name: a } : { name: a.name }) } : {}),
        }))
        const legacyMeta = legacy.metadata
        if (legacyMeta) parsedMetadata = { ...parsedMetadata, ...legacyMeta }
      } catch (parseErr) {
        console.error('order items_json parse error:', (parseErr as Error)?.message ?? parseErr)
        return NextResponse.json({ error: 'Invalid items format' }, { status: 400 })
      }
    } else {
      console.error('order rawItems is neither array nor string:', typeof rawItems)
      return NextResponse.json({ error: 'Items must be an array or JSON string' }, { status: 400 })
    }

    if (parsedItems.length === 0) {
      console.error('order parsedItems empty')
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 })
    }

    for (const item of parsedItems) {
      if (!item.id || typeof item.quantity !== 'number' || item.quantity < 1) {
        console.error('order item validation failed:', { id: item.id, quantity: item.quantity, quantityType: typeof item.quantity })
        return NextResponse.json({ error: 'Each item must have id and quantity >= 1' }, { status: 400 })
      }
    }

    console.error('order enrichItems start')
    const { enriched, total, error: enrichError } = await enrichItems(parsedItems)
    if (enrichError) {
      console.error('order enrichItems error:', enrichError)
      return NextResponse.json({ error: enrichError }, { status: 400 })
    }
    console.error(`order enrichItems OK: ${enriched.length} items, total=${total}`)

    if (total < MIN_TOTAL || total > MAX_TOTAL) {
      return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
    }

    const items_json = JSON.stringify({
      items: enriched,
      metadata: parsedMetadata,
    })

    const order_ref = await generateOrderRef()

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([{
        customer_name, phone, order_type, requested_time,
        items_json, total,
        status: 'pending', order_ref,
        table_number: table_number || null,
        delivery_address: delivery_address || null,
      }])
      .select()
      .single()

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        const ref = await generateOrderRef()
        const { data: retry, error: retryError } = await supabaseAdmin
          .from('orders')
          .insert([{
            customer_name, phone, order_type, requested_time,
            items_json, total,
            status: 'pending', order_ref: ref,
            table_number: table_number || null,
            delivery_address: delivery_address || null,
          }])
          .select()
          .single()
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
        return NextResponse.json({ success: true, order: retry }, { status: 201 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, order: data }, { status: 201 })
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    console.error('order POST error:', msg, (err as Error)?.stack ?? '')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAnyRole(['admin', 'kitchen'])
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Whitelist: only allow specific fields
    const updateBody: Record<string, any> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        updateBody[key] = body[key]
      }
    }

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // items_json PATCH: only metadata merge allowed — never pricing
    if (updateBody.items_json) {
      try {
        const patched = JSON.parse(updateBody.items_json)
        const { data: existing } = await supabaseAdmin
          .from('orders')
          .select('items_json')
          .eq('id', id)
          .single()

        if (existing) {
          const current = JSON.parse(existing.items_json)
          const newItems = patched.items ?? current.items
          if (JSON.stringify(newItems) !== JSON.stringify(current.items)) {
            return NextResponse.json({ error: 'Cannot modify order items via PATCH' }, { status: 400 })
          }
          updateBody.items_json = JSON.stringify({
            items: current.items,
            metadata: { ...(current.metadata ?? {}), ...(patched.metadata ?? {}) },
          })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid items_json format' }, { status: 400 })
      }
    }

    let currentStatus: string | null = null
    if (updateBody.status) {
      const { data: fetched, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError || !fetched) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      currentStatus = fetched.status

      if (['completed', 'cancelled'].includes(currentStatus)) {
        return NextResponse.json({ error: `Cannot update a ${currentStatus} order` }, { status: 400 })
      }

      if (!canTransition(currentStatus as any, updateBody.status as any)) {
        if (updateBody.status !== 'cancelled') {
          return NextResponse.json({ error: `Invalid transition: ${currentStatus} → ${updateBody.status}` }, { status: 400 })
        }
      }

      if (updateBody.status === 'completed' && currentStatus === 'completed') {
        return NextResponse.json({ error: 'Order already completed' }, { status: 400 })
      }
    }

    let query = supabaseAdmin.from('orders').update(updateBody).eq('id', id)

    if (updateBody.status && currentStatus) {
      query = query.eq('status', currentStatus)
    }

    const { data: updated, error } = await query.select('id').maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (updateBody.status && !updated) {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAnyRole(['admin', 'kitchen'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
