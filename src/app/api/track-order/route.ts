import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  orderAccessCookieName,
  verifyOrderAccessProof,
  verifyOrderTrackingToken,
} from '@/lib/order-public-auth'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  packing: 'Packing',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

const CORE_COLS = 'id, order_ref, customer_name, total, status, payment_status, order_type, created_at, tracking_token_hash'
const OPTIONAL_COLS = 'waiter_name, table_number, preparation_time_minutes, items_json'

type PublicOrderRow = {
  id: string
  order_ref: string
  customer_name: string
  total: number
  status: string
  payment_status: string
  order_type: string
  created_at: string
  tracking_token_hash: string | null
  waiter_name?: string | null
  table_number?: string | number | null
  preparation_time_minutes?: number | null
  items_json?: string | null
}

function hasOrderProof(request: NextRequest, order: PublicOrderRow): boolean {
  const trackingToken = request.headers.get('x-order-tracking-token')
  if (verifyOrderTrackingToken(trackingToken, order.tracking_token_hash)) return true

  const cookie = request.cookies.get(orderAccessCookieName(order.order_ref))?.value
  return verifyOrderAccessProof(order.order_ref, cookie)
}

async function loadOrderByReference(ref: string, includeOptional: boolean): Promise<{
  order: PublicOrderRow | null
  error: unknown
}> {
  const columns = includeOptional ? `${CORE_COLS}, ${OPTIONAL_COLS}` : CORE_COLS
  const primary = await getAdminClient()
    .from('orders')
    .select(columns)
    .eq('order_ref', ref)
    .maybeSingle()
  let data: unknown = primary.data
  let error = primary.error

  if (includeOptional && error && String(error.message || '').includes('does not exist')) {
    const fallback = await getAdminClient()
      .from('orders')
      .select(CORE_COLS)
      .eq('order_ref', ref)
      .maybeSingle()
    data = fallback.data as unknown
    error = fallback.error
  }

  return { order: data as unknown as PublicOrderRow | null, error }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!await checkRateLimit(`track:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const ref = new URL(request.url).searchParams.get('ref')?.trim()
  if (!ref) return NextResponse.json({ error: 'Order reference required' }, { status: 400 })

  try {
    const { order, error } = await loadOrderByReference(ref, true)
    if (error) return NextResponse.json({ error: 'Failed to look up order' }, { status: 500 })

    // The same response is used for a missing order and invalid/missing proof
    // so predictable references cannot be used as an enumeration oracle.
    if (!order || !hasOrderProof(request, order)) {
      return NextResponse.json({
        error: 'Secure order access is required',
        requires_verification: true,
      }, { status: 401 })
    }

    return NextResponse.json({
      order_ref: order.order_ref,
      customer_name: order.customer_name,
      total: order.total,
      status: order.status,
      payment_status: order.payment_status,
      order_type: order.order_type,
      waiter_name: order.waiter_name ?? null,
      table_number: order.table_number ?? null,
      preparation_time_minutes: order.preparation_time_minutes ?? null,
      items_json: order.items_json ?? null,
      status_label: STATUS_LABELS[order.status] || order.status,
      created_at: order.created_at,
    })
  } catch (error) {
    console.error('[public order tracking] authorization failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to authorize order access' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!await checkRateLimit(`cancel:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { ref?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const ref = body.ref?.trim()
  if (!ref) return NextResponse.json({ error: 'Order reference required' }, { status: 400 })

  try {
    const { order, error } = await loadOrderByReference(ref, false)
    if (error) return NextResponse.json({ error: 'Failed to look up order' }, { status: 500 })
    if (!order || !hasOrderProof(request, order)) {
      return NextResponse.json({ error: 'Secure order access is required' }, { status: 401 })
    }

    const { data, error: cancelError } = await getAdminClient().rpc('cancel_public_order', {
      p_order_id: order.id,
      p_expected_status: order.status,
    })
    if (cancelError) {
      console.error('[public order cancellation] RPC failed:', cancelError.message)
      return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
    }

    const outcome = (data as { outcome?: string; status?: string } | null)?.outcome
    if (outcome === 'cancelled') return NextResponse.json({ success: true, status: 'cancelled' })
    if (outcome === 'conflict') {
      return NextResponse.json({ error: 'Order changed before cancellation. Refresh and try again.' }, { status: 409 })
    }
    if (outcome === 'paid') {
      return NextResponse.json({ error: 'Cannot cancel a paid order. Please contact the restaurant.' }, { status: 400 })
    }
    if (outcome === 'not_allowed') {
      return NextResponse.json({ error: 'Order can only be cancelled if it has not started preparing yet.' }, { status: 400 })
    }
    if (outcome === 'not_found') return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  } catch (error) {
    console.error('[public order cancellation] authorization failed:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to authorize order access' }, { status: 500 })
  }
}
