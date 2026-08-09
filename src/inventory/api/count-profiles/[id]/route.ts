import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getInventoryClient } from '../../../lib/db'
import { getHeader } from '../../../lib/api-utils'
import { writeAuditLog } from '../../../lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid body' } }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
    if (typeof body.inventory_type === 'string') patch.inventory_type = body.inventory_type || null
    if (typeof body.location_id === 'string') patch.location_id = body.location_id || null

    const { data, error } = await getInventoryClient()
      .from('inventory_count_profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    await writeAuditLog('inventory_count_profiles', id, 'updated', patch, getHeader(request, 'x-user-staff-id'))
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await getInventoryClient()
      .from('inventory_count_profiles')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await writeAuditLog('inventory_count_profiles', id, 'deleted', {}, getHeader(request, 'x-user-staff-id'))
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete profile'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}