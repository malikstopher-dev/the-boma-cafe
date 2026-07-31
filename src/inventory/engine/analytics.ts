import { getInventoryClient } from '../lib/db'
import { WASTE_TRANSACTION_TYPES } from './waste'
import type { InventoryType, TrendPoint, ValueTrendPoint, WasteHeatmap, WasteHeatmapCell } from './types'

const DAY_MS = 86400000
const SALE_TYPES = ['sale', 'sale_bottle']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function getConsumptionTrend(
  locationId: string,
  days = 30,
  inventoryType?: InventoryType,
): Promise<TrendPoint[]> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * DAY_MS).toISOString()

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('quantity, created_at')
    .in('transaction_type', SALE_TYPES)
    .eq('location_id', locationId)
    .gte('created_at', since)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: txns } = await txnQuery

  const byDate = new Map<string, number>()
  for (const t of (txns ?? []) as { quantity: number; created_at: string }[]) {
    const date = t.created_at.slice(0, 10)
    byDate.set(date, (byDate.get(date) ?? 0) + Math.abs(Number(t.quantity)))
  }

  const points: TrendPoint[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS)
    const key = d.toISOString().slice(0, 10)
    points.push({ date: key, totalQuantity: Math.round((byDate.get(key) ?? 0) * 100) / 100 })
  }

  return points
}

export async function getWasteHeatmap(
  locationId: string,
  days = 30,
  inventoryType?: InventoryType,
): Promise<WasteHeatmap> {
  const supabase = getInventoryClient()
  const since = new Date(Date.now() - days * DAY_MS).toISOString()

  let txnQuery = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, created_at')
    .in('transaction_type', WASTE_TRANSACTION_TYPES as unknown as string[])
    .eq('location_id', locationId)
    .gte('created_at', since)

  if (inventoryType) {
    txnQuery = txnQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: txns } = await txnQuery

  const cellMap = new Map<string, WasteHeatmapCell>()
  const typeTotals = new Map<string, number>()

  for (const t of (txns ?? []) as { transaction_type: string; quantity: number; created_at: string }[]) {
    const qty = Math.abs(Number(t.quantity))
    const dayOfWeek = new Date(t.created_at).getUTCDay()
    const key = `${t.transaction_type}:${dayOfWeek}`
    const existing = cellMap.get(key)
    if (existing) {
      existing.totalQuantity = Math.round((existing.totalQuantity + qty) * 100) / 100
    } else {
      cellMap.set(key, { type: t.transaction_type, dayOfWeek, totalQuantity: Math.round(qty * 100) / 100 })
    }
    typeTotals.set(t.transaction_type, (typeTotals.get(t.transaction_type) ?? 0) + qty)
  }

  const cells = [...cellMap.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.type.localeCompare(b.type))

  return {
    daysAnalyzed: days,
    typeTotals: [...typeTotals.entries()]
      .map(([type, totalQuantity]) => ({ type, totalQuantity: Math.round(totalQuantity * 100) / 100 }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity),
    cells,
  }
}

export async function getInventoryValueTrend(
  locationId: string,
  days = 30,
  inventoryType?: InventoryType,
): Promise<ValueTrendPoint[]> {
  const supabase = getInventoryClient()
  const sinceDate = new Date(Date.now() - (days - 1) * DAY_MS).toISOString().slice(0, 10)

  let query = supabase
    .from('inventory_daily_snapshots')
    .select('date, stock_value')
    .eq('location_id', locationId)
    .gte('date', sinceDate)
    .order('date', { ascending: true })

  if (inventoryType) {
    query = query.eq('inventory_type', inventoryType)
  }

  const { data: rows } = await query

  const byDate = new Map<string, number>()
  for (const r of (rows ?? []) as { date: string; stock_value: number }[]) {
    const key = r.date.slice(0, 10)
    byDate.set(key, Math.round(((byDate.get(key) ?? 0) + Number(r.stock_value ?? 0)) * 100) / 100)
  }

  const points: ValueTrendPoint[] = []
  const today = new Date()
  let running = 0
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS)
    const key = d.toISOString().slice(0, 10)
    const snapshot = byDate.get(key)
    if (snapshot !== undefined) running = snapshot
    points.push({ date: key, stockValue: running })
  }

  return points
}

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? ''
}
