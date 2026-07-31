import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, ContainerType } from '@/inventory/engine/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<ContainerType | null>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const { data } = await supabase
      .from('inventory_container_types')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Container type not found' } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: data as ContainerType })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
