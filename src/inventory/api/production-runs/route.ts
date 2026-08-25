import { NextRequest, NextResponse } from 'next/server'
import { createProductionRun, listProductionRuns } from '@/inventory/engine/production-runs'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse, ProductionRunStatus } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { searchParams } = new URL(request.url)
    const data = await listProductionRuns({
      locationId: (await resolveLocationId(searchParams.get('location_id'))) ?? undefined,
      recipeId: searchParams.get('recipe_id') ?? undefined,
      status: (searchParams.get('status') as ProductionRunStatus) ?? undefined,
      limit: Number(searchParams.get('limit')) || 50,
    })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const denied = await requireInventoryPermission(request, 'inventory.approve')
  if (denied) return denied
  try {
    const body = await request.json()
    if (!body.recipe_id || !body.quantity_planned) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'recipe_id and quantity_planned are required' } },
        { status: 400 },
      )
    }
    const locationId = await resolveLocationId(body.location_id)
    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }
    const data = await createProductionRun({ ...body, location_id: locationId })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
