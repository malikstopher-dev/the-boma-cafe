import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getInventoryClient } from '../../lib/db'
import { requireString, getHeader } from '../../lib/api-utils'
import { writeAuditLog } from '../../lib/audit'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    let query = getInventoryClient()
      .from('inventory_count_profiles')
      .select('*, inventory_count_profile_items(*, inventory_products(id, name, sku), inventory_uoms(name, symbol))')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (locationId) query = query.or(`location_id.eq.${locationId},location_id.is.null`)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list count profiles'
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: { message: 'Invalid body' } }, { status: 400 })

    const name = requireString(body.name, 'name')
    const locationId = typeof body.locationId === 'string' && body.locationId ? body.locationId : null
    const inventoryType = typeof body.inventoryType === 'string' && body.inventoryType ? body.inventoryType : null

    const { data, error } = await getInventoryClient()
      .from('inventory_count_profiles')
      .insert({ name, location_id: locationId, inventory_type: inventoryType })
      .select()
      .single()

    if (error) throw new Error(error.message)
    await writeAuditLog('inventory_count_profiles', data.id, 'created', { name, locationId }, getHeader(request, 'x-user-staff-id'))
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create profile'
    return NextResponse.json({ error: { message } }, { status: 400 })
  }
}