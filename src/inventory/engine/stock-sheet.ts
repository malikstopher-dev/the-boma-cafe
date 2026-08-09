// Stock sheet — Excel-like movement report per product over a date range.
// Every figure is calculated from the transaction ledger (single source of truth).

import { getInventoryClient } from '../lib/db'
import { resolveLocationId } from '../lib/location'

export interface StockSheetRow {
  productId: string
  productName: string
  sku: string | null
  category: string | null
  unit: string | null
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

interface RawEntry {
  product_id: string
  quantity: number
  unit_cost: number | null
  transaction_type: string
  created_at: string
}

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
): Promise<StockSheetResult> {
  const supabase = getInventoryClient()
  const resolved = await resolveLocationId(locationId ?? null)
  const location = resolved ?? null

  const startIso = `${from}T00:00:00.000Z`
  const endIso = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000).toISOString()
  const MAX = 10000

  const rangeQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, unit_cost, transaction_type, created_at')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false })
    .limit(MAX)

  const beforeQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity')
    .lt('created_at', startIso)
    .limit(MAX)

  const [rangeRes, beforeRes, locRes] = await Promise.all([
    location ? rangeQuery.eq('location_id', location) : rangeQuery,
    location ? beforeQuery.eq('location_id', location) : beforeQuery,
    getInventoryClient().from('inventory_locations').select('id, name').eq('is_active', true),
  ])

  const rangeTxns = (rangeRes.data ?? []) as unknown as RawEntry[]
  const beforeTxns = (beforeRes.data ?? []) as unknown as RawEntry[]

  // Opening balance per product (ledger sum before the range)
  const openingMap = new Map<string, number>()
  for (const t of beforeTxns) {
    openingMap.set(t.product_id, (openingMap.get(t.product_id) ?? 0) + (Number(t.quantity) || 0))
  }

  // Persist rows in the same shape (products may appear in one query but not the other)
  const productIds = new Set<string>()
  for (const t of rangeTxns) productIds.add(t.product_id)
  for (const t of beforeTxns) productIds.add(t.product_id)

  // Product metadata
  const productMeta = new Map<string, { name: string; sku: string | null; category: string | null; unit: string | null }>()
  if (productIds.size > 0) {
    const { data: products } = await getInventoryClient()
      .from('inventory_products')
      .select('id, name, sku, inventory_categories(name)')
      .in('id', [...productIds])
    for (const p of (products ?? []) as unknown as Array<{
      id: string
      name: string
      sku: string | null
      inventory_categories?: { name: string } | null
    }>) {
      productMeta.set(p.id, {
        name: p.name,
        sku: p.sku,
        category: p.inventory_categories?.name ?? null,
        unit: null,
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

  for (const t of beforeTxns) ensure(t.product_id)
  for (const t of rangeTxns) {
    const row = ensure(t.product_id)
    const b = bucket(t.quantity, t.transaction_type)
    row.received += b.received
    row.used += b.used
    row.waste += b.waste
    row.adjustments += b.adjustments
  }

  const rows: StockSheetRow[] = []
  for (const [productId, v] of agg) {
    const meta = productMeta.get(productId)
    const closing = v.opening + v.received - v.used - v.waste + v.adjustments
    const unitCost = costMap.get(productId) ?? 0
    rows.push({
      productId,
      productName: meta?.name ?? 'Unknown product',
      sku: meta?.sku ?? null,
      category: meta?.category ?? null,
      unit: meta?.unit ?? null,
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

  const locationName =
    location === null
      ? 'All locations'
      : ((locRes.data ?? []) as unknown as Array<{ id: string; name: string }>).find(l => l.id === location)?.name ?? null

  return { rows, totals, from, to, locationId: location, locationName }
}