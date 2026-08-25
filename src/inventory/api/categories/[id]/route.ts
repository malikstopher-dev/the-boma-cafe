import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryCategory } from '@/inventory/engine/types'
import { requireInventoryPermission } from '@/inventory/lib/require-inventory-permission'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryCategory>>> {
  const denied = await requireInventoryPermission(request, 'inventory.config.write')
  if (denied) return denied
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if ('name' in body) updates.name = body.name
    if ('parent_id' in body) updates.parent_id = body.parent_id
    if ('module' in body) updates.module = body.module

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Category not found: ${id}` } },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: data as InventoryCategory })
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

    const { count: childCount } = await supabase
      .from('inventory_categories')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id)
      .eq('is_active', true)

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `Category has ${childCount} child categor${childCount === 1 ? 'y' : 'ies'}. Remove or deactivate them first.` } },
        { status: 409 },
      )
    }

    const { count: productCount } = await supabase
      .from('inventory_products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true)

    if (productCount && productCount > 0) {
      return NextResponse.json({
        error: { code: 'CONFLICT', message: `Category has ${productCount} product(s). Remove them first.` },
      } as ApiResponse<void>, { status: 409 })
    }

    await supabase
      .from('inventory_categories')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
