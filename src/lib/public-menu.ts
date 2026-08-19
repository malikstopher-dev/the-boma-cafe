import { getAdminClient } from '@/lib/supabase'
import migrationManifest from '../../scripts/menu-image-migration/manifest.json'

export type PublicMenuView = 'menu' | 'homepage' | 'waiter'

export const PUBLIC_MENU_CATEGORY_SELECT = 'id,name,description,order_index,is_active,is_bar'
export const PUBLIC_MENU_ITEM_SELECT = 'id,category_id,name,description,price,sizes,add_ons,options,is_available,is_featured,is_on_promo,promo_badge,order_index,available_for_all_order_types'
export const HOMEPAGE_MENU_ITEM_SELECT = 'id,name,description,price,is_available,is_featured,order_index'
export const WAITER_MENU_ITEM_SELECT = 'id,category_id,name,description,price,is_available,order_index'
export const PUBLIC_MENU_IMAGE_SELECT = 'id,image'
export const PUBLIC_MENU_INLINE_IMAGE_FILTER = '%data:%'

export const PUBLIC_MENU_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

interface MenuCategoryRow {
  id: string
  name: string
  description: string | null
  order_index: number
  is_active: boolean
  is_bar: boolean | null
}

interface MenuItemRow {
  id: string
  category_id?: string | null
  name: string
  description: string | null
  price: number | string | null
  sizes?: string | null
  add_ons?: string | null
  options?: string | null
  is_available: boolean
  is_featured?: boolean | null
  is_on_promo?: boolean | null
  promo_badge?: string | null
  order_index: number
  available_for_all_order_types?: boolean | null
}

interface MenuImageRow {
  id: string
  image: string | null
}

const migratedImageById = new Map(
  migrationManifest.entries.map(entry => [entry.menuItemId, entry.proposedImage.finalPath]),
)

function safeJsonParse(value: string | null | undefined): Array<Record<string, unknown>> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter(item => item !== null && typeof item === 'object') as Array<Record<string, unknown>>
      : null
  } catch {
    return null
  }
}

export function isDataUri(value: unknown): value is string {
  return typeof value === 'string' && /^\s*data:/i.test(value)
}

export function sanitizePublicPayload<T>(value: T): T {
  if (isDataUri(value)) return null as T
  if (Array.isArray(value)) return value.map(item => sanitizePublicPayload(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizePublicPayload(item)]),
    ) as T
  }
  return value
}

export function resolvePublicMenuImage(id: string, value?: string | null): string | null {
  if (value && !isDataUri(value)) return value
  return migratedImageById.get(id) ?? null
}

export function mapPublicMenuPayload(
  view: PublicMenuView,
  categories: MenuCategoryRow[],
  items: MenuItemRow[],
  imageRows: MenuImageRow[] = [],
): Record<string, unknown> {
  const images = new Map(imageRows.map(row => [row.id, resolvePublicMenuImage(row.id, row.image)]))

  if (view === 'homepage') {
    return sanitizePublicPayload({
      menuItems: items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        image: images.get(item.id) ?? resolvePublicMenuImage(item.id),
        isAvailable: item.is_available,
        isFeatured: item.is_featured === true,
      })),
    })
  }

  const mappedCategories = categories
    .filter(category => category.is_active)
    .map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      isActive: category.is_active,
      isBar: category.is_bar === true,
      order: category.order_index,
    }))

  if (view === 'waiter') {
    return sanitizePublicPayload({
      categories: mappedCategories,
      menuItems: items.map(item => ({
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        isAvailable: item.is_available,
        order: item.order_index,
      })),
    })
  }

  return sanitizePublicPayload({
    categories: mappedCategories,
    menuItems: items.map(item => {
      const sizes = safeJsonParse(item.sizes)
      const addOns = safeJsonParse(item.add_ons)
      const options = safeJsonParse(item.options)
      return {
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        image: images.get(item.id) ?? resolvePublicMenuImage(item.id),
        sizes: sizes ? sizes.map(size => ({ ...size, price: Number(size.price) })) : null,
        addOns: addOns ? addOns.map(addOn => ({ ...addOn, price: Number(addOn.price) })) : null,
        options,
        isAvailable: item.is_available,
        isFeatured: item.is_featured === true,
        isOnPromo: item.is_on_promo === true,
        promoBadge: item.promo_badge,
        availableForAllOrderTypes: item.available_for_all_order_types !== false,
        order: item.order_index,
      }
    }),
  })
}

export async function loadPublicMenu(view: PublicMenuView): Promise<Record<string, unknown>> {
  const client = getAdminClient()

  if (view === 'homepage') {
    const { data: items, error: itemsError } = await client
      .from('menu_items')
      .select(HOMEPAGE_MENU_ITEM_SELECT)
      .eq('is_available', true)
      .eq('is_featured', true)
      .order('order_index', { ascending: true })
      .limit(4)

    if (itemsError) throw itemsError
    const ids = (items ?? []).map(item => item.id)
    let imageRows: MenuImageRow[] = []
    if (ids.length > 0) {
      const { data: images, error: imageError } = await client
        .from('menu_items')
        .select(PUBLIC_MENU_IMAGE_SELECT)
        .in('id', ids)
        .not('image', 'is', null)
        .not('image', 'ilike', PUBLIC_MENU_INLINE_IMAGE_FILTER)
      if (imageError) throw imageError
      imageRows = (images ?? []) as MenuImageRow[]
    }
    return mapPublicMenuPayload('homepage', [], (items ?? []) as MenuItemRow[], imageRows)
  }

  const itemSelect = view === 'waiter' ? WAITER_MENU_ITEM_SELECT : PUBLIC_MENU_ITEM_SELECT
  const baseQueries = [
    client.from('menu_categories').select(PUBLIC_MENU_CATEGORY_SELECT).order('order_index', { ascending: true }),
    client.from('menu_items').select(itemSelect).eq('is_available', true).order('order_index', { ascending: true }).limit(300),
  ] as const

  if (view === 'waiter') {
    const [categoriesResult, itemsResult] = await Promise.all(baseQueries)
    if (categoriesResult.error) throw categoriesResult.error
    if (itemsResult.error) throw itemsResult.error
    return mapPublicMenuPayload('waiter', categoriesResult.data as MenuCategoryRow[], itemsResult.data as unknown as MenuItemRow[])
  }

  const [categoriesResult, itemsResult, imagesResult] = await Promise.all([
    ...baseQueries,
    client
      .from('menu_items')
      .select(PUBLIC_MENU_IMAGE_SELECT)
      .eq('is_available', true)
      .not('image', 'is', null)
      .not('image', 'ilike', PUBLIC_MENU_INLINE_IMAGE_FILTER)
      .limit(300),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (itemsResult.error) throw itemsResult.error
  if (imagesResult.error) throw imagesResult.error
  return mapPublicMenuPayload(
    'menu',
    categoriesResult.data as MenuCategoryRow[],
    itemsResult.data as unknown as MenuItemRow[],
    imagesResult.data as MenuImageRow[],
  )
}
