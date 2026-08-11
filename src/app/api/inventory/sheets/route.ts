import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { resolveLocationId } from '@/inventory/lib/location'
import type { ApiResponse } from '@/inventory/engine/types'

interface SheetCellRow {
  row_idx: number
  col_key: string
  raw_value: string
  data_type: string
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<{ id: string; name: string; cells: SheetCellRow[] }>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') ?? 'kitchen'
    const week = Number(searchParams.get('week')) || 1
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const locationId = await resolveLocationId(searchParams.get('location_id'))

    if (!locationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No active location configured' } },
        { status: 400 },
      )
    }

    const { data: sheet, error } = await supabase
      .from('inventory_sheets')
      .select('*')
      .eq('tab_type', tab)
      .eq('location_id', locationId)
      .eq('week', week)
      .eq('year', year)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    let sheetId: string
    let sheetName: string
    if (sheet) {
      sheetId = sheet.id
      sheetName = sheet.name ?? ''
    } else {
      sheetName = `${tab === 'bar' ? 'Bar' : 'Kitchen'} · Week ${week} · ${year}`
      const { data: created, error: insertError } = await supabase
        .from('inventory_sheets')
        .insert({
          tab_type: tab,
          location_id: locationId,
          week,
          year,
          name: sheetName,
        })
        .select()
        .single()
      if (insertError || !created) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: insertError?.message ?? 'Could not create sheet' } },
          { status: 500 },
        )
      }
      sheetId = created.id
      sheetName = created.name ?? ''
    }

    const { data: cells, error: cellsError } = await supabase
      .from('sheet_cells')
      .select('row_idx, col_key, raw_value, data_type')
      .eq('sheet_id', sheetId)
      .order('row_idx', { ascending: true })
      .order('col_key', { ascending: true })

    if (cellsError) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: cellsError.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({
      data: {
        id: sheetId,
        name: sheetName,
        cells: (cells ?? []) as SheetCellRow[],
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}