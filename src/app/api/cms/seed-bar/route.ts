import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { getAdminClient } from '@/lib/supabase';
import { barCategories } from '@/app/bar-menu/barMenuData';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic'

// Must match migration 061's backfill list — keep in sync
const ALCOHOL_CATEGORIES = new Set([
  'signature cocktails', 'classic cocktails', 'cocktails',
  'whisky', 'whiskey', 'brandy', 'cognac', 'vodka', 'gin', 'rum',
  'shots', 'shooters', 'tequila', 'roses cordials', 'spirits & liqueurs',
  'beers', 'beer', 'ciders & rtds', 'cider',
  'sauvignon blanc', 'chardonnay', 'chenin blanc', 'rosé', 'rose',
  'cap classique', 'champagne', 'prosecco', 'merlot', 'pinotage',
  'cabernet sauvignon', 'shiraz', 'red blends', 'white blends',
  'other varietals', 'special board', 'wines', 'wine', 'port', 'sherry',
])

async function seedBarData() {
  const client = await getAdminClient()
  const now = new Date().toISOString()

  let catCount = 0
  try {
    const result = await client.from('bar_categories').select('id', { count: 'exact', head: true })
    catCount = result.count || 0
  } catch (err: any) {
    if (err?.code === 'PGRST205') {
      return { error: 'Bar tables do not exist. Run migration 018 first.', tablesMissing: true }
    }
    throw err
  }

  if (catCount > 0) {
    return { message: 'Bar menu data already exists — no seed needed.', count: catCount }
  }

  const catIds: Record<string, string> = {}
  for (let i = 0; i < barCategories.length; i++) {
    const cat = barCategories[i]
    const id = randomUUID()
    catIds[cat.id] = id
    await client.from('bar_categories').insert({
      id,
      name: cat.name,
      order_index: i,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
  }

  let seededCount = 0
  for (const category of barCategories) {
    const categoryId = catIds[category.id]
    if (!categoryId) continue
    for (let i = 0; i < category.items.length; i++) {
      const item = category.items[i]
      await client.from('bar_items').insert({
        id: randomUUID(),
        category_id: categoryId,
        name: item.name,
        bottle: item.bottle || null,
        single_price: item.single || null,
        glass_price: item.glass || null,
        shot_price: item.shot || null,
        price: item.price || null,
        order_index: i,
        is_available: true,
        available_for_pickup: !ALCOHOL_CATEGORIES.has(category.name.toLowerCase()),
        is_alcohol: ALCOHOL_CATEGORIES.has(category.name.toLowerCase()),
        created_at: now,
        updated_at: now,
      })
      seededCount++
    }
  }

  return { message: `Seeded ${barCategories.length} categories and ${seededCount} bar items.`, categories: barCategories.length, items: seededCount }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'bar_menu.write')
  if (authError) return authError

  try {
    const result = await seedBarData()
    revalidatePath('/bar-menu')
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Seed bar error:', error?.message || error, error?.stack || '')
    return NextResponse.json({
      error: 'Seed failed',
      detail: error?.message || String(error),
      ...(error?.code && { code: error.code }),
    }, { status: 500 })
  }
}
