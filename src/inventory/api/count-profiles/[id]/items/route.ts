import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getInventoryClient } from '../../../../lib/db'
import { requireString, getHeader } from '../../../../lib/api-utils'
import { writeAuditLog } from '../../../../lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid body' } }, { status: 400 })

    const productId = requireString(body.productId, 'productId')
    const sectionLabel = typeof body.sectionLabel === 'string' && body.sectionLabel.trim() ? body.sectionLabel.trim() : 'General'
    const countUomId = typeof body.countUomId === 'string' && body.countUomId ? body.countUomId : null

    const { data, error } = await getInventoryClient()
      .from('inventory_count_profile_items')
      .insert({ profile_id: id, product_id: productId, section_label: sectionLabel, count_uom_id: countUomId })
      .select()
      .single()

    if (error) throw new Error(error.message)
    await writeAuditLog('inventory_count_profile_items', data.id, 'created', { profile_id: id, product_id: productId }, getHeader(request, 'x-user-staff-id'))
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add item'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}