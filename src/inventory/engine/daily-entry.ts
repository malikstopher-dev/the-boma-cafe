import type { InventoryType } from './types'
import { getInventoryClient } from '../lib/db'
import { createStockCount, saveCountItem, approveStockCount, submitStockCount } from './stock-counts'
import { getProductConversion, toBaseUnit } from './conversion'
import { resolveLocationId } from '../lib/location'

export interface DailyEntryItem {
  productId: string
  productName: string
  sku: string | null
  sectionLabel: string
  countUomId: string | null
  countUomName: string | null
  factor: number // count unit -> base unit (1 when unconfigured)
  expectedUnits: number // expected balance expressed in count units
  countedUnits: number | null // physical count in count units
  baseExpected: number
  baseCounted: number | null
  varianceUnits: number | null
  varianceValue: number | null
  unitCost: number | null
}

export interface DailyEntrySection {
  profileId: string
  profileName: string
  sectionLabel: string
  countUomId: string | null
  countUomName: string | null
  items: DailyEntryItem[]
}

export interface DailyEntrySheet {
  sessionId: string
  sessionStatus: string
  locationId: string
  locationName: string
  date: string
  week: number
  sections: DailyEntrySection[]
  countedProducts: number
  totalProducts: number
}

function iterate<T>(rows: T[] | null | undefined): T[] {
  return rows ?? []
}

/** Find today's/the day's daily session for a location, creating it if absent. */
export async function getOrCreateDailySession(
  locationId: string,
  dateIso: string,
  performedBy?: string | null,
): Promise<{ id: string; status: string; locationId: string }> {
  const supabase = getInventoryClient()
  const notes = `daily:${dateIso}`

  const { data: existing } = await supabase
    .from('inventory_stock_counts')
    .select('id, status, location_id')
    .eq('location_id', locationId)
    .eq('notes', notes)
    .maybeSingle()

  if (existing) {
    return { id: existing.id as string, status: existing.status as string, locationId: existing.location_id as string }
  }

  const created = await createStockCount(locationId, performedBy, notes)
  return { id: created.stockCount.id, status: created.stockCount.status, locationId }
}

/**
 * The spreadsheet sheet for a location + date:
 * rows are (product × counting section) pairs; expected balances are
 * computed from the ledger as at end of the given date.
 */
export async function getDailySheet(
  locationId: string,
  dateIso: string,
  inventoryType?: InventoryType | null,
): Promise<DailyEntrySheet> {
  const supabase = getInventoryClient()
  const resolvedLocationId = await resolveLocationId(locationId)
  if (!resolvedLocationId) throw new Error('No active inventory location found')
  const session = await getOrCreateDailySession(resolvedLocationId, dateIso)

  const asAtIso = dateIso + 'T23:59:59.999Z'

  // 1. Active profiles for this location (or global) + their items
  let profileQuery = supabase
    .from('inventory_count_profiles')
    .select('*, inventory_count_profile_items(*, inventory_products(id, name, sku))')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: profiles } = await profileQuery
  const matchedProfiles = iterate(profiles).filter(
    p => (p.location_id === null || p.location_id === resolvedLocationId)
      && (!inventoryType || p.inventory_type === null || p.inventory_type === inventoryType),
  )

  const sectionMap = new Map<string, { profileId: string; profileName: string; sectionLabel: string; countUomId: string | null; items: Array<{ product_id: string; count_uom_id: string | null; section_label: string }> }>()

  const productIds = new Set<string>()
  for (const p of matchedProfiles) {
    const items = iterate((p as { inventory_count_profile_items?: Array<Record<string, unknown>> }).inventory_count_profile_items)
    if (items.length === 0) continue
    const key = p.id as string
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        profileId: key,
        profileName: p.name as string,
        sectionLabel: (items[0]?.section_label as string) || 'General',
        countUomId: (items[0]?.count_uom_id as string | null) ?? null,
        items: [],
      })
    }
    for (const it of items) {
      sectionMap.get(key)!.items.push({
        product_id: it.product_id as string,
        count_uom_id: (it.count_uom_id as string | null) ?? null,
        section_label: (it.section_label as string) || 'General',
      })
      productIds.add(it.product_id as string)
    }
  }

  // 2. Fallback: no profiles configured -> one "All Products" section in base units
  let fallbackProducts: Array<{ id: string; name: string; sku: string | null }> = []
  if (sectionMap.size === 0) {
    let q = supabase.from('inventory_products').select('id, name, sku').eq('is_active', true)
    if (inventoryType) q = q.eq('inventory_type', inventoryType)
    const { data } = await q
    fallbackProducts = iterate(data).map(p => ({ id: p.id as string, name: p.name as string, sku: p.sku as string | null }))
    for (const p of fallbackProducts) productIds.add(p.id)
  }

  // 3. Expected balances at end of the day (base units) + latest unit cost
  const expectedMap = new Map<string, number>()
  const costMap = new Map<string, number | null>()
  if (productIds.size > 0) {
    const { data: txns } = await supabase
      .from('inventory_transactions')
      .select('product_id, quantity, unit_cost')
      .eq('location_id', resolvedLocationId)
      .lte('created_at', asAtIso)
      .in('product_id', [...productIds])

    for (const t of iterate(txns)) {
      const pid = t.product_id as string
      expectedMap.set(pid, (expectedMap.get(pid) ?? 0) + (Number(t.quantity) || 0))
      const cost = t.unit_cost as number | null
      if (cost) costMap.set(pid, Number(cost))
    }
  }

  // 4. Counted physical quantities (base units) already saved this session
  const { data: savedItems } = await supabase
    .from('inventory_stock_count_items')
    .select('product_id, physical_quantity, expected_quantity')
    .eq('stock_count_id', session.id)
  const countedBaseMap = new Map<string, number>()
  for (const it of iterate(savedItems)) {
    countedBaseMap.set(it.product_id as string, Number(it.physical_quantity) || 0)
  }

  // 5. Build sections
  const sections: DailyEntrySection[] = []
  let countedProducts = 0
  let totalProducts = 0

  const buildItem = async (productId: string, sectionLabel: string, countUomId: string | null): Promise<DailyEntryItem | null> => {
    const fallbackMeta = fallbackProducts.find(p => p.id === productId)
    const profileMeta = !fallbackMeta
      ? matchedProfiles
          .flatMap(p => iterate((p as { inventory_count_profile_items?: Array<Record<string, unknown>> }).inventory_count_profile_items))
          .find(i => i.product_id === productId)
      : undefined
    if (!fallbackMeta && !profileMeta) return null

    const name = fallbackMeta ? fallbackMeta.name : typeof profileMeta?.name === 'string' ? profileMeta.name : 'Unknown product'
    const sku = fallbackMeta
      ? fallbackMeta.sku
      : profileMeta?.sku === null || profileMeta?.sku === undefined
        ? null
        : String(profileMeta.sku)
    const baseExpected = expectedMap.get(productId) ?? 0
    const baseCounted = countedBaseMap.get(productId) ?? null

    let factor = 1
    let countUomName: string | null = null
    if (countUomId) {
      const f = await getProductConversion(productId, countUomId)
      if (f !== null && f > 0) factor = Number(f)
      const { data: uom } = await supabase.from('inventory_uoms').select('name').eq('id', countUomId).maybeSingle()
      countUomName = (uom?.name as string | null) ?? null
      if (factor === 1 && countUomName) {
        try {
          const baseCheck = await toBaseUnit(1, countUomId, productId)
          if (baseCheck > 0) factor = baseCheck
        } catch {
          /* unconfigured product uom — count in base units */
        }
      }
    }

    const expectedUnits = baseExpected / factor
    const countedUnits = baseCounted === null ? null : baseCounted / factor
    const varianceUnits = countedUnits === null ? null : countedUnits - expectedUnits
    const unitCost = costMap.get(productId) ?? null

    totalProducts += 1
    if (countedUnits !== null) countedProducts += 1

    return {
      productId,
      productName: name,
      sku,
      sectionLabel,
      countUomId,
      countUomName,
      factor,
      expectedUnits,
      countedUnits,
      baseExpected,
      baseCounted,
      varianceUnits,
      varianceValue: unitCost === null ? null : Math.abs(varianceUnits ?? 0) * unitCost * factor,
      unitCost,
    }
  }

  for (const entry of sectionMap.values()) {
    const items: DailyEntryItem[] = []
    let order = 0
    for (const i of entry.items) {
      const item = await buildItem(i.product_id, i.section_label, i.count_uom_id)
      if (item) items.push(item)
      order += 1
    }
    if (items.length > 0) {
      sections.push({
        profileId: entry.profileId,
        profileName: entry.profileName,
        sectionLabel: entry.sectionLabel,
        countUomId: entry.countUomId,
        countUomName: items[0]?.countUomName ?? null,
        items,
      })
    }
  }

  if (sections.length === 0 && fallbackProducts.length > 0) {
    const items: DailyEntryItem[] = []
    for (const p of fallbackProducts) {
      const item = await buildItem(p.id, 'All Products', null)
      if (item) items.push(item)
    }
    sections.push({
      profileId: 'fallback',
      profileName: inventoryType ? `${inventoryType} Products` : 'All Products',
      sectionLabel: 'All Products',
      countUomId: null,
      countUomName: null,
      items,
    })
  }

  const { data: location } = await supabase.from('inventory_locations').select('name').eq('id', resolvedLocationId).maybeSingle()

  return {
    sessionId: session.id,
    sessionStatus: session.status,
    locationId: resolvedLocationId,
    locationName: (location?.name as string) ?? 'Location',
    date: dateIso,
    week: (await import('../lib/weeks')).weekNumber(new Date(dateIso + 'T12:00:00')),
    sections,
    countedProducts,
    totalProducts,
  }
}

