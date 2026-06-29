import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminOrKitchen, requireAdmin, getRequestRole } from '@/lib/auth/requireRole'
import { canTransition, requiresPaymentConfirmation, paymentRequiredForTransition } from '@/lib/order-state-machine'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateOrder, sanitizeOrderInput } from '@/lib/pos/validateOrder'
import { createOrder, logOrderEvent } from '@/lib/pos/orderService'
import type { OrderEventType } from '@/lib/pos/types'

const ALLOWED_PATCH_FIELDS = new Set([
  'customer_name', 'phone', 'order_type', 'requested_time', 'status',
  'items_json', 'table_number', 'delivery_address',
  'payment_status', 'payment_confirmed_at', 'payment_confirmed_by',
  'waiter_name', 'payment_method', 'preparation_time_minutes',
])

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const orderRef = searchParams.get('order_ref')
  const waiterStats = searchParams.get('waiter_stats')

  if (waiterStats === 'true') {
    const { data, error } = await getAdminClient()
      .from('orders')
      .select('waiter_name')
      .not('waiter_name', 'is', null)
      .neq('waiter_name', '')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const { data, error } = await getAdminClient()
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`order:${ip}`)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const raw = await request.json()

    // ── Sanitize: strip unknown fields before validation ──
    const body = sanitizeOrderInput(raw)

    // ── Central validation ─────────────────────────────────
    const validation = validateOrder(body)
    if (!validation.valid) {
      const first = validation.errors[0]
      return NextResponse.json({
        error: first.message,
        fields: validation.errors,
      }, { status: 400 })
    }

    // ── Process order ──────────────────────────────────────
    const { order, duplicate, error } = await createOrder(body as any)

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order,
      duplicate,
    }, { status: duplicate ? 200 : 201 })
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err)
    console.error('order POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const role = await getRequestRole(request)

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    // Kitchen restrictions (admin bypasses all)
    if (role === 'kitchen') {
      if (body.status === 'cancelled') {
        return NextResponse.json({ error: 'Kitchen cannot cancel orders' }, { status: 403 })
      }
      if (body.status === 'confirmed') {
        return NextResponse.json({ error: 'Only admin can accept orders' }, { status: 403 })
      }
      if (body.payment_status) {
        return NextResponse.json({ error: 'Kitchen cannot modify payment status' }, { status: 403 })
      }
      const kitchenOnlyFields = ['customer_name', 'phone', 'order_type', 'delivery_address', 'waiter_name', 'table_number']
      for (const field of kitchenOnlyFields) {
        if (field in body) {
          return NextResponse.json({ error: 'Kitchen cannot modify order details' }, { status: 403 })
        }
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
    if (updateBody.status) {
      const { data: fetched, error: fetchError } = await getAdminClient()
        .from('orders')
        .select('status, order_type, payment_status')
        .eq('id', id)
        .single()

      if (fetchError || !fetched) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      currentStatus = fetched.status
      currentOrderType = fetched.order_type
      currentPaymentStatus = fetched.payment_status

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

      // ── Payment verification check (skip if payment is being confirmed in this same request) ──
      // Only enforce when transitioning OUT of 'pending' — once past pending, payment was already handled
      const paymentBeingConfirmed = updateBody.payment_status === 'paid'
      if (
        currentStatus === 'pending' &&
        updateBody.status !== 'cancelled' &&
        currentPaymentStatus !== 'paid' &&
        !paymentBeingConfirmed &&
        requiresPaymentConfirmation(currentOrderType ?? '') &&
        paymentRequiredForTransition(updateBody.status)
      ) {
        return NextResponse.json({ error: 'Payment must be confirmed before dispatching this order.' }, { status: 400 })
      }
    }

    // ── Handle payment confirmation action ──────────────────────
    if (updateBody.payment_status === 'paid') {
      updateBody.payment_confirmed_at = new Date().toISOString()
      updateBody.payment_confirmed_by = role ?? 'admin'
    }

    let query = getAdminClient().from('orders').update(updateBody).eq('id', id)
    if (updateBody.status && currentStatus) {
      query = query.eq('status', currentStatus)
    }

    const { data: updated, error } = await query.select('id').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (updateBody.status && !updated) {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 })
    }

    // ── Log event on status change ────────────────────────────
    if (updated && updateBody.status && currentStatus && currentStatus !== updateBody.status) {
      const eventTypeMap: Record<string, OrderEventType> = {
        confirmed: 'ORDER_CONFIRMED',
        preparing: 'ORDER_PREPARING',
        packing: 'ORDER_PACKING',
        ready: 'ORDER_READY',
        completed: 'ORDER_COMPLETED',
        cancelled: 'ORDER_CANCELLED',
      }
      logOrderEvent({
        order_id: updated.id,
        event_type: eventTypeMap[updateBody.status] || 'ORDER_CREATED',
        from_status: currentStatus,
        to_status: updateBody.status,
        created_by: 'admin',
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  }

  const { error } = await getAdminClient()
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
