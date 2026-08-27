import { getInventoryClient } from '../lib/db'
import { resolveLocationId } from '../lib/location'
import { weekNumber, weekRange, lastWeekOfYear } from '../lib/weeks'
import type { InventoryType } from './types'
import { movementAmounts } from '../lib/movement-classification'

export interface WeeklyMovementRow {
  inventoryType: InventoryType | 'ALL'
  deliveredQty: number
  deliveredValue: number
  usedQty: number
  usedValue: number
}

export interface WeekSummary {
  year: number
  week: number
  start: string
  end: string
  deliveredQty: number
  deliveredValue: number
  usedQty: number
  usedValue: number
}

function iterable<T>(rows: T[] | null | undefined): T[] {
  return rows ?? []
}

/** Delivered vs sold/used for one Mon–Sun week, per inventory type. */
export async function getWeeklyMovement(
  year: number,
  week: number,
  locationId?: string | null,
  inventoryType?: InventoryType | null,
): Promise<{ week: number; year: number; rows: WeeklyMovementRow[]; totals: WeeklyMovementRow }> {
  const { start, end } = weekRange(year, week)
  const supabase = getInventoryClient()
  const resolvedLocationId = locationId == null ? null : await resolveLocationId(locationId)
  if (locationId != null && resolvedLocationId == null) {
    throw new Error(`No active inventory location found for "${locationId}"`)
  }
  const endIso = end + 'T23:59:59.999Z'
  const startIso = start + 'T00:00:00.000Z'

  let query = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, unit_cost, inventory_products!inner(inventory_type)')
    .gte('created_at', startIso)
    .lte('created_at', endIso)

  if (resolvedLocationId) query = query.eq('location_id', resolvedLocationId)
  if (inventoryType) query = query.eq('inventory_products.inventory_type', inventoryType)

  const { data: txns, error } = await query
  if (error) throw new Error(`Failed to load weekly movements: ${error.message}`)

  const byType = new Map<string, WeeklyMovementRow>()
  const totals: WeeklyMovementRow = { inventoryType: 'ALL', deliveredQty: 0, deliveredValue: 0, usedQty: 0, usedValue: 0 }

  for (const t of iterable(txns)) {
    const amounts = movementAmounts(String(t.transaction_type ?? ''), Number(t.quantity))
    const qty = amounts.inbound || amounts.totalOutflow
    if (qty === 0) continue
    const isDelivered = amounts.inbound > 0
    const value = Math.abs(qty * (Number(t.unit_cost) || 0))

    const invType = (t.inventory_products as unknown as { inventory_type?: string } | undefined)?.inventory_type ?? 'GENERAL'
    let row = byType.get(invType)
    if (!row) {
      row = { inventoryType: invType as InventoryType, deliveredQty: 0, deliveredValue: 0, usedQty: 0, usedValue: 0 }
      byType.set(invType, row)
    }
    if (isDelivered) {
      row.deliveredQty += qty
      row.deliveredValue += value
      totals.deliveredQty += qty
      totals.deliveredValue += value
    } else {
      row.usedQty += qty
      row.usedValue += value
      totals.usedQty += qty
      totals.usedValue += value
    }
  }

  const rows = [...byType.values()].sort((a, b) => (a.inventoryType < b.inventoryType ? -1 : 1))

  return { year, week, rows, totals }
}

/** Every week of the year up to the current week, delivered/used buckets. */
export async function getYearlyWeekSummary(
  year: number,
  locationId?: string | null,
): Promise<WeekSummary[]> {
  const supabase = getInventoryClient()
  const resolvedLocationId = locationId == null ? null : await resolveLocationId(locationId)
  if (locationId != null && resolvedLocationId == null) {
    throw new Error(`No active inventory location found for "${locationId}"`)
  }
  const startIso = `${year}-01-01T00:00:00.000Z`
  const endIso = `${year}-12-31T23:59:59.999Z`

  let query = supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, unit_cost, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso)

  if (resolvedLocationId) query = query.eq('location_id', resolvedLocationId)

  const { data: txns, error } = await query
  if (error) throw new Error(`Failed to load weekly summary: ${error.message}`)

  const weeks = new Map<number, WeekSummary>()
  for (let w = 1; w <= lastWeekOfYear(year); w++) {
    const r = weekRange(year, w)
    weeks.set(w, { year, week: w, start: r.start, end: r.end, deliveredQty: 0, deliveredValue: 0, usedQty: 0, usedValue: 0 })
  }

  for (const t of iterable(txns)) {
    const wk = weekNumber(new Date(t.created_at as string))
    const summary = weeks.get(wk)
    if (!summary) continue
    const amounts = movementAmounts(String(t.transaction_type ?? ''), Number(t.quantity))
    const value = Math.abs((amounts.inbound || amounts.totalOutflow) * (Number(t.unit_cost) || 0))
    if (amounts.inbound > 0) {
      summary.deliveredQty += amounts.inbound
      summary.deliveredValue += value
    } else if (amounts.totalOutflow > 0) {
      summary.usedQty += amounts.totalOutflow
      summary.usedValue += value
    }
  }

  return [...weeks.values()].filter(w => w.deliveredQty !== 0 || w.usedQty !== 0 || w.week === Math.min(weekNumber(new Date()), lastWeekOfYear(year)))
}
