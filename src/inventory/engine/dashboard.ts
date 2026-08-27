import { getInventoryClient } from '../lib/db'
import { getReconciliation, getInventoryValue } from './reconciliation'
import { movementAmounts, SOLD_TYPES } from '../lib/movement-classification'

export interface DashboardSummary {
  inventoryValue: number
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  todayPurchases: number
  todaySales: number
  todayLoss: number
  todayTransactions: number
  variance: number
}

export interface AlertItem {
  productId: string
  productName: string
  type: 'low_stock' | 'out_of_stock' | 'negative_balance'
  currentBalance: number
  threshold: number | null
}

export interface FastMoverItem {
  productId: string
  productName: string
  totalSold: number
}

export interface SlowMoverItem {
  productId: string
  productName: string
  totalSold: number
}

export interface RecentActivityItem {
  id: string
  productName: string
  transactionType: string
  quantity: number
  createdAt: string
}

export interface TodayTransactionSummary {
  type: string
  count: number
  totalQuantity: number
}

import type { InventoryType } from './types'

export async function getDashboardSummary(locationId: string, inventoryType?: InventoryType | null): Promise<DashboardSummary> {
  const supabase = getInventoryClient()
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  let productsQuery = supabase
    .from('inventory_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  let activeProductsQuery = supabase
    .from('inventory_products')
    .select('id, reorder_threshold')
    .eq('is_active', true)

  if (inventoryType) {
    productsQuery = productsQuery.eq('inventory_type', inventoryType)
    activeProductsQuery = activeProductsQuery.eq('inventory_type', inventoryType)
  }

  const { count: totalProducts, error: countError } = await productsQuery
  if (countError) throw new Error(`Failed to load dashboard product count: ${countError.message}`)

  const { data: activeProducts, error: productsError } = await activeProductsQuery
  if (productsError) throw new Error(`Failed to load dashboard products: ${productsError.message}`)

  const { data: balanceRows, error: balanceError } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)
  if (balanceError) throw new Error(`Failed to load dashboard balances: ${balanceError.message}`)

  const balanceByProduct = new Map<string, number>()
  for (const row of balanceRows ?? []) {
    balanceByProduct.set(row.product_id, Number(row.balance))
  }

  let lowStockCount = 0
  let outOfStockCount = 0
  for (const p of activeProducts ?? []) {
    const balance = balanceByProduct.get(p.id) ?? 0
    if (balance <= 0) outOfStockCount += 1
    else if (p.reorder_threshold !== null && p.reorder_threshold !== undefined && balance <= p.reorder_threshold) {
      lowStockCount += 1
    }
  }

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, inventory_products!inner(inventory_type)')
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: todayTxns, error: txnsError } = await txnQuery
  if (txnsError) throw new Error(`Failed to load today's movements: ${txnsError.message}`)

  const todayTxnCount = todayTxns?.length ?? 0

  let todayPurchases = 0
  let todaySales = 0
  let todayLoss = 0
  for (const t of todayTxns ?? []) {
    const amounts = movementAmounts(t.transaction_type, Number(t.quantity))
    todayPurchases += amounts.inbound
    todaySales += amounts.sold
    todayLoss += amounts.wasteLoss
  }

  const inventoryValue = await getInventoryValue(locationId)

  const variance = 0

  return {
    inventoryValue,
    totalProducts: totalProducts ?? 0,
    lowStockCount,
    outOfStockCount,
    todayPurchases,
    todaySales,
    todayLoss,
    todayTransactions: todayTxnCount,
    variance,
  }
}

export async function getAlerts(locationId: string, inventoryType?: InventoryType | null): Promise<AlertItem[]> {
  const supabase = getInventoryClient()
  const alerts: AlertItem[] = []

  let prodQuery = supabase
    .from('inventory_products')
    .select('id, name, reorder_threshold')
    .eq('is_active', true)

  if (inventoryType) {
    prodQuery = prodQuery.eq('inventory_type', inventoryType)
  }

  const { data: products, error: productsError } = await prodQuery
  if (productsError) {
    throw new Error(`Failed to load stock alerts: ${productsError.message}`)
  }
  if (!products || products.length === 0) return []

  const { data: balanceRows, error: balanceError } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)

  if (balanceError) {
    throw new Error(`Failed to load stock balances: ${balanceError.message}`)
  }

  // Use the same cache source as the dashboard counters and Forecast page.
  const balanceMap = new Map<string, number>()
  for (const row of balanceRows ?? []) {
    balanceMap.set(row.product_id, Number(row.balance))
  }

  for (const product of products as any[]) {
    const balance = balanceMap.get(product.id) ?? 0

    if (balance < 0) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        type: 'negative_balance',
        currentBalance: balance,
        threshold: null,
      })
    } else if (balance === 0 || (product.reorder_threshold != null && balance <= Number(product.reorder_threshold))) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        type: balance === 0 ? 'out_of_stock' : 'low_stock',
        currentBalance: balance,
        threshold: Number(product.reorder_threshold),
      })
    }
  }

  return alerts.sort((a, b) => {
    const order = { negative_balance: 0, out_of_stock: 1, low_stock: 2 }
    return (order[a.type] ?? 0) - (order[b.type] ?? 0)
  })
}

