import { getInventoryClient } from '../lib/db'
import type {
  ConsumptionPattern,
  DepletionForecastRow,
  DayOfWeekPattern,
  HourlyPattern,
  InventoryType,
} from './types'

const DAY_MS = 86400000
const SALE_TYPES = ['sale', 'sale_bottle']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ProductWithBalance {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  inventory_type: string
  balance: number
}

export async function getDepletionForecast(
  locationId: string,
  inventoryType?: InventoryType,
): Promise<DepletionForecastRow[]> {
  const supabase = getInventoryClient()
  const days = 30
  const since = new Date(Date.now() - days * DAY_MS).toISOString()

  let productsQuery = supabase
    .from('inventory_products')
    .select('id, name, sku, barcode, inventory_type')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (inventoryType) {
    productsQuery = productsQuery.eq('inventory_type', inventoryType)
  }

  const { data: products } = await productsQuery

  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)

  const balanceMap = new Map<string, number>()
  for (const b of (balances ?? []) as { product_id: string; balance: number }[]) {
    balanceMap.set(b.product_id, Number(b.balance))
  }

  const { data: saleTxns } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity')
    .in('transaction_type', SALE_TYPES)
    .eq('location_id', locationId)
    .gte('created_at', since)

  const usageMap = new Map<string, number>()
  for (const t of (saleTxns ?? []) as { product_id: string; quantity: number }[]) {
    const current = usageMap.get(t.product_id) ?? 0
    usageMap.set(t.product_id, current + Math.abs(Number(t.quantity)))
  }

  const { data: rules } = await supabase
    .from('inventory_reorder_rules')
    .select('product_id, min_level, lead_time_days')
    .eq('location_id', locationId)

  const ruleMap = new Map<string, { minLevel: number; leadTimeDays: number }>()
  for (const r of (rules ?? []) as { product_id: string; min_level: number; lead_time_days: number }[]) {
    ruleMap.set(r.product_id, {
      minLevel: Number(r.min_level ?? 0),
      leadTimeDays: Number(r.lead_time_days ?? 3),
    })
  }

  const today = new Date()
  const rows: DepletionForecastRow[] = []

  for (const product of (products ?? []) as ProductWithBalance[]) {
    const balance = balanceMap.get(product.id) ?? 0
    const totalSold = usageMap.get(product.id) ?? 0
    const dailyUsage = totalSold / days
    const rule = ruleMap.get(product.id)
    const minLevel = rule?.minLevel ?? 0
    const leadTimeDays = rule?.leadTimeDays ?? 3

    let daysRemaining: number | null = null
    if (dailyUsage > 0) {
      daysRemaining = balance / dailyUsage
    } else if (balance <= 0) {
      daysRemaining = 0
    }

    let urgency: DepletionForecastRow['urgency'] = 'ok'
    if (balance <= 0) {
      urgency = 'out_of_stock'
    } else if (daysRemaining !== null && daysRemaining <= leadTimeDays) {
      urgency = 'critical'
    } else if (minLevel > 0 && balance <= minLevel) {
      urgency = 'warning'
    }

    let projectedStockoutDate: string | null = null
    if (daysRemaining !== null) {
      const date = new Date(today.getTime() + daysRemaining * DAY_MS)
      projectedStockoutDate = date.toISOString().slice(0, 10)
    }

    rows.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      barcode: product.barcode,
      inventoryType: (product.inventory_type as InventoryType) ?? 'GENERAL',
      currentBalance: Math.round(balance * 10000) / 10000,
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      daysRemaining: daysRemaining !== null ? Math.round(daysRemaining * 10) / 10 : null,
      projectedStockoutDate,
      minLevel,
      leadTimeDays,
      urgency,
    })
  }

  const urgencyOrder = { out_of_stock: 0, critical: 1, warning: 2, ok: 3 }
  rows.sort((a, b) => {
    const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (diff !== 0) return diff
    const aDays = a.daysRemaining ?? Number.MAX_SAFE_INTEGER
    const bDays = b.daysRemaining ?? Number.MAX_SAFE_INTEGER
    return aDays - bDays
  })

  return rows
}

export async function getConsumptionPattern(
  locationId: string,
  days = 60,
  inventoryType?: InventoryType,
): Promise<ConsumptionPattern> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * DAY_MS).toISOString()

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('product_id, quantity, created_at')
    .in('transaction_type', SALE_TYPES)
    .eq('location_id', locationId)
    .gte('created_at', since)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: txns } = await txnQuery

  const dayTotals = new Array<number>(7).fill(0)
  const hourlyTotals = new Array<number>(24).fill(0)
  let totalConsumed = 0

  for (const t of (txns ?? []) as { product_id: string; quantity: number; created_at: string }[]) {
    const qty = Math.abs(Number(t.quantity))
    const date = new Date(t.created_at)
    const local = new Date(date.getTime())
    dayTotals[local.getUTCDay()] += qty
    hourlyTotals[local.getUTCHours()] += qty
    totalConsumed += qty
  }

  const averagePerDay = totalConsumed / Math.max(1, days)

  const dayOfWeek: DayOfWeekPattern[] = dayTotals.map((totalQuantity, idx) => ({
    dayOfWeek: idx,
    dayName: DAY_NAMES[idx] ?? '',
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    sharePercent: totalConsumed > 0 ? Math.round((totalQuantity / totalConsumed) * 1000) / 10 : 0,
    multiplier: averagePerDay > 0 ? Math.round((totalQuantity / 7 / averagePerDay) * 100) / 100 : 1,
  }))

  const hourly: HourlyPattern[] = hourlyTotals.map((totalQuantity, hour) => ({
    hour,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
  }))

  let busiestDay = 'No data'
  if (totalConsumed > 0) {
    const busiestIdx = dayTotals.indexOf(Math.max(...dayTotals))
    busiestDay = DAY_NAMES[busiestIdx] ?? 'No data'
  }

  let peakHour = 0
  if (totalConsumed > 0) {
    peakHour = hourlyTotals.indexOf(Math.max(...hourlyTotals))
  }

  return {
    totalConsumed: Math.round(totalConsumed * 100) / 100,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    busiestDay,
    peakHour,
    daysAnalyzed: days,
    dayOfWeek,
    hourly,
  }
}
