import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAuthenticated, requireAdmin, getRequestRole } from '@/lib/auth/requireRole'
import { canTransition, requiresPaymentConfirmation, paymentRequiredForTransition } from '@/lib/order-state-machine'
import { checkRateLimit, checkRateLimitByWaiter } from '@/lib/rate-limit'
import { validateOrder, sanitizeOrderInput } from '@/lib/pos/validateOrder'
import { createOrder, splitAndCreateOrders, getSiblingOrders, logOrderEvent, getAlcoholItemNames } from '@/lib/pos/orderService'
import type { OrderEventType } from '@/lib/pos/types'
import { notifyOrderCreated, notifyOrderConfirmed, notifyOrderRejected, notifyOrderPreparing, notifyOrderReady } from '@/lib/notifications/push'

export const dynamic = 'force-dynamic'

const ALLOWED_PATCH_FIELDS = new Set([
  'customer_name', 'phone', 'order_type', 'requested_time', 'status',
  'items_json', 'table_number', 'delivery_address',
  'payment_status', 'payment_confirmed_at', 'payment_confirmed_by',
  'waiter_name', 'payment_method', 'preparation_time_minutes',
  'cancellation_reason',
  'estimated_prep_minutes', 'prep_started_at', 'estimated_ready_at', 'actual_ready_at',
])

