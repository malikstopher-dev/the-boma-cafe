import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import { getInventoryTypeFilter, applyInventoryTypeFilter } from '@/inventory/lib/api-utils'
import { resolveLocationId } from '@/inventory/lib/location'
import { getCurrentBalance } from '@/inventory/engine/ledger'
import type { ApiResponse, InventoryProduct } from '@/inventory/engine/types'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryProduct[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const locationId = await resolveLocationId(searchParams.get('location_id'))
    const showArchived = searchParams.get('show_archived') === 'true'
    const cursor = searchParams.get('cursor')
    const pageSize = Math.min(Number(searchParams.get('page_size')) || 50, 500)
    const inventoryType = getInventoryTypeFilter(searchParams)

    let query = supabase
      .from('inventory_products')
      .select('*', { count: 'exact' })

    if (!showArchived) {
      query = query.eq('is_active', true).is('deleted_at', null)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (inventoryType) {
      query = query.eq('inventory_type', inventoryType)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
    }

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(pageSize)

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    const products = (data ?? []) as InventoryProduct[]

    if (locationId && products.length > 0) {
      // Use the engine's getCurrentBalance: it falls back to summing the
      // transaction ledger when the inventory_get_balance RPC is absent
      // (the RPC is missing from migrations). A raw .rpc() call with
      // .single() throws on a 404 and turns the whole list into a 500.
      for (const product of products) {
        const balance = await getCurrentBalance(product.id, locationId)
        ;(product as unknown as Record<string, unknown>).current_balance = balance
      }
    }

    const hasMore = (count ?? 0) > pageSize
    const lastItem = products[products.length - 1]
    const nextCursor = hasMore && lastItem ? lastItem.created_at : null

    return NextResponse.json({
      data: products,
      meta: {
        cursor: nextCursor,
        hasMore,
        total: count ?? undefined,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryProduct>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { name, sku, barcode, category_id, inventory_type, preferred_supplier_id, supplier_code, reorder_threshold, reorder_quantity, has_expiry, shelf_life_days, uoms } = body

    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Product name is required' } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_products')
      .insert({
        name,
        sku: sku ?? null,
        barcode: barcode ?? null,
        category_id: category_id ?? null,
        inventory_type: inventory_type ?? 'GENERAL',
        preferred_supplier_id: preferred_supplier_id ?? null,
        supplier_code: supplier_code ?? null,
        reorder_threshold: reorder_threshold ?? null,
        reorder_quantity: reorder_quantity ?? null,
        has_expiry: has_expiry ?? false,
        shelf_life_days: shelf_life_days ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'A product with this SKU or barcode already exists' } },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    const productId = data.id

    if (Array.isArray(uoms)) {
      for (const uom of uoms) {
        // one_base_uom CHECK forbids is_base AND is_display on the same row.
        const isBase = uom.is_base ?? false
        await supabase
          .from('inventory_product_uoms')
          .insert({
            product_id: productId,
            uom_id: uom.uom_id,
            is_base: isBase,
            is_display: isBase ? false : (uom.is_display ?? false),
            conversion_factor: uom.conversion_factor ?? 1,
          })
      }

      const { data: updatedProduct } = await supabase
        .from('inventory_products')
        .select('*, inventory_product_uoms(*)')
        .eq('id', productId)
        .single()

      return NextResponse.json({ data: updatedProduct as InventoryProduct }, { status: 201 })
    }

    return NextResponse.json({ data: data as InventoryProduct }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
