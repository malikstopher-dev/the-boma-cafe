import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

interface CellPatch {
  row_idx: number
  col_key: string
  raw_value: string
  data_type?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ updated: number }>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    // Excel-style index shift after a row insert/delete above this position.
    if (body?.mode === 'reindex') {
      const from = Number(body.from)
      const shift = Number(body.shift)
      if (!Number.isInteger(from) || !Number.isInteger(shift) || shift === 0) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'from (int) and shift (non-zero int) are required' } },
          { status: 400 },
        )
      }
      const { error } = await supabase.rpc('reindex_sheet_cells', { p_sheet: id, p_from: from, p_shift: shift })
      if (error) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: error.message } },
          { status: 500 },
        )
      }
      return NextResponse.json({ data: { updated: 0 } })
    }

    const patches: CellPatch[] = Array.isArray(body) ? (body as CellPatch[]) : [body as CellPatch]

    if (patches.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No cell patches provided' } },
        { status: 400 },
      )
    }

    const rows = patches.map(p => ({
      sheet_id: id,
      row_idx: Number(p.row_idx),
      col_key: String(p.col_key),
      raw_value: p.raw_value == null ? '' : String(p.raw_value),
      data_type: p.data_type ?? (String(p.raw_value ?? '').startsWith('=') ? 'formula' : 'string'),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('sheet_cells')
      .upsert(rows, { onConflict: 'sheet_id,row_idx,col_key' })

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: { updated: rows.length } })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ deleted: number }>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const row = searchParams.get('row')
    const col = searchParams.get('col')

    if (row == null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'row parameter is required' } },
        { status: 400 },
      )
    }

    let query = supabase.from('sheet_cells').delete().eq('sheet_id', id).eq('row_idx', Number(row))
    if (col) query = query.eq('col_key', col)

    const { data: deletedRows, error } = await query.select('*')
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: { deleted: deletedRows?.length ?? 0 } })
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}