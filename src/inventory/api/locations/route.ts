import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { defaultCostCentreNameForLocation, findCostCentreIdByName } from '@/inventory/lib/cost-centre'
import type { ApiResponse, InventoryLocation } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'
import { isOrderStation } from '@/inventory/lib/station-location'


export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryLocation[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const showArchived = searchParams.get('show_archived') === 'true'
    const cursor = searchParams.get('cursor')
    const pageSize = Math.min(Number(searchParams.get('page_size')) || 50, 100)

    let query = supabase
      .from('inventory_locations')
      .select('*', { count: 'exact' })

    if (!showArchived) {
      query = query.eq('is_active', true).is('deleted_at', null)
    }

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(pageSize)

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    const hasMore = (count ?? 0) > pageSize
    const items = (data ?? []) as InventoryLocation[]
    const lastItem = items[items.length - 1]
    const nextCursor = hasMore && lastItem ? lastItem.created_at : null

    return NextResponse.json({
      data: items,
      meta: { cursor: nextCursor, hasMore, total: count ?? undefined },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryLocation>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { name, code, description } = body
    const orderStation = body.order_station === '' ? null : (body.order_station ?? null)

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Location name is required' } },
        { status: 400 },
      )
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Location code is required' } },
        { status: 400 },
      )
    }

    if (orderStation !== null && !isOrderStation(orderStation)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Order station must be kitchen, bar, or null' } },
        { status: 400 },
      )
    }

    // cost_centre_id is NOT NULL (migration 066). Accept an explicit
    // value, otherwise infer one from the location name (business-area
    // rules). Refuse to create a location with no cost centre rather
    // than silently picking a random/default one.
    let costCentreId = body.cost_centre_id ?? null
    if (!costCentreId) {
      const defaultName = defaultCostCentreNameForLocation(name)
      if (defaultName) {
        costCentreId = await findCostCentreIdByName(defaultName)
      }
    }
    if (!costCentreId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A cost centre is required for this location. Provide cost_centre_id or use a recognisable location name (e.g. Main Bar, Dry Store).' } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
          description: description ?? null,
          cost_centre_id: costCentreId,
          order_station: orderStation,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'A location with this code or order station mapping already exists' } },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data as InventoryLocation }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
