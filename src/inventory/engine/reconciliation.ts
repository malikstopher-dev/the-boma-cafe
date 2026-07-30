import { getInventoryClient } from '../lib/db'

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
): Promise<ReconciliationRow[]> {
  const supabase = getInventoryClient()
  const asAt = date ?? new Date().toISOString()

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  if (!products) return []

  const rows: ReconciliationRow[] = []
  for (const product of products) {
    const { data: txns } = await supabase
      .from('inventory_transactions')
      .select('quantity, unit_cost')
      .eq('product_id', product.id)
      .eq('location_id', locationId)
      .lte('created_at', asAt)

    const expected = (txns ?? []).reduce((s, t) => s + Number(t.quantity), 0)
    const unitCost = txns?.find(t => t.unit_cost)?.unit_cost ?? null

    rows.push({
      productId: product.id,
      productName: product.name,
      expectedQuantity: expected,
      physicalQuantity: null,
      variance: null,
      unitCost: unitCost ? Number(unitCost) : null,
      varianceValue: null,
    })
  }

  return rows
}

export async function getInventoryValue(locationId: string): Promise<number> {
  const supabase = getInventoryClient()
  const { data: txns } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity, unit_cost')
    .eq('location_id', locationId)

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