export async function getRecentActivity(locationId: string, limit = 10, inventoryType?: InventoryType | null): Promise<RecentActivityItem[]> {
  const supabase = getInventoryClient()

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('id, product_id, transaction_type, quantity, created_at, order_id, order_line_id, recipe_id, inventory_products!inner(inventory_type)')
    .eq('location_id', locationId)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data, error } = await txnQuery
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load recent activity: ${error.message}`)
  if (!data) return []

  const productIds = [...new Set(data.map(t => t.product_id))]
  const { data: products, error: productsError } = await supabase
    .from('inventory_products')
    .select('id, name')
    .in('id', productIds)
  if (productsError) throw new Error(`Failed to load activity products: ${productsError.message}`)

  const productMap = new Map((products ?? []).map(p => [p.id, p.name]))

  return data.map(t => ({
    id: t.id,
    productName: productMap.get(t.product_id) ?? 'Unknown',
    transactionType: t.transaction_type,
    quantity: Number(t.quantity),
    createdAt: t.created_at,
  }))
}

export async function getFastMovers(locationId: string, days = 30, limit = 10, inventoryType?: InventoryType | null): Promise<FastMoverItem[]> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let saleQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, inventory_products!inner(inventory_type)')
    .eq('location_id', locationId)
    .in('transaction_type', [...SOLD_TYPES])
    .gte('created_at', since)

  if (inventoryType) {
    saleQuery = saleQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data, error } = await saleQuery

  if (error) throw new Error(`Failed to load fast movers: ${error.message}`)
  if (!data) return []

  const sales = new Map<string, number>()
  for (const t of data) {
    sales.set(t.product_id, (sales.get(t.product_id) ?? 0) + Math.abs(Number(t.quantity)))
  }

  const sorted = [...sales.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const productIds = sorted.map(([id]) => id)

  if (productIds.length === 0) return []

  const { data: products, error: productsError } = await supabase
    .from('inventory_products')
    .select('id, name')
    .in('id', productIds)
  if (productsError) throw new Error(`Failed to load fast-mover products: ${productsError.message}`)

  const productMap = new Map((products ?? []).map(p => [p.id, p.name]))

  return sorted.map(([id, total]) => ({
    productId: id,
    productName: productMap.get(id) ?? 'Unknown',
    totalSold: total,
  }))
}

export async function getSlowMovers(locationId: string, days = 30, limit = 10, inventoryType?: InventoryType | null): Promise<SlowMoverItem[]> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let prodQuery = supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  if (inventoryType) {
    prodQuery = prodQuery.eq('inventory_type', inventoryType)
  }

  const { data: allProducts, error: productsError } = await prodQuery
  if (productsError) throw new Error(`Failed to load slow-mover products: ${productsError.message}`)

  let saleQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, inventory_products!inner(inventory_type)')
    .eq('location_id', locationId)
    .in('transaction_type', [...SOLD_TYPES])
    .gte('created_at', since)

  if (inventoryType) {
    saleQuery = saleQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: sales, error: salesError } = await saleQuery
  if (salesError) throw new Error(`Failed to load slow movers: ${salesError.message}`)

  const salesMap = new Map<string, number>()
  for (const t of sales ?? []) {
    salesMap.set(t.product_id, (salesMap.get(t.product_id) ?? 0) + Math.abs(Number(t.quantity)))
  }

  const withSales = (allProducts ?? []).map(p => ({
    productId: p.id,
    productName: p.name,
    totalSold: salesMap.get(p.id) ?? 0,
  }))

  return withSales.sort((a, b) => a.totalSold - b.totalSold).slice(0, limit)
}

export async function getTodayTransactions(locationId: string, inventoryType?: InventoryType | null): Promise<TodayTransactionSummary[]> {
  const supabase = getInventoryClient()
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, inventory_products!inner(inventory_type)')
    .eq('location_id', locationId)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data, error } = await txnQuery

  if (error) throw new Error(`Failed to load today's transactions: ${error.message}`)
  if (!data) return []

  const groups = new Map<string, { count: number; totalQty: number }>()
  for (const t of data) {
    const g = groups.get(t.transaction_type) ?? { count: 0, totalQty: 0 }
    g.count++
    g.totalQty += Number(t.quantity)
    groups.set(t.transaction_type, g)
  }

  return [...groups.entries()].map(([type, vals]) => ({
    type,
    count: vals.count,
    totalQuantity: vals.totalQty,
  })).sort((a, b) => b.count - a.count)
}

export async function refreshDashboardCache(locationId: string): Promise<void> {
  const supabase = getInventoryClient()
  const summary = await getDashboardSummary(locationId)
  const alerts = await getAlerts(locationId)

  await supabase
    .from('inventory_dashboard_cache')
    .upsert({
      location_id: locationId,
      total_products: summary.totalProducts,
      total_value: summary.inventoryValue,
      total_alerts: alerts.length,
      low_stock_count: summary.lowStockCount,
      drinks_sold_today: summary.todaySales,
      estimated_loss: summary.todayLoss,
      refreshed_at: new Date().toISOString(),
    }, { onConflict: 'location_id' })
}
