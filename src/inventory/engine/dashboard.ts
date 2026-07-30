import { getInventoryClient } from '../lib/db'
import { getReconciliation, getInventoryValue } from './reconciliation'

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

export async function getDashboardSummary(locationId: string): Promise<DashboardSummary> {
  const supabase = getInventoryClient()
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  const { count: totalProducts } = await supabase
    .from('inventory_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: lowStock } = await supabase
    .from('inventory_products')
    .select('id, name, reorder_threshold')
    .eq('is_active', true)
    .not('reorder_threshold', 'is', null)

  const { data: todayTxns } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity')
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)

  const todayTxnCount = todayTxns?.length ?? 0

  let todayPurchases = 0
  let todaySales = 0
  let todayLoss = 0
  for (const t of todayTxns ?? []) {
    const qty = Number(t.quantity)
    if (t.transaction_type === 'purchase' && qty > 0) todayPurchases += qty
    if (t.transaction_type === 'sale' && qty < 0) todaySales += Math.abs(qty)
    if (['breakage', 'spillage', 'waste', 'theft'].includes(t.transaction_type) && qty < 0) {
      todayLoss += Math.abs(qty)
    }
  }

  const inventoryValue = await getInventoryValue(locationId)

  const outOfStockCount = 0
  const lowStockCount = lowStock?.length ?? 0
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

export async function getAlerts(locationId: string): Promise<AlertItem[]> {
  const supabase = getInventoryClient()
  const alerts: AlertItem[] = []

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name, reorder_threshold')
    .eq('is_active', true)

  for (const product of products ?? []) {
    const { data: txns } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', product.id)
      .eq('location_id', locationId)

    const balance = (txns ?? []).reduce((s, t) => s + Number(t.quantity), 0)

    if (balance < 0) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        type: 'negative_balance',
        currentBalance: balance,
        threshold: null,
      })
    } else if (product.reorder_threshold && balance <= Number(product.reorder_threshold)) {
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

export async function getRecentActivity(locationId: string, limit = 10): Promise<RecentActivityItem[]> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_transactions')
    .select('id, product_id, transaction_type, quantity, created_at')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  const productIds = [...new Set(data.map(t => t.product_id))]
  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map(p => [p.id, p.name]))

  return data.map(t => ({
    id: t.id,
    productName: productMap.get(t.product_id) ?? 'Unknown',
    transactionType: t.transaction_type,
    quantity: Number(t.quantity),
    createdAt: t.created_at,
  }))
}

export async function getFastMovers(locationId: string, days = 30, limit = 10): Promise<FastMoverItem[]> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity')
    .eq('location_id', locationId)
    .eq('transaction_type', 'sale')
    .gte('created_at', since)

  if (!data) return []

  const sales = new Map<string, number>()
  for (const t of data) {
    sales.set(t.product_id, (sales.get(t.product_id) ?? 0) + Math.abs(Number(t.quantity)))
  }

  const sorted = [...sales.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  const productIds = sorted.map(([id]) => id)

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map(p => [p.id, p.name]))

  return sorted.map(([id, total]) => ({
    productId: id,
    productName: productMap.get(id) ?? 'Unknown',
    totalSold: total,
  }))
}

export async function getSlowMovers(locationId: string, days = 30, limit = 10): Promise<SlowMoverItem[]> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: allProducts } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  const { data: sales } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity')
    .eq('location_id', locationId)
    .eq('transaction_type', 'sale')
    .gte('created_at', since)

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

export async function getTodayTransactions(locationId: string): Promise<TodayTransactionSummary[]> {
  const supabase = getInventoryClient()
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd = `${today}T23:59:59.999Z`

  const { data } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity')
    .eq('location_id', locationId)
    .gte('created_at', todayStart)
    .lte('created_at', todayEnd)

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
