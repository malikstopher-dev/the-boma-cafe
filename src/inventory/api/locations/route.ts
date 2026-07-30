import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryLocation } from '@/inventory/engine/types'


export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryLocation[]>>> {
  try {
    const supabase = getInventoryClient()
    const { searchParams } = new URL(request.url)
    const showArchived = searchParams.get('show_archived') === 'true'
    const cursor = searchParams.get('cursor')
    const pageSize = Math.min(Number(searchParams.get('page_size')) || 50, 100)

    let query = supabase
      .from('inventory_locations')
      .select('*', { count: 'exact' })

    if (!showArchived) {
      query = query.eq('is_active', true).is('deleted_at', null)
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

    const hasMore = (count ?? 0) > pageSize
    const items = (data ?? []) as InventoryLocation[]
    const lastItem = items[items.length - 1]
    const nextCursor = hasMore && lastItem ? lastItem.created_at : null

    return NextResponse.json({
      data: items,
      meta: { cursor: nextCursor, hasMore, total: count ?? undefined },
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryLocation>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { name, code, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Location name is required' } },
        { status: 400 },
      )
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Location code is required' } },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('inventory_locations')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ?? null,
      })
      .select()
      .single()

    if (error) {
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

    return NextResponse.json({ data: data as InventoryLocation }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
