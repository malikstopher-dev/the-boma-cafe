import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse, InventoryCategory } from '@/inventory/engine/types'

export async function GET(): Promise<NextResponse<ApiResponse<InventoryCategory[]>>> {
  try {
    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    const categories = (data ?? []) as InventoryCategory[]
    const tree = buildTree(categories)

    return NextResponse.json({ data: tree })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}

function buildTree(categories: InventoryCategory[]): InventoryCategory[] {
  const map = new Map<string, InventoryCategory & { children?: InventoryCategory[] }>()
  const roots: (InventoryCategory & { children?: InventoryCategory[] })[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)
    if (!node) continue
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)?.children?.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<InventoryCategory>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json()

    const { name, parent_id, module } = body

    if (!name) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Category name is required' } },
        { status: 400 },
      )
    }

    if (parent_id) {
      const { data: parent } = await supabase
        .from('inventory_categories')
        .select('id')
        .eq('id', parent_id)
        .maybeSingle()

      if (!parent) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: `Parent category not found: ${parent_id}` } },
          { status: 400 },
        )
      }
    }

    const { data, error } = await supabase
      .from('inventory_categories')
      .insert({ name, parent_id: parent_id ?? null, module: module ?? null })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data as InventoryCategory }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
