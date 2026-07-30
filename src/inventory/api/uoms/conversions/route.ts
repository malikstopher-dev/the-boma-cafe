import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryUomConversion } from '@/inventory/engine/types'

export async function GET(): Promise<NextResponse<ApiResponse<InventoryUomConversion[]>>> {
  try {
    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_uom_conversions_global')
      .select('*, from_uom:from_uom_id(name, symbol), to_uom:to_uom_id(name, symbol)')
      .order('created_at')

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: (data ?? []) as unknown as InventoryUomConversion[] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryUomConversion>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { from_uom_id, to_uom_id, factor } = body

    if (!from_uom_id || !to_uom_id || !factor) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'from_uom_id, to_uom_id, and factor are required' } },
        { status: 400 },
      )
    }

    if (factor <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Factor must be a positive number' } },
        { status: 400 },
      )
    }

    if (from_uom_id === to_uom_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot create conversion between the same UOM' } },
        { status: 400 },
      )
    }

    const { data: existingBoth } = await supabase
      .from('inventory_uom_conversions_global')
      .select('id')
      .or(`and(from_uom_id.eq.${from_uom_id},to_uom_id.eq.${to_uom_id}),and(from_uom_id.eq.${to_uom_id},to_uom_id.eq.${from_uom_id})`)
      .maybeSingle()

    if (existingBoth) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A conversion between these UOMs already exists' } },
        { status: 409 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_uom_conversions_global')
      .insert({ from_uom_id, to_uom_id, factor })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data as InventoryUomConversion }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
