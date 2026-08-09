import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getInventoryClient } from '../../../../../lib/db'
import { getHeader } from '../../../../../lib/api-utils'
import { writeAuditLog } from '../../../../../lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { itemId } = await params
    const { error } = await getInventoryClient()
      .from('inventory_count_profile_items')
      .delete()
      .eq('id', itemId)
    if (error) throw new Error(error.message)
    await writeAuditLog('inventory_count_profile_items', itemId, 'deleted', {}, getHeader(request, 'x-user-staff-id'))
    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete profile item'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}