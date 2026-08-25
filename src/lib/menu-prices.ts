import { getAdminClient } from './supabase'
import { defaultMenuItems } from '@/data/defaultData'

export interface DbMenuItem {
  id: string
  name: string
  description: string | null
  price: string | null
  sizes: string | null
  add_ons: string | null
  /**
   * Server-authoritative station hint from menu_categories.is_bar
   * (migration 028). Null/absent = treat as kitchen.
   */
  category_is_bar?: boolean | null
}

// Emergency fallback — used only when Supabase is unreachable.
const fallbackMap = new Map<string, DbMenuItem>()
for (const item of defaultMenuItems) {
  fallbackMap.set(item.id, {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    price: String(item.price ?? 0),
    sizes: item.variants ? JSON.stringify(item.variants.map((v: any) => ({ name: v.name, price: v.price }))) : null,
    add_ons: item.addOns ? JSON.stringify(item.addOns.map((a: any) => ({ name: a.name, price: a.price }))) : null,
  })
}

export async function getMenuItemsByIds(ids: string[]): Promise<Map<string, DbMenuItem>> {
  if (ids.length === 0) return new Map()

  const result = new Map<string, DbMenuItem>()

  // Primary: Supabase lookup
  try {
    const { data, error } = await getAdminClient()
      .from('menu_items')
      .select('id, name, description, price, sizes, add_ons, menu_categories(is_bar)')
      .in('id', ids)
    if (!error && data) {
      for (const item of data) {
        const row = item as Record<string, unknown>
        const category = row.menu_categories as { is_bar?: boolean | null } | null | undefined
        result.set(item.id, {
          ...(row as unknown as DbMenuItem),
          category_is_bar: category?.is_bar ?? null,
        })
      }
    }
    if (error) {
      console.error('Supabase menu lookup error:', error.message)
    }
  } catch (fetchErr) {
    console.error('Supabase menu lookup threw:', (fetchErr as Error)?.message ?? fetchErr)
  }

  // Fallback for IDs not found in Supabase
  for (const id of ids) {
    if (!result.has(id)) {
      if (fallbackMap.has(id)) {
        console.warn(`menu item "${id}" not in Supabase — using local fallback. Run npm run seed:supabase-menu`)
        result.set(id, fallbackMap.get(id)!)
      } else {
        console.error('Menu item ID not found in any source:', id)
      }
    }
  }

  return result
}