export async function GET(request: NextRequest) {
  const authError = await requireAuthenticated(request)
  if (authError) return authError

  const role = await getRequestRole(request)
  const isAdmin = role === 'admin'

  const { searchParams } = new URL(request.url)
  const orderRef = searchParams.get('order_ref')
  const waiterStats = searchParams.get('waiter_stats')

  if (waiterStats === 'true') {
    const { data, error } = await getAdminClient()
      .from('orders')
      .select('waiter_name')
      .not('waiter_name', 'is', null)
      .neq('waiter_name', '')

    if (error) return NextResponse.json({ error: 'Failed to process order request' }, { status: 500 })

    const counts: Record<string, number> = {}
    for (const row of data) {
      counts[row.waiter_name] = (counts[row.waiter_name] || 0) + 1
    }

    const result = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(result)
  }

  if (orderRef) {
    const { data, error } = await getAdminClient()
      .from('orders')
      .select('order_ref, customer_name, total, status, created_at')
      .eq('order_ref', orderRef)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed to process order request' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  // Sibling lookup: ?sibling_of=<id> returns all orders sharing the same parent_order_id
  const siblingOf = searchParams.get('sibling_of')
  if (siblingOf) {
    const { data: parent } = await getAdminClient()
      .from('orders')
      .select('parent_order_id')
      .eq('id', siblingOf)
      .maybeSingle()
    if (!parent?.parent_order_id) {
      return NextResponse.json({ orders: [] })
    }
    const { data: siblings, error: sibError } = await getAdminClient()
      .from('orders')
      .select(isAdmin ? '*' : 'id,order_ref,customer_name,status,created_at,items_json,order_type,payment_status,table_number,waiter_name,total,station,source,estimated_prep_minutes,estimated_ready_at,prep_started_at,parent_order_id,requested_time,preparation_time_minutes,cancellation_reason')
      .eq('parent_order_id', parent.parent_order_id)
    if (sibError) return NextResponse.json({ error: sibError.message }, { status: 500 })
    return NextResponse.json({ orders: siblings })
  }

  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
  const station = searchParams.get('station')
  const full = isAdmin && searchParams.get('full') === '1'

  // PII-safe columns: phone and delivery_address are admin-only.
  let baseColumns = 'id,order_ref,customer_name,status,created_at,items_json,order_type,payment_status,table_number,waiter_name,total,station,source,estimated_prep_minutes,estimated_ready_at,prep_started_at,parent_order_id,requested_time,preparation_time_minutes,cancellation_reason'
  if (isAdmin) {
    baseColumns = 'id,order_ref,customer_name,status,created_at,items_json,order_type,payment_status,table_number,waiter_name,total,station,source,estimated_prep_minutes,estimated_ready_at,prep_started_at,parent_order_id,delivery_address,requested_time,preparation_time_minutes,cancellation_reason,phone'
  }
  if (full) {
    baseColumns = '*'
  }

  let query = getAdminClient()
    .from('orders')
    .select(baseColumns, { count: (full || !station) ? 'exact' : 'estimated' })

  if (station === 'kitchen' || station === 'bar') {
    query = query.eq('station', station)
  } else if (station === 'none') {
    query = query.is('station', null)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[orders GET] query error:', { station, error: error.message, code: error.code })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[orders GET]', { station, count: data?.length ?? 0 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!await checkRateLimit(`order:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const raw = await request.json()

    // ── Sanitize: strip unknown fields before validation ──
    const body = sanitizeOrderInput(raw)

    // ── Auth check: waiter orders require valid waiter session ──
    const role = await getRequestRole(request)
    if (body.waiter_name) {
      if (role !== 'waiter') {
        // Public visitors cannot self-assign a waiter — silently drop it
        // (manager allocates a waiter on duty after approving the order)
        delete body.waiter_name
      } else if (!await checkRateLimitByWaiter(body.waiter_name as string)) {
        return NextResponse.json({ error: 'Too many requests (waiter)' }, { status: 429 })
      }
    }

    // ── Central validation ─────────────────────────────────
    const validation = validateOrder(body)
    if (!validation.valid) {
      const first = validation.errors[0]
      return NextResponse.json({
        error: first.message,
        fields: validation.errors,
      }, { status: 400 })
    }

    // ── Alcoholic beverages are dine-in only (law/regulation) ──
    if (body.order_type !== 'dine-in') {
      const alcoholNames = await getAlcoholItemNames((body.items || []) as any[])
      if (alcoholNames.length > 0) {
        return NextResponse.json({
          error: `Alcoholic beverages are available for dine-in orders only (${alcoholNames.join(', ')}). Please select dine-in or remove them.`,
          fields: [{ field: 'items', message: 'Alcoholic beverages are available for dine-in orders only' }],
        }, { status: 400 })
      }
    }

    // ── Process order (split by station if needed) ─────────
    const items = (body.items || []) as any[]
    const hasMixedStations = items.some((i: any) => i.station === 'bar') && items.some((i: any) => !i.station || i.station === 'kitchen')

    let order: any = null
    let duplicate = false
    let error: string | null = null

    let orders: any[] = []
    if (hasMixedStations) {
      const result = await splitAndCreateOrders({ ...body as any, created_by: role ?? undefined })
      orders = result.orders
      order = result.orders[0] ?? null
      duplicate = result.duplicate
      error = result.error
      // Notify for each created order
      for (const o of result.orders) {
        if (o?.order_ref) {
          const r = await getRequestRole(request)
          const s = (o as any).source || 'online'
          const station = (o as any).station || undefined
          notifyOrderCreated(o.order_ref, r || 'admin', s, station).catch(() => {})
        }
      }
    } else {
      const result = await createOrder({ ...body as any, created_by: role ?? undefined })
      order = result.order
      duplicate = result.duplicate
      error = result.error
      if (order?.order_ref) {
        const r = await getRequestRole(request)
        const s = (order as any).source || 'online'
        const station = (order as any).station || undefined
        notifyOrderCreated(order.order_ref, r || 'admin', s, station).catch(() => {})
      }
      if (order) orders = [order]
    }

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order,
      orders,
      duplicate,
      ...(hasMixedStations ? { split: true } : {}),
    }, { status: duplicate ? 200 : 201 })
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    console.error('order POST error:', msg)
    // Surface known, actionable errors; sanitize everything else.
    const KNOWN_ERROR_PATTERNS = [
      'not found',
      'invalid price',
      'size "',
      'no items to order',
      'failed to create order after retries',
      'first order created',
      'duplicate submission',
    ]
    const isKnown = KNOWN_ERROR_PATTERNS.some(p => msg.toLowerCase().includes(p))
    if (isKnown) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const role = await getRequestRole(request)
    if (!role) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    if (!['admin', 'kitchen', 'bar', 'waiter'].includes(role)) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const body = await request.json()

    // ── Waiter: status-only (mark served / complete) ──
    if (role === 'waiter') {
      if (Object.keys(body).some(k => k !== 'status')) {
        return NextResponse.json({ error: 'Waiters can only update status (mark served/complete)' }, { status: 403 })
      }
    }

    // ── Kitchen/Bar field-level restrictions ──
    if (role === 'kitchen' || role === 'bar') {
      if (body.payment_status) {
        return NextResponse.json({ error: `${role === 'bar' ? 'Bar' : 'Kitchen'} cannot modify payment status` }, { status: 403 })
      }
      const restrictedFields = ['customer_name', 'phone', 'order_type', 'delivery_address', 'waiter_name', 'table_number']
      for (const field of restrictedFields) {
        if (field in body) {
          return NextResponse.json({ error: `${role === 'bar' ? 'Bar' : 'Kitchen'} cannot modify order details` }, { status: 403 })
        }
      }
    }

    // ── Admin: enforce cancellation reason ──
    if (body.status === 'cancelled' && role === 'admin') {
      const reason = body.cancellation_reason?.trim()
      if (!reason || reason.length < 3) {
        return NextResponse.json({ error: 'Cancellation reason is required (min 3 characters)' }, { status: 400 })
      }
    }

    const updateBody: Record<string, any> = {}
    for (const key of Object.keys(body)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        updateBody[key] = body[key]
      }
    }

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    if (updateBody.items_json) {
      try {
        const patched = JSON.parse(updateBody.items_json)
        const { data: existing } = await getAdminClient()
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
    let currentOrderType: string | null = null
    let currentPaymentStatus: string | null = null
    let orderSource: string = 'online'
    let siblingPending = false
    let siblingStatus: { station: string; status: string }[] = []

    if (updateBody.status) {
      const { data: fetched, error: fetchError } = await getAdminClient()
        .from('orders')
        .select('status, order_type, payment_status, source')
        .eq('id', id)
        .single()

      if (fetchError || !fetched) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      currentStatus = fetched.status
      currentOrderType = fetched.order_type
      currentPaymentStatus = fetched.payment_status
      orderSource = fetched.source || 'online'

      if (['completed', 'cancelled'].includes(currentStatus)) {
        return NextResponse.json({ error: `Cannot update a ${currentStatus} order` }, { status: 400 })
      }

      // ── State machine guard ──
      const smRole = role
      if (!canTransition(currentStatus as any, updateBody.status as any, smRole, orderSource)) {
        return NextResponse.json({ error: `Invalid transition: ${currentStatus} → ${updateBody.status} for role ${smRole} on ${orderSource} order` }, { status: 400 })
      }

      if (updateBody.status === 'completed' && currentStatus === 'completed') {
        return NextResponse.json({ error: 'Order already completed' }, { status: 400 })
      }

      // ── Payment check (waiter orders skip entirely) ──
      if (
        orderSource !== 'waiter' &&
        currentStatus === 'pending' &&
        updateBody.status !== 'cancelled' &&
        updateBody.status !== 'rejected' &&
        currentPaymentStatus !== 'paid' &&
        !(updateBody.payment_status === 'paid') &&
        requiresPaymentConfirmation(currentOrderType ?? '', orderSource) &&
        paymentRequiredForTransition(updateBody.status)
      ) {
        return NextResponse.json({ error: 'Payment must be confirmed before dispatching this order.' }, { status: 400 })
      }

      // ── Auto-set prep time fields on status transitions ──
      if (updateBody.status === 'preparing' && currentStatus !== 'preparing') {
        if (!updateBody.prep_started_at) {
          updateBody.prep_started_at = new Date().toISOString()
        }
        if (updateBody.estimated_prep_minutes && !updateBody.estimated_ready_at) {
          const startTime = new Date(updateBody.prep_started_at).getTime()
          updateBody.estimated_ready_at = new Date(startTime + updateBody.estimated_prep_minutes * 60 * 1000).toISOString()
        }
      }
      if (updateBody.status === 'ready' && currentStatus !== 'ready') {
        if (!updateBody.actual_ready_at) {
          updateBody.actual_ready_at = new Date().toISOString()
        }
      }

      // ── Sibling check when marking ready/completed ──
      if (['ready', 'completed'].includes(updateBody.status)) {
        const siblings = await getSiblingOrders(id)
        if (siblings.length > 0) {
          siblingStatus = siblings.map((s: any) => ({ station: s.station || 'kitchen', status: s.status }))
          siblingPending = siblings.some((s: any) => !['ready', 'completed'].includes(s.status))
        }
      }
    }

    // ── Handle payment confirmation ──
    if (updateBody.payment_status === 'paid') {
      if (orderSource === 'waiter') {
        return NextResponse.json({ error: 'Cannot confirm payment for waiter orders' }, { status: 400 })
      }
      updateBody.payment_confirmed_at = new Date().toISOString()
      updateBody.payment_confirmed_by = role ?? 'admin'
    }

    let query = getAdminClient().from('orders').update(updateBody).eq('id', id)
    if (updateBody.status && currentStatus) {
      query = query.eq('status', currentStatus)
    }

    const { data: updated, error } = await query.select('id').maybeSingle()
    if (error) return NextResponse.json({ error: 'Failed to process order request' }, { status: 500 })
    if (updateBody.status && !updated) {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 })
    }

    // ── Log event on status change ──
    if (updated && updateBody.status && currentStatus && currentStatus !== updateBody.status) {
      const eventTypeMap: Record<string, OrderEventType> = {
        confirmed: 'ORDER_CONFIRMED',
        preparing: 'ORDER_PREPARING',
        packing: 'ORDER_PACKING',
        ready: 'ORDER_READY',
        served: 'ORDER_COMPLETED',
        completed: 'ORDER_COMPLETED',
        cancelled: 'ORDER_CANCELLED',
      }
      logOrderEvent({
        order_id: updated.id,
        event_type: eventTypeMap[updateBody.status] || 'ORDER_CREATED',
        from_status: currentStatus,
        to_status: updateBody.status,
        created_by: role ?? 'admin',
      })

      // Fire-and-forget push notification
      const { data: orderForNotification } = await getAdminClient()
        .from('orders')
        .select('order_ref')
        .eq('id', id)
        .single()
      const orderRef = orderForNotification?.order_ref || ''
      switch (updateBody.status) {
        case 'confirmed':
          notifyOrderConfirmed(orderRef).catch(() => {})
          break
        case 'rejected':
          notifyOrderRejected(orderRef).catch(() => {})
          break
        case 'preparing':
          notifyOrderPreparing(orderRef).catch(() => {})
          break
        case 'ready':
          notifyOrderReady(orderRef).catch(() => {})
          break
      }

      // ── Inventory: auto-deduct stock when order completes (non-blocking) ──
      if (updateBody.status === 'completed') {
        import('@/inventory/engine/order-items')
          .then(({ autoDeductCompletedOrder }) => autoDeductCompletedOrder(updated.id))
          .catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      ...(siblingStatus.length > 0 ? { siblingPending, siblings: siblingStatus } : {}),
    })
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    console.error('PATCH error:', msg)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Orders cannot be deleted for record-keeping purposes. Cancel the order instead.' }, { status: 403 })
}
