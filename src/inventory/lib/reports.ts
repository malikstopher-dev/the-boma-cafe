import { getInventoryClient } from './db'
import type { InventoryType } from '@/inventory/engine/types'
import { getStockSheet } from '@/inventory/engine/stock-sheet'
import { WASTE_LOSS_TYPES } from '@/inventory/lib/movement-classification'

function getClient() {
  return getInventoryClient()
}

export interface DailyStockReportRow {
  productId: string
  productName: string
  sku: string | null
  category: string | null
  openingBalance: number
  purchases: number
  sales: number
  internalConsumption: number
  wasteLoss: number
  adjustments: number
  physicalCountVariance: number
  closingBalance: number
}

export async function dailyStockReport(date: string, locationId: string, inventoryType?: InventoryType): Promise<DailyStockReportRow[]> {
  const sheet = await getStockSheet(date, date, locationId, inventoryType)
  return sheet.rows.map(row => ({
    productId: row.productId,
    productName: row.productName,
    sku: row.sku,
    category: row.category,
    openingBalance: row.opening,
    purchases: row.received,
    sales: row.sold,
    internalConsumption: row.internalConsumption,
    wasteLoss: row.waste,
    adjustments: row.adjustments,
    physicalCountVariance: row.physicalCountVariance,
    closingBalance: row.closing,
  }))
}

export interface VarianceReportRow {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number
  variance: number
  variancePct: number
}

export async function varianceReport(stockCountId: string): Promise<VarianceReportRow[]> {
  const supabase = getClient()

  const { data: items, error } = await supabase
    .from('inventory_stock_count_items')
    .select('*, inventory_products!inner(id, name)')
    .eq('stock_count_id', stockCountId)

  if (error) throw new Error(`Failed to load variance report: ${error.message}`)
  if (!items) return []

  return items.map((item: any) => {
    const expected = Number(item.expected_quantity ?? 0)
    const physical = Number(item.physical_quantity)
    const variance = physical - expected
    return {
      productId: item.product_id,
      productName: item.inventory_products?.name ?? item.product_id,
      expectedQuantity: expected,
      physicalQuantity: physical,
      variance,
      variancePct: expected > 0 ? (variance / expected) * 100 : 0,
    }
  })
}

export interface WasteReportRow {
  transactionType: string
  productId: string
  productName: string
  quantity: number
  date: string
  performedBy: string | null
  notes: string | null
}

export async function wasteReport(from: string, to: string, locationId: string, inventoryType?: InventoryType): Promise<WasteReportRow[]> {
  const supabase = getClient()

  let query = supabase
    .from('inventory_transactions')
    .select('*, inventory_products!inner(id, name)')
    .eq('location_id', locationId)
    .in('transaction_type', [...WASTE_LOSS_TYPES])
    .gte('created_at', from)
    .lte('created_at', to)

  if (inventoryType) query = query.eq('inventory_products.inventory_type', inventoryType)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load waste report: ${error.message}`)
  if (!data) return []

  return data.map((item: any) => ({
    transactionType: item.transaction_type,
    productId: item.product_id,
    productName: item.inventory_products?.name ?? item.product_id,
    quantity: Math.abs(Number(item.quantity)),
    date: item.created_at,
    performedBy: item.performed_by,
    notes: item.notes,
  }))
}

export interface FastSlowMoverRow {
  productId: string
  productName: string
  totalQuantity: number
  transactionCount: number
}

export async function fastMovers(days: number, limit: number, locationId: string, inventoryType?: InventoryType): Promise<FastSlowMoverRow[]> {
  const supabase = getClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let query = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, inventory_products!inner(id, name)')
    .eq('location_id', locationId)
    .in('transaction_type', ['sale', 'sale_bottle'])
    .gte('created_at', since)

  if (inventoryType) query = query.eq('inventory_products.inventory_type', inventoryType)

  const { data, error } = await query

  if (error) throw new Error(`Failed to load fast movers: ${error.message}`)
  if (!data) return []

  const grouped = new Map<string, { name: string; total: number; count: number }>()
  for (const item of data as any[]) {
    const pid = item.product_id
    if (!grouped.has(pid)) {
      grouped.set(pid, { name: item.inventory_products?.name ?? pid, total: 0, count: 0 })
    }
    const g = grouped.get(pid)!
    g.total += Math.abs(Number(item.quantity))
    g.count++
  }

  return Array.from(grouped.entries())
    .map(([productId, data]) => ({ productId, productName: data.name, totalQuantity: data.total, transactionCount: data.count }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit)
}

export async function slowMovers(days: number, limit: number, locationId: string, inventoryType?: InventoryType): Promise<FastSlowMoverRow[]> {
  const supabase = getClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let productQuery = supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  if (inventoryType) productQuery = productQuery.eq('inventory_type', inventoryType)

  const { data: products, error: productsError } = await productQuery

  if (productsError) throw new Error(`Failed to load slow-mover products: ${productsError.message}`)
  if (!products) return []

  const rows: FastSlowMoverRow[] = []

  for (const product of products) {
    const { data: txns, error: txnsError } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', product.id)
      .eq('location_id', locationId)
      .in('transaction_type', ['sale', 'sale_bottle'])
      .gte('created_at', since)
    if (txnsError) throw new Error(`Failed to load slow movers: ${txnsError.message}`)

    const totalQuantity = (txns ?? []).reduce((s, r) => s + Math.abs(Number(r.quantity)), 0)
    rows.push({
      productId: product.id,
      productName: product.name,
      totalQuantity,
      transactionCount: txns?.length ?? 0,
    })
  }

  return rows
    .sort((a, b) => a.totalQuantity - b.totalQuantity)
    .slice(0, limit)
}

export interface ValuationRow {
  productId: string
  productName: string
  sku: string | null
  balance: number
  unitCost: number | null
  totalValue: number
}

export async function valuationReport(locationId: string, inventoryType?: InventoryType): Promise<ValuationRow[]> {
  const supabase = getClient()

  let balanceQuery = supabase
    .from('inventory_product_balances')
    .select('product_id, balance, inventory_products!inner(id, name, sku)')
    .eq('location_id', locationId)
    .gt('balance', 0)

  if (inventoryType) balanceQuery = balanceQuery.eq('inventory_products.inventory_type', inventoryType)

  const { data: balances, error: balancesError } = await balanceQuery

  if (balancesError) throw new Error(`Failed to load valuation balances: ${balancesError.message}`)
  if (!balances) return []

  const rows: ValuationRow[] = []

  for (const bal of balances as any[]) {
    const { data: lastPurchase, error: costError } = await supabase
      .from('inventory_transactions')
      .select('unit_cost')
      .eq('product_id', bal.product_id)
      .eq('location_id', locationId)
      .eq('transaction_type', 'purchase')
      .not('unit_cost', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (costError) throw new Error(`Failed to load valuation cost: ${costError.message}`)

    const unitCost = lastPurchase ? Number((lastPurchase as any).unit_cost) : null
    const balance = Number(bal.balance)
    const totalValue = unitCost ? balance * unitCost : 0

    rows.push({
      productId: bal.product_id,
      productName: bal.inventory_products?.name ?? bal.product_id,
      sku: bal.inventory_products?.sku ?? null,
      balance,
      unitCost,
      totalValue,
    })
  }

  return rows.sort((a, b) => b.totalValue - a.totalValue)
}
