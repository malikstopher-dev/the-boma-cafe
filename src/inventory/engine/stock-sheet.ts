// Stock sheet — Excel-like movement report per product over a date range.
// Every figure is calculated from the transaction ledger (single source of truth).

import { getInventoryClient } from '../lib/db'
import { resolveLocationId } from '../lib/location'
import type { InventoryType } from './types'

export interface StockSheetRow {
  productId: string
  productName: string
  sku: string | null
  category: string | null
  unit: string | null
  inventoryType: InventoryType | string | null
  supplierName: string | null
  reorderThreshold: number | null
  reorderQuantity: number | null
  opening: number
  received: number
  used: number
  waste: number
  adjustments: number
  closing: number
  unitCost: number
  value: number
}

export interface StockSheetTotals {
  opening: number
  received: number
  used: number
  waste: number
  adjustments: number
  closing: number
  value: number
}

export interface StockSheetResult {
  rows: StockSheetRow[]
  totals: StockSheetTotals
  from: string
  to: string
  locationId: string | null
  locationName: string | null
}

const WASTE_TYPES = new Set(['waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'breakage'])
const USED_TYPES = new Set(['sale', 'sale_bottle', 'comp', 'staff'])
const PRODUCED_TYPES = new Set(['production'])
const RECEIVED_TYPES = new Set(['purchase', 'return'])

function bucket(qty: number, type: string): { received: number; used: number; waste: number; adjustments: number } {
  const t = (type || '').toLowerCase()
  const q = Number(qty) || 0
  const abs = Math.abs(q)

  if (RECEIVED_TYPES.has(t)) return { received: q > 0 ? q : 0, used: 0, waste: 0, adjustments: 0 }
  if (WASTE_TYPES.has(t)) return { received: 0, used: 0, waste: q < 0 ? abs : 0, adjustments: 0 }
  if (PRODUCED_TYPES.has(t)) return { received: q > 0 ? q : 0, used: q < 0 ? abs : 0, waste: 0, adjustments: 0 }
  if (USED_TYPES.has(t)) return { received: 0, used: q < 0 ? abs : 0, waste: 0, adjustments: 0 }
  // structural / count / transfer / conversion / opening / closing
  return { received: 0, used: 0, waste: 0, adjustments: q }
}

export async function getStockSheet(
  from: string,
  to: string,
  locationId?: string | null,
  inventoryType?: InventoryType | null,
): Promise<StockSheetResult> {
  const supabase = getInventoryClient()
  const resolved = await resolveLocationId(locationId ?? null)
  const location = resolved ?? null

  const startIso = `${from}T00:00:00.000Z`
  const endIso = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000).toISOString()

  // Aggregated server-side (RPC, migration 070) instead of downloading ledger
  // rows: egress is one row per (product, type) regardless of ledger size, and
  // the old "before range" scan no longer re-downloads the product's entire
  // lifetime movement capped at 10k rows. The RPC returns sign-split sums so
  // the per-row bucketing semantics of bucket() stay exact.
  interface OpeningRow { product_id: string; opening: number | null }
  interface MovementRow { product_id: string; transaction_type: string; positive_qty: number | null; negative_qty: number | null }

  const [openingRes, movementsRes, locRes] = await Promise.all([
    supabase.rpc('stock_sheet_opening', { p_start: startIso, p_location: location }) as unknown as Promise<{ data: OpeningRow[] | null; error: { message: string } | null }>,
    supabase.rpc('stock_sheet_movements', { p_start: startIso, p_end: endIso, p_location: location }) as unknown as Promise<{ data: MovementRow[] | null; error: { message: string } | null }>,
    getInventoryClient().from('inventory_locations').select('id, name').eq('is_active', true),
  ])

  if (openingRes.error || movementsRes.error) {
    throw new Error(`Failed to aggregate stock movements: ${openingRes.error?.message ?? movementsRes.error?.message}`)
  }

  const openingAggs = (openingRes.data ?? []) as OpeningRow[]
  const movementAggs = (movementsRes.data ?? []) as MovementRow[]

  // Opening balance per product (ledger sum before the range)
  const openingMap = new Map<string, number>()
  for (const a of openingAggs) {
    openingMap.set(a.product_id, (openingMap.get(a.product_id) ?? 0) + (Number(a.opening) ?? 0))
  }

  // Persist rows in the same shape (products may appear in one query but not the other)
  const productIds = new Set<string>()
  for (const a of openingAggs) productIds.add(a.product_id)
  for (const a of movementAggs) productIds.add(a.product_id)

  // Product metadata
  const productMeta = new Map<string, {
    name: string
    sku: string | null
    category: string | null
    unit: string | null
    inventoryType: InventoryType | string | null
    supplierName: string | null
    reorderThreshold: number | null
    reorderQuantity: number | null
  }>()
  if (productIds.size > 0) {
    const { data: products } = await getInventoryClient()
      .from('inventory_products')
      .select('id, name, sku, inventory_type, reorder_threshold, reorder_quantity, preferred_supplier_id, inventory_categories(name), inventory_suppliers(name), inventory_product_uoms(is_base, inventory_uoms(name))')
      .in('id', [...productIds])
    for (const p of (products ?? []) as unknown as Array<{
      id: string
      name: string
      sku: string | null
      inventory_type: string | null
      reorder_threshold: number | null
      reorder_quantity: number | null
      preferred_supplier_id: string | null
      inventory_categories?: { name: string } | null
      inventory_suppliers?: { name: string } | null
      inventory_product_uoms?: Array<{ is_base: boolean; inventory_uoms?: { name: string } | null }> | null
    }>) {
      const uoms = (p.inventory_product_uoms ?? []).filter(u => u.inventory_uoms)
      const baseUom = uoms.find(u => u.is_base) ?? uoms[0]
      productMeta.set(p.id, {
        name: p.name,
        sku: p.sku,
        category: p.inventory_categories?.name ?? null,
        unit: baseUom?.inventory_uoms?.name ?? null,
        inventoryType: p.inventory_type ?? null,
        supplierName: p.inventory_suppliers?.name ?? null,
        reorderThreshold: p.reorder_threshold != null ? Number(p.reorder_threshold) : null,
        reorderQuantity: p.reorder_quantity != null ? Number(p.reorder_quantity) : null,
      })
    }
  }

  // Latest unit cost per product (most recent purchase price up to the end of the range)
  const { data: latestCosts } = await getInventoryClient()
    .from('inventory_transactions')
    .select('product_id, unit_cost, created_at')
    .eq('transaction_type', 'purchase')
    .not('unit_cost', 'is', null)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false })
    .limit(2000)
  const costMap = new Map<string, number>()
  for (const c of (latestCosts ?? []) as unknown as Array<{ product_id: string; unit_cost: number | null }>) {
    if (!costMap.has(c.product_id)) costMap.set(c.product_id, Number(c.unit_cost) ?? 0)
  }

  const agg = new Map<string, { opening: number; received: number; used: number; waste: number; adjustments: number }>()
  const ensure = (id: string) => {
    let row = agg.get(id)
    if (!row) {
      row = { opening: openingMap.get(id) ?? 0, received: 0, used: 0, waste: 0, adjustments: 0 }
      agg.set(id, row)
    }
    return row
  }

  for (const a of openingAggs) ensure(a.product_id)

  // The RPC returns sign-split sums per (product, type); feeding each sign
  // through the same per-row bucket() preserves the exact old semantics
  // (e.g. negative purchase rows never count toward received).
  for (const a of movementAggs) {
    const row = ensure(a.product_id)
    const pos = bucket(Number(a.positive_qty) ?? 0, a.transaction_type)
    const neg = bucket(Number(a.negative_qty) ?? 0, a.transaction_type)
    row.received += pos.received + neg.received
    row.used += pos.used + neg.used
    row.waste += pos.waste + neg.waste
    row.adjustments += pos.adjustments + neg.adjustments
  }

  const rows: StockSheetRow[] = []
  for (const [productId, v] of agg) {
    const meta = productMeta.get(productId)
    if (inventoryType && meta?.inventoryType !== inventoryType) continue
    const closing = v.opening + v.received - v.used - v.waste + v.adjustments
    const unitCost = costMap.get(productId) ?? 0
    rows.push({
      productId,
      productName: meta?.name ?? 'Unknown product',
      sku: meta?.sku ?? null,
      category: meta?.category ?? null,
      unit: meta?.unit ?? null,
      inventoryType: meta?.inventoryType ?? null,
      supplierName: meta?.supplierName ?? null,
      reorderThreshold: meta?.reorderThreshold ?? null,
      reorderQuantity: meta?.reorderQuantity ?? null,
      opening: v.opening,
      received: v.received,
      used: v.used,
      waste: v.waste,
      adjustments: v.adjustments,
      closing,
      unitCost,
      value: closing * unitCost,
    })
  }

  rows.sort((a, b) => a.productName.localeCompare(b.productName))

  const totals: StockSheetTotals = rows.reduce(
    (acc, r) => ({
      opening: acc.opening + r.opening,
      received: acc.received + r.received,
      used: acc.used + r.used,
      waste: acc.waste + r.waste,
      adjustments: acc.adjustments + r.adjustments,
      closing: acc.closing + r.closing,
      value: acc.value + r.value,
    }),
    { opening: 0, received: 0, used: 0, waste: 0, adjustments: 0, closing: 0, value: 0 },
  )

  const filteredRows = inventoryType ? rows.filter(r => r.inventoryType === inventoryType) : rows

  const locationName =
    location === null
      ? 'All locations'
      : ((locRes.data ?? []) as unknown as Array<{ id: string; name: string }>).find(l => l.id === location)?.name ?? null

  return { rows: filteredRows, totals, from, to, locationId: location, locationName }
}