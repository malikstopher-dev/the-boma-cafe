import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, ContainerType } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ContainerType[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const trackableOnly = searchParams.get('trackable_only') === 'true'

    let query = supabase
      .from('inventory_container_types')
      .select('*')
      .order('sort_order')

    if (trackableOnly) query = query.eq('is_trackable', true)

    const { data } = await query
    return NextResponse.json({ data: (data ?? []) as ContainerType[] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
