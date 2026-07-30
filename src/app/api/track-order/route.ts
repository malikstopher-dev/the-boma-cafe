import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { logOrderEvent } from '@/lib/pos/orderService'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  packing: 'Packing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const CORE_COLS = 'order_ref, customer_name, total, status, payment_status, order_type, created_at'
const OPTIONAL_COLS = 'waiter_name, table_number, preparation_time_minutes, items_json'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`track:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')

  if (!ref) {
    return NextResponse.json({ error: 'Order reference required' }, { status: 400 })
  }

  // Try with optional columns first; if any column is missing, fall back to core only
  let data: Record<string, any> | null = null
  let { data: fullResult, error } = await getAdminClient()
    .from('orders')
    .select(`${CORE_COLS}, ${OPTIONAL_COLS}`)
    .eq('order_ref', ref)
    .maybeSingle()

  if (error && error.message?.includes('does not exist')) {
    const fallback = await getAdminClient()
      .from('orders')
      .select(CORE_COLS)
      .eq('order_ref', ref)
      .maybeSingle()
    fullResult = fallback.data as any
    error = fallback.error as any
  }

  if (error) {
    return NextResponse.json({ error: 'Failed to look up order' }, { status: 500 })
  }

  if (!fullResult) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  data = fullResult

  return NextResponse.json({
    order_ref: data.order_ref,
    customer_name: data.customer_name,
    total: data.total,
    status: data.status,
    payment_status: data.payment_status,
    order_type: data.order_type,
    waiter_name: data.waiter_name ?? null,
    table_number: data.table_number ?? null,
    preparation_time_minutes: data.preparation_time_minutes ?? null,
    items_json: data.items_json ?? null,
    status_label: STATUS_LABELS[data.status] || data.status,
    created_at: data.created_at,
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`cancel:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { ref?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const ref = body?.ref?.trim()
  if (!ref) {
    return NextResponse.json({ error: 'Order reference required' }, { status: 400 })
  }

  const { data: order, error } = await getAdminClient()
    .from('orders')
    .select('id, status, payment_status')
    .eq('order_ref', ref)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to look up order' }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (!['pending', 'confirmed'].includes(order.status)) {
    return NextResponse.json({ error: 'Order can only be cancelled if it has not started preparing yet.' }, { status: 400 })
  }

  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Cannot cancel a paid order. Please contact the restaurant.' }, { status: 400 })
  }

  const { error: updateError } = await getAdminClient()
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', order.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  logOrderEvent({
    order_id: order.id,
    event_type: 'ORDER_CANCELLED',
    from_status: order.status,
    to_status: 'cancelled',
    created_by: 'customer',
  })

  return NextResponse.json({ success: true })
}
