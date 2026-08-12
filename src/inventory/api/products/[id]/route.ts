import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { resolveLocationId } from '@/inventory/lib/location'
import { getCurrentBalance } from '@/inventory/engine/ledger'
import type { ApiResponse, InventoryProduct } from '@/inventory/engine/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<InventoryProduct>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { data, error } = await supabase
      .from('inventory_products')
      .select('*, inventory_product_uoms(*)')
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
        { error: { code: 'NOT_FOUND', message: `Product not found: ${id}` } },
        { status: 404 },
      )
    }

    const locationId = await resolveLocationId(new URL(request.url).searchParams.get('location_id'))
    if (locationId) {
      const balance = await getCurrentBalance(id, locationId)
      ;(data as unknown as Record<string, unknown>).current_balance = balance
    }

    return NextResponse.json({ data: data as InventoryProduct })
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
): Promise<NextResponse<ApiResponse<InventoryProduct>>> {
  try {
    const { id } = await params
    const supabase = getInventoryClient()
    const body = await request.json()

    const allowedFields = [
      'name', 'sku', 'barcode', 'category_id', 'image_url',
      'inventory_type',
      'preferred_supplier_id', 'supplier_code',
      'reorder_threshold', 'reorder_quantity',
      'has_expiry', 'shelf_life_days',
      'unit_cost',
    ]

    // Unit swap: inventory_products has no uom_id column (UOM links live in
    // inventory_product_uoms). Replace the product's base/display UOM with
    // the requested one before applying the other field updates.
    if ('uom_id' in body) {
      const uomId = body.uom_id as string | null
      delete body.uom_id
      if (uomId) {
        const { error: deleteErr } = await supabase
          .from('inventory_product_uoms')
          .delete()
          .eq('product_id', id)
        if (deleteErr) {
          return NextResponse.json(
            { error: { code: 'DB_ERROR', message: deleteErr.message } },
            { status: 500 },
          )
        }
        const { error: insertErr } = await supabase
          .from('inventory_product_uoms')
          .insert({
            product_id: id,
            uom_id: uomId,
            // one_base_uom CHECK forbids is_base AND is_display together.
            is_base: true,
            is_display: false,
            conversion_factor: 1,
          })
        if (insertErr) {
          return NextResponse.json(
            { error: { code: 'DB_ERROR', message: insertErr.message } },
            { status: 500 },
          )
        }
      }
    }

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      if ('uom_id' in body) {
        const { data: product, error: getErr } = await supabase
          .from('inventory_products')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (getErr || !product) {
          return NextResponse.json(
            { error: { code: getErr?.code === 'PGRST116' ? 'NOT_FOUND' : 'DB_ERROR', message: getErr?.message ?? `Product not found: ${id}` } },
            { status: getErr?.code === 'PGRST116' ? 404 : 500 },
          )
        }
        return NextResponse.json({ data: product as unknown as InventoryProduct })
      }
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 },
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('inventory_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Product not found: ${id}` } },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    await supabase
      .from('inventory_audit_log')
      .insert({
        table_name: 'inventory_products',
        record_id: id,
        action: 'updated',
        changes: updates,
      })

    return NextResponse.json({ data: data as InventoryProduct })
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
  try {
    const { id } = await params
    const supabase = getInventoryClient()

    const { count: txCount } = await supabase
      .from('inventory_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id)

    if (txCount && txCount > 0) {
      await supabase
        .from('inventory_products')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', id)

      await supabase
        .from('inventory_audit_log')
        .insert({
          table_name: 'inventory_products',
          record_id: id,
          action: 'archived',
        })

      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Product has transactions. Archive instead.' } },
        { status: 409 },
      )
    }

    await supabase
      .from('inventory_products')
      .delete()
      .eq('id', id)

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
): Promise<NextResponse<ApiResponse<InventoryProduct>>> {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message: 'Unsupported action on product resource' } },
    { status: 400 },
  )
}
