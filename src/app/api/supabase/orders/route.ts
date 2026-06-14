import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAnyRole } from '@/lib/auth'
import { canTransition } from '@/lib/order-state-machine'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateOrder } from '@/lib/pos/validateOrder'
import { insertOrder } from '@/lib/pos/orderService'

const ALLOWED_PATCH_FIELDS = new Set([
  'customer_name', 'phone', 'order_type', 'requested_time', 'status',
  'items_json', 'table_number', 'delivery_address',
])

export async function GET(request: NextRequest) {
  const authError = await requireAnyRole(['admin', 'kitchen'])
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const orderRef = searchParams.get('order_ref')

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

  const { data, error } = await getAdminClient()
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
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()

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
    const { order, duplicate, error } = await insertOrder(body)

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
  const authError = await requireAnyRole(['admin', 'kitchen'])
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
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
    if (updateBody.status) {
      const { data: fetched, error: fetchError } = await getAdminClient()
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

    let query = getAdminClient().from('orders').update(updateBody).eq('id', id)
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

  const { error } = await getAdminClient()
    .from('orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
