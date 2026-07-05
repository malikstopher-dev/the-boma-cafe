import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireRole';
import { getAdminClient } from '@/lib/supabase';
import { defaultCategories, defaultMenuItems } from '@/data/defaultData';
import { randomUUID } from 'crypto';

async function seedDefaultData() {
  const client = await getAdminClient()
  const now = new Date().toISOString()

  // Check if tables exist
  let catCount = 0
  try {
    const result = await client.from('menu_categories').select('id', { count: 'exact', head: true })
    catCount = result.count || 0
  } catch (err: any) {
    if (err?.code === 'PGRST205') {
      return { error: 'Menu tables do not exist. Run migration 015 first.', tablesMissing: true }
    }
    throw err
  }

  if (catCount > 0) {
    return { message: 'Menu data already exists — no seed needed.', count: catCount }
  }

  // Insert categories with generated UUIDs
  const catIds: Record<string, string> = {}
  for (const cat of defaultCategories) {
    const id = randomUUID()
    catIds[cat.name] = id
    await client.from('menu_categories').insert({
      id,
      name: cat.name,
      description: cat.description || '',
      order_index: cat.order || 0,
      is_active: cat.isActive !== false,
      created_at: now,
      updated_at: now,
    })
  }

  // Insert menu items
  let seededCount = 0
  for (const item of defaultMenuItems) {
    const categoryId = catIds[item.category] || ''
    if (!categoryId) continue
    await client.from('menu_items').insert({
      id: randomUUID(),
      category_id: categoryId,
      name: item.name,
      description: item.description || '',
      price: String(item.price ?? ''),
      image: item.image || '',
      sizes: item.variants ? JSON.stringify(item.variants.map((v: any) => ({ name: v.name, price: Number(v.price) }))) : null,
      add_ons: item.addOns ? JSON.stringify(item.addOns.map((a: any) => ({ name: a.name, price: Number(a.price) }))) : null,
      is_available: !item.isOutOfStock,
      is_featured: item.isFeatured || false,
      is_on_promo: item.isOnPromo || false,
      promo_badge: item.promoBadge || '',
      order_index: item.order || 0,
      created_at: now,
      updated_at: now,
    })
    seededCount++
  }

  return { message: `Seeded ${defaultCategories.length} categories and ${seededCount} menu items.`, categories: defaultCategories.length, items: seededCount }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const result = await seedDefaultData()
    revalidatePath('/menu')
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Seed error:', error?.message || error, error?.stack || '')
    return NextResponse.json({
      error: 'Seed failed',
      detail: error?.message || String(error),
      ...(error?.code && { code: error.code }),
    }, { status: 500 })
  }
}
