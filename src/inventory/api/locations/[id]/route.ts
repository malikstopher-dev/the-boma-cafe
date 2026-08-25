import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryLocation } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryLocation & { productCount?: number }>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Location not found: ${id}` } },
        { status: 404 },
      )
    }

    const { count: productCount } = await supabase
      .from('inventory_transactions')
      .select('product_id', { count: 'exact', head: true })
      .eq('location_id', id)
      .not('product_id', 'is', null)

    const { count: nonZero } = await supabase
      .from('inventory_product_balances')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', id)
      .gt('balance', 0)

    return NextResponse.json({
      data: {
        ...data,
        productCount: nonZero ?? 0,
        transactionProductCount: productCount,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryLocation>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    const allowedFields = ['name', 'code', 'description']

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 },
      )
    }

    if (updates.code && typeof updates.code === 'string') {
      updates.code = updates.code.trim().toUpperCase()
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Location not found: ${id}` } },
          { status: 404 },
        )
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'A location with this code already exists' } },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data as InventoryLocation })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<void>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { count: txCount } = await supabase
      .from('inventory_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', id)

    if (txCount && txCount > 0) {
      await supabase
        .from('inventory_locations')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id)

      await supabase
        .from('inventory_audit_log')
        .insert({ table_name: 'inventory_locations', record_id: id, action: 'archived' })

      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Location has linked transactions. Archived instead.' } },
        { status: 409 },
      )
    }

    await supabase.from('inventory_locations').delete().eq('id', id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<void>>> {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message: 'Unsupported action on location resource' } },
    { status: 400 },
  )
}
