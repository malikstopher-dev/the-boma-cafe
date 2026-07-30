import { getInventoryClient } from './db'

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
  adjustments: number
  closingBalance: number
}

export async function dailyStockReport(date: string, locationId: string): Promise<DailyStockReportRow[]> {
  const supabase = getClient()
  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name, sku, inventory_categories(name)')
    .eq('is_active', true)
    .order('name')

  if (!products) return []

  const rows: DailyStockReportRow[] = []

  for (const product of products) {
    const { data: beforeTx } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', product.id)
      .eq('location_id', locationId)
      .lt('created_at', startOfDay)

    const openingBalance = (beforeTx ?? []).reduce((s, r) => s + Number(r.quantity), 0)

    const { data: dayTx } = await supabase
      .from('inventory_transactions')
      .select('quantity, transaction_type')
      .eq('product_id', product.id)
      .eq('location_id', locationId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    const todayTxns = dayTx ?? []
    const purchases = todayTxns.filter(t => t.transaction_type === 'purchase').reduce((s, r) => s + Number(r.quantity), 0)
    const sales = todayTxns.filter(t => t.transaction_type === 'sale' || t.transaction_type === 'sale_bottle').reduce((s, r) => s + Math.abs(Number(r.quantity)), 0)
    const adjustments = todayTxns.filter(t => !['purchase', 'sale', 'sale_bottle'].includes(t.transaction_type)).reduce((s, r) => s + Number(r.quantity), 0)
    const dayTotal = todayTxns.reduce((s, r) => s + Number(r.quantity), 0)
    const closingBalance = openingBalance + dayTotal

    if (openingBalance !== 0 || dayTotal !== 0) {
      rows.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: (product as any).inventory_categories?.name ?? null,
        openingBalance,
        purchases,
        sales,
        adjustments,
        closingBalance,
      })
    }
  }

  return rows
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

  const { data: items } = await supabase
    .from('inventory_stock_count_items')
    .select('*, inventory_products!inner(id, name)')
    .eq('stock_count_id', stockCountId)

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

export async function wasteReport(from: string, to: string, locationId: string): Promise<WasteReportRow[]> {
  const supabase = getClient()

  const wasteTypes = ['waste', 'breakage', 'spillage', 'comp', 'expiry_loss']

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*, inventory_products!inner(id, name)')
    .eq('location_id', locationId)
    .in('transaction_type', wasteTypes)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false })

  if (error || !data) return []

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

export async function fastMovers(days: number, limit: number, locationId: string): Promise<FastSlowMoverRow[]> {
  const supabase = getClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity, inventory_products!inner(id, name)')
    .eq('location_id', locationId)
    .in('transaction_type', ['sale', 'sale_bottle'])
    .gte('created_at', since)

  if (error || !data) return []

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

export async function slowMovers(days: number, limit: number, locationId: string): Promise<FastSlowMoverRow[]> {
  const supabase = getClient()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('is_active', true)

  if (!products) return []

  const rows: FastSlowMoverRow[] = []

  for (const product of products) {
    const { data: txns } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', product.id)
      .eq('location_id', locationId)
      .in('transaction_type', ['sale', 'sale_bottle'])
      .gte('created_at', since)

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

export async function valuationReport(locationId: string): Promise<ValuationRow[]> {
  const supabase = getClient()

  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance, inventory_products!inner(id, name, sku)')
    .eq('location_id', locationId)
    .gt('balance', 0)

  if (!balances) return []

  const rows: ValuationRow[] = []

  for (const bal of balances as any[]) {
    const { data: lastPurchase } = await supabase
      .from('inventory_transactions')
      .select('unit_cost')
      .eq('product_id', bal.product_id)
      .eq('location_id', locationId)
      .eq('transaction_type', 'purchase')
      .not('unit_cost', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

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
