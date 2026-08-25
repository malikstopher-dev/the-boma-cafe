import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryUom } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(): Promise<NextResponse<ApiResponse<InventoryUom[]>>> {
  try {
    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_uoms')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: (data ?? []) as InventoryUom[] })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryUom>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { name, symbol, category } = body

    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'UOM name is required' } },
        { status: 400 },
      )
    }

    const validCategories = ['discrete', 'continuous']
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `Category must be one of: ${validCategories.join(', ')}` } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_uoms')
      .insert({ name, symbol: symbol ?? null, category: category ?? 'discrete' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: `UOM '${name}' already exists` } },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data as InventoryUom }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