/** Save one cell: counted quantity (in count units) -> converted to base units. */
export async function saveDailyCell(
  sessionId: string,
  productId: string,
  countedUnits: number,
): Promise<DailyEntryItem> {
  const supabase = getInventoryClient()

  const { data: session } = await supabase
    .from('inventory_stock_counts')
    .select('id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) throw new Error('Daily session not found')
  if (session.status !== 'in_progress') throw new Error(`Session is ${session.status}, not editable`)

  // Find the count uom configured for this product
  const { data: link } = await supabase
    .from('inventory_count_profile_items')
    .select('count_uom_id')
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle()

  let factor = 1
  if (link?.count_uom_id) {
    const f = await getProductConversion(productId, link.count_uom_id as string)
    if (f !== null && f > 0) factor = Number(f)
  }

  const baseQty = countedUnits * factor
  await saveCountItem(sessionId, productId, baseQty)
  return { productId, countedUnits } as unknown as DailyEntryItem
}

/** Delete one counted cell (row removal from the sheet). */
export async function deleteDailyCell(sessionId: string, productId: string): Promise<void> {
  const supabase = getInventoryClient()

  const { data: session } = await supabase
    .from('inventory_stock_counts')
    .select('id, status')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) throw new Error('Daily session not found')
  if (session.status !== 'in_progress') throw new Error(`Session is ${session.status}, not editable`)

  const { error } = await supabase
    .from('inventory_stock_count_items')
    .delete()
    .eq('stock_count_id', sessionId)
    .eq('product_id', productId)

  if (error) throw new Error(`Failed to delete cell: ${error.message}`)
}

export async function submitDailySession(sessionId: string): Promise<void> {
  await submitStockCount(sessionId)
}

export async function approveDailySession(sessionId: string, approvedBy: string | null): Promise<void> {
  await approveStockCount(sessionId, approvedBy)
}