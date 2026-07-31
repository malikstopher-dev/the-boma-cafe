import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, CostCentre } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<CostCentre[]>>> {
  try {
    const { searchParams } = new URL(request.url)
    const showArchived = searchParams.get('show_archived') === 'true'

    const supabase = getInventoryClient()
    let query = supabase
      .from('cost_centres')
      .select('*')
      .order('name', { ascending: true })

    if (!showArchived) query = query.eq('is_active', true)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<CostCentre>>> {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Name is required' } },
        { status: 400 },
      )
    }

    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('cost_centres')
      .insert({ name, description: description ?? null })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
