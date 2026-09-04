import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import { getAdminContext } from '@/lib/admin/context'
import { resolveLocationId } from '@/inventory/lib/location'
import type { InventoryTransaction } from '@/inventory/engine/types'

interface ReceiptLine {
  product_id: string
  uom_id: string
  quantity: number
  unit_cost: number | null
  line_value?: number | null
}

interface PostReceiptBody {
  location_id: string
  supplier_id?: string | null
  delivery_reference?: string | null
  receipt_date?: string | null
  notes?: string | null
  idempotency_key: string
  lines: ReceiptLine[]
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function bad(message: string): NextResponse {
  return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied

  let admin: Awaited<ReturnType<typeof getAdminContext>>
  try {
    admin = await getAdminContext(request)
  } catch {
    admin = null
  }
  if (!admin) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authenticated admin identity required' } },
      { status: 401 },
    )
  }

  let body: PostReceiptBody
  try {
    body = await request.json() as PostReceiptBody
  } catch {
    return bad('A valid JSON body is required')
  }

  if (!body || typeof body !== 'object') return bad('A receipt object is required')
  if (!body.location_id) return bad('location_id is required')
  if (!body.idempotency_key || !UUID_RE.test(body.idempotency_key)) {
    return bad('idempotency_key must be a UUID')
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return bad('At least one receipt line is required')
  }
  if (body.lines.length > 200) return bad('A receipt cannot exceed 200 lines')

  for (const [index, line] of body.lines.entries()) {
    if (!line?.product_id || !UUID_RE.test(line.product_id)) {
      return bad(`Line ${index + 1}: product_id must be a UUID`)
    }
    if (!line.uom_id || !UUID_RE.test(line.uom_id)) {
      return bad(`Line ${index + 1}: uom_id must be a UUID`)
    }
    const qty = Number(line.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      return bad(`Line ${index + 1}: quantity must be a finite number greater than zero`)
    }
    if (line.unit_cost !== null && line.unit_cost !== undefined) {
      const cost = Number(line.unit_cost)
      if (!Number.isFinite(cost) || cost < 0) {
        return bad(`Line ${index + 1}: unit cost must be a finite non-negative number`)
      }
    }
  }

  if (body.delivery_reference != null && String(body.delivery_reference).length > 120) {
    return bad('Delivery reference must be 120 characters or fewer')
  }
  if (body.notes != null && String(body.notes).length > 500) {
    return bad('Notes must be 500 characters or fewer')
  }
  if (body.receipt_date != null && body.receipt_date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(body.receipt_date)) {
    return bad('receipt_date must be an ISO calendar date (YYYY-MM-DD)')
  }

  const resolvedLocationId = await resolveLocationId(body.location_id)
  if (!resolvedLocationId) {
    return bad('No active location configured')
  }

  const supabase = getInventoryClient()
  const { data: rpcData, error: rpcError } = await supabase.rpc('post_direct_receipt', {
    p_input: {
      location_id: resolvedLocationId,
      supplier_id: body.supplier_id || null,
      delivery_reference: body.delivery_reference?.trim() || null,
      receipt_date: body.receipt_date || null,
      notes: body.notes?.trim() || null,
      idempotency_key: body.idempotency_key,
      admin_actor_id: admin.adminId,
      lines: body.lines.map(line => ({
        product_id: line.product_id,
        uom_id: line.uom_id,
        quantity: Number(line.quantity),
        unit_cost: line.unit_cost == null ? null : Number(line.unit_cost),
        line_value: line.line_value == null ? null : Number(line.line_value),
      })),
    },
  })

  if (rpcError) {
    return NextResponse.json(
      { error: { code: 'RECEIPT_FAILED', message: rpcError.message } },
      { status: 400 },
    )
  }

  const result = Array.isArray(rpcData) ? rpcData[0] : rpcData
  if (!result || (result as Record<string, unknown>).outcome === undefined) {
    return NextResponse.json(
      { error: { code: 'RECEIPT_FAILED', message: 'The receipt RPC returned no result' } },
      { status: 500 },
    )
  }

  const transactions = ((result as Record<string, unknown>).transactions ?? []) as InventoryTransaction[]
  return NextResponse.json(
    {
      data: {
        receipt_id: (result as Record<string, unknown>).receipt_id,
        outcome: (result as Record<string, unknown>).outcome,
        transactions,
        posted_count: transactions.length,
      },
    },
    { status: 201 },
  )
}
