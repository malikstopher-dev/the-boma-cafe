import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'

const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

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

  const { data, error } = await getAdminClient()
    .from('orders')
    .select('order_ref, customer_name, total, status, created_at')
    .eq('order_ref', ref)
    .maybeSingle()

  if (error) {
    if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
      return NextResponse.json({ error: 'Order tracking is being set up. Please check back later.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    order_ref: data.order_ref,
    customer_name: data.customer_name,
    total: data.total,
    status: data.status,
    status_label: STATUS_LABELS[data.status] || data.status,
    created_at: data.created_at,
  })
}
