import { NextRequest, NextResponse } from 'next/server'
import { getInventoryClient } from '@/inventory/lib/db'
import type { ApiResponse } from '@/inventory/engine/types'

type AutoLinkResult = {
  linked: {
    bar_item_id: string
    bar_item_name: string
    product_id: string
    product_name: string
    pour_size_ml: number
  }[]
  unmatched: { bar_item_id: string; bar_item_name: string }[]
}

const STOPWORDS = new Set([
  'ml', 'g', 'l', 'litre', 'litres', 'liter', 'liters', 'bottle', 'bottles', 'tot', 'tots',
  'shot', 'shots', 'glass', 'glasses', 'single', 'double', 'small', 'large', 'regular',
  'house', 'premium', 'fresh', 'classic', 'the', 'and', 'with', 'x1',
])

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(name: string): string[] {
  return normalize(name)
    .split(' ')
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

/** Score how well a bar item name matches an inventory product name. 0 = no match. */
function matchScore(barItemName: string, productName: string): number {
  const bar = normalize(barItemName)
  const prod = normalize(productName)
  if (bar === prod) return 1

  const barTokens = tokenize(barItemName)
  const prodTokens = tokenize(productName)
  if (!barTokens.length || !prodTokens.length) return 0

  // All bar tokens contained in the product name (order-insensitive) — strong match
  const prodSet = new Set(prodTokens)
  if (barTokens.every(t => prodSet.has(t))) {
    // Penalize when the product has many extra words but reward exact subsets
    return barTokens.length >= prodTokens.length ? 0.95 : 0.9
  }

  // Fuzzy: fraction of bar tokens present in product name
  const present = barTokens.filter(t => prodSet.has(t)).length
  return present / barTokens.length
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AutoLinkResult>>> {
  try {
    const supabase = getInventoryClient()
    const body = await request.json().catch(() => ({}))
    const { category_id } = body as { category_id?: string }

    let unlinkedQuery = supabase
      .from('bar_items')
      .select('id, name')
      .eq('has_inventory', false)
    if (category_id) {
      unlinkedQuery = unlinkedQuery.eq('category_id', category_id)
    }
    const { data: unlinked, error: unlinkedError } = await unlinkedQuery

    if (unlinkedError) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: unlinkedError.message } },
        { status: 500 },
      )
    }

    if (!unlinked || unlinked.length === 0) {
      return NextResponse.json({ data: { linked: [], unmatched: [] } })
    }

    const [productsRes, configsRes] = await Promise.all([
      supabase.from('inventory_products').select('id, name'),
      supabase.from('bar_product_config').select('product_id, pour_size_ml'),
    ])

    if (productsRes.error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: productsRes.error.message } },
        { status: 500 },
      )
    }
    if (configsRes.error) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: configsRes.error.message } },
        { status: 500 },
      )
    }

    const pourByProduct = new Map<string, number>()
    for (const c of configsRes.data ?? []) {
      pourByProduct.set(c.product_id, Number(c.pour_size_ml))
    }

    const products = productsRes.data ?? []
    const linked: AutoLinkResult['linked'] = []
    const unmatched: AutoLinkResult['unmatched'] = []

    for (const item of unlinked) {
      let bestProduct: { id: string; name: string } | null = null
      let bestScore = 0

      for (const product of products) {
        const score = matchScore(item.name, product.name)
        if (score > bestScore) {
          bestScore = score
          bestProduct = product
        }
      }

      // Require a strong match (>= 0.85) to avoid guessing wrong products
      if (bestProduct && bestScore >= 0.85) {
        linked.push({
          bar_item_id: item.id,
          bar_item_name: item.name,
          product_id: bestProduct.id,
          product_name: bestProduct.name,
          pour_size_ml: pourByProduct.get(bestProduct.id) ?? 30,
        })
      } else {
        unmatched.push({ bar_item_id: item.id, bar_item_name: item.name })
      }
    }

    if (linked.length > 0) {
      const { error: insertError } = await supabase
        .from('bar_item_inventory_links')
        .insert(
          linked.map(l => ({
            bar_item_id: l.bar_item_id,
            inventory_product_id: l.product_id,
            pour_size_ml: l.pour_size_ml,
          })),
        )
        .select('id')

      if (insertError) {
        return NextResponse.json(
          { error: { code: 'DB_ERROR', message: insertError.message } },
          { status: 500 },
        )
      }

      await supabase
        .from('bar_items')
        .update({ has_inventory: true })
        .in('id', linked.map(l => l.bar_item_id))
    }

    return NextResponse.json({ data: { linked, unmatched } }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}
