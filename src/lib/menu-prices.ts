import { supabaseAdmin } from './supabase'
import menuItemsData from '@/data/menu-items.json'
import { defaultMenuItems } from '@/data/defaultData'

export interface DbMenuItem {
  id: string
  name: string
  description: string | null
  price: string | null
  sizes: string | null
  add_ons: string | null
}

// Build map from defaultMenuItems (short IDs like bk1, bk2, pz1)
const defaultItemMap = new Map<string, DbMenuItem>()
for (const item of defaultMenuItems) {
  defaultItemMap.set(item.id, {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    price: String(item.price ?? 0),
    sizes: item.variants ? JSON.stringify(item.variants.map((v: any) => ({ name: v.name, price: v.price }))) : null,
    add_ons: item.addOns ? JSON.stringify(item.addOns.map((a: any) => ({ name: a.name, price: a.price }))) : null,
  })
}

// Build map from embedded JSON (UUID IDs)
const uuidItemMap = new Map<string, DbMenuItem>(
  (menuItemsData as DbMenuItem[]).map((item) => [item.id, item])
)

// Combined set of all known item IDs for extraction matching
const allKnownIds = new Set<string>()
for (const id of Array.from(defaultItemMap.keys())) allKnownIds.add(id)
for (const id of Array.from(uuidItemMap.keys())) allKnownIds.add(id)

/**
 * Extract base item ID from a composite cart ID.
 * Composite format: <baseId>[-<size>][-<N>extras]-<timestamp>
 * Examples:
 *   "bk2-1712345678901"           → "bk2"
 *   "bk2-Small-2extras-1712345678901" → "bk2"
 *   "dec9733a-...-1712345678901"    → "dec9733a-..."
 *   "dec9733a-...-Small-2extras-..." → "dec9733a-..."
 */
function extractBaseItemId(compositeId: string): string | null {
  if (allKnownIds.has(compositeId)) return compositeId
  const stripped = compositeId.replace(/-\d+$/, '')
  if (allKnownIds.has(stripped)) return stripped
  const parts = stripped.split('-')
  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('-')
    if (allKnownIds.has(candidate)) return candidate
  }
  return null
}

/**
 * Get menu item lookup map from Supabase, falling back to embedded data.
 * Extracts base IDs from composite cart IDs before looking up.
 */
export async function getMenuItemsByIds(ids: string[]): Promise<Map<string, DbMenuItem>> {
  if (ids.length === 0) return new Map()

  // First extract base IDs from any composite IDs
  const baseIds: string[] = []
  const notFound: string[] = []
  for (const id of ids) {
    const baseId = extractBaseItemId(id)
    if (baseId) {
      baseIds.push(baseId)
    } else {
      notFound.push(id)
    }
  }

  const result = new Map<string, DbMenuItem>()

  // Try Supabase first (UUID IDs)
  try {
    const uuidIds = baseIds.filter((id) => uuidItemMap.has(id))
    if (uuidIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('menu_items_supabase')
        .select('id, name, description, price, sizes, add_ons')
        .in('id', uuidIds)
      if (!error && data) {
        for (const item of data) result.set(item.id, item)
      }
    }
  } catch (fetchErr) {
    console.error('Supabase menu lookup threw:', (fetchErr as Error)?.message ?? fetchErr)
  }

  // Fill remaining from embedded UUID map
  for (const id of baseIds) {
    if (!result.has(id) && uuidItemMap.has(id)) {
      result.set(id, uuidItemMap.get(id)!)
    }
  }

  // Fill remaining from defaultMenuItems (short IDs)
  for (const id of baseIds) {
    if (!result.has(id) && defaultItemMap.has(id)) {
      result.set(id, defaultItemMap.get(id)!)
    }
  }

  // Log any IDs that still aren't found
  for (const id of baseIds) {
    if (!result.has(id)) {
      console.error('Menu item ID not found in any source:', id)
    }
  }

  return result
}

// Re-export extractBaseItemId for use in enrichItems
export { extractBaseItemId }
