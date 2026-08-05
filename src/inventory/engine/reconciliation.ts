import { getInventoryClient } from '../lib/db'
import type { InventoryType } from './types'

export interface ReconciliationRow {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number | null
  variance: number | null
  unitCost: number | null
  varianceValue: number | null
}

export async function getReconciliation(
  locationId: string,
  date?: string,
  inventoryType?: InventoryType,
): Promise<ReconciliationRow[]> {
  const supabase = getInventoryClient()
  const asAt = date ?? new Date().toISOString()

  let productQuery = supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  if (inventoryType) {
    productQuery = productQuery.eq('inventory_type', inventoryType)
  }

  const { data: products } = await productQuery
  if (!products || products.length === 0) return []

  const productIds = products.map(p => p.id)

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, unit_cost')
    .eq('location_id', locationId)
    .lte('created_at', asAt)
    .in('product_id', productIds)

  const { data: allTxns } = await txnQuery
  const txnMap = new Map<string, number>()
  const costMap = new Map<string, number | null>()

  for (const t of (allTxns ?? [])) {
    const prev = txnMap.get(t.product_id) ?? 0
    txnMap.set(t.product_id, prev + Number(t.quantity))
    if (t.unit_cost) costMap.set(t.product_id, Number(t.unit_cost))
  }

  return products.map(product => {
    const expected = txnMap.get(product.id) ?? 0
    const unitCost = costMap.get(product.id) ?? null
    return {
      productId: product.id,
      productName: product.name,
      expectedQuantity: expected,
      physicalQuantity: null,
      variance: null,
      unitCost,
      varianceValue: null,
    }
  })
}

export async function getInventoryValue(locationId: string): Promise<number> {
  const supabase = getInventoryClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: txns } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity, unit_cost')
    .eq('location_id', locationId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  if (!txns || txns.length === 0) return 0

  const productBalances = new Map<string, { qty: number; cost: number | null }>()
  for (const t of txns) {
    const current = productBalances.get(t.product_id) ?? { qty: 0, cost: null }
    current.qty += Number(t.quantity)
    if (t.unit_cost) current.cost = Number(t.unit_cost)
    productBalances.set(t.product_id, current)
  }

  let total = 0
  for (const { qty, cost } of productBalances.values()) {
    if (cost !== null && qty > 0) total += qty * cost
  }
  return total
}
