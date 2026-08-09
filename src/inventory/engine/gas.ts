import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'
import { writeAuditLog } from '../lib/audit'
import type { CreateTransactionInput } from './types'
import { resolveLocationId } from '../lib/location'
import { MS_PER_WEEK } from '../lib/weeks'

export interface GasSizeRow {
  productId: string
  name: string
  sku: string | null
  kg: number
  onHand: number
  deliveredWeek: number
  deliveredWeekValue: number
  usedWeek: number
  deliveredMonth: number
  deliveredMonthValue: number
  usedMonth: number
}

export interface GasWeekBucket {
  week: number
  deliveredQty: number
  usedQty: number
  deliveredValue: number
}

export interface GasOverview {
  sizes: GasSizeRow[]
  onHandTotal: number
  weekly: GasWeekBucket[]
  monthDeliveredQty: number
  monthUsedQty: number
  monthDeliveredValue: number
  monthUsedValue: number
  recentEvents: Array<{
    id: string
    productName: string
    kg: number
    transactionType: string
    quantity: number
    unitCost: number | null
    created_at: string
  }>
}

function iterate<T>(rows: T[] | null | undefined): T[] {
  return rows ?? []
}

function kgFromName(name: string): number {
  const m = name.match(/(\d+(?:\.\d+)?)\s*kg/i)
  return m ? Number(m[1]) : 0
}

/** Gas overview: cylinders on hand per size + weekly/monthly delivered & used. */
export async function getGasOverview(locationId?: string | null): Promise<GasOverview> {
  const supabase = getInventoryClient()
  const resolvedLocationId = await resolveLocationId(locationId)

  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, name, sku, reorder_threshold')
    .eq('inventory_type', 'GAS')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const gasProducts = iterate(products)
  const productIds = gasProducts.map(p => p.id as string)

  // Balances
  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', resolvedLocationId)
    .in('product_id', productIds)

  const balanceMap = new Map<string, number>()
  for (const b of iterate(balances)) balanceMap.set(b.product_id as string, Number(b.balance) || 0)

  // All gas txns this year (single query, bucketed client-side)
  const yearStart = `${new Date().getFullYear()}-01-01T00:00:00.000Z`
  const { data: txns } = await supabase
    .from('inventory_transactions')
    .select('id, product_id, transaction_type, quantity, unit_cost, created_at')
    .eq('location_id', resolvedLocationId)
    .in('product_id', productIds)
    .gte('created_at', yearStart)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const weekMap = new Map<number, GasWeekBucket>()
  let monthDeliveredQty = 0
  let monthUsedQty = 0
  let monthDeliveredValue = 0
  let monthUsedValue = 0

  const recentEvents: GasOverview['recentEvents'] = []

  for (const t of iterate(txns)) {
    const type = t.transaction_type as string
    const qty = Number(t.quantity) || 0
    const value = Math.abs(qty * (Number(t.unit_cost) || 0))
    const createdAt = new Date(t.created_at as string)
    const productName = gasProducts.find(p => p.id === t.product_id)?.name ?? 'Gas'
    const kg = kgFromName(productName)

    if (type === 'purchase' || type === 'return') {
      monthDeliveredQty += qty
      monthDeliveredValue += value
      const wk = Math.floor((createdAt.getTime() - new Date(createdAt.getFullYear(), 0, 1).getTime()) / MS_PER_WEEK) + 1
      const bucket = weekMap.get(wk) ?? { week: wk, deliveredQty: 0, usedQty: 0, deliveredValue: 0 }
      bucket.deliveredQty += qty
      bucket.deliveredValue += value
      weekMap.set(wk, bucket)
      if (createdAt >= monthStart) recentEvents.push({ id: t.id as string, productName, kg, transactionType: type, quantity: qty, unitCost: t.unit_cost as number | null, created_at: t.created_at as string })
    } else if (type === 'gas_usage') {
      monthUsedQty += Math.abs(qty)
      monthUsedValue += value
      const wk = Math.floor((createdAt.getTime() - new Date(createdAt.getFullYear(), 0, 1).getTime()) / MS_PER_WEEK) + 1
      const bucket = weekMap.get(wk) ?? { week: wk, deliveredQty: 0, usedQty: 0, deliveredValue: 0 }
      bucket.usedQty += Math.abs(qty)
      weekMap.set(wk, bucket)
      recentEvents.push({ id: t.id as string, productName, kg, transactionType: type, quantity: Math.abs(qty), unitCost: t.unit_cost as number | null, created_at: t.created_at as string })
    }
  }

  const weekStart = new Date(new Date(now.getFullYear(), 0, 1).getTime())
  const sizes: GasSizeRow[] = gasProducts
    .sort((a, b) => kgFromName(a.name as string) - kgFromName(b.name as string))
    .map(p => {
      const name = p.name as string
      const kg = kgFromName(name)
      const pid = p.id as string
      const wk = Math.floor((now.getTime() - weekStart.getTime()) / MS_PER_WEEK) + 1
      const bucket = weekMap.get(wk)
      return {
        productId: pid,
        name,
        sku: (p.sku as string | null) ?? null,
        kg,
        onHand: balanceMap.get(pid) ?? 0,
        deliveredWeek: bucket?.deliveredQty ?? 0,
        deliveredWeekValue: bucket?.deliveredValue ?? 0,
        usedWeek: bucket?.usedQty ?? 0,
        deliveredMonth: 0,
        deliveredMonthValue: 0,
        usedMonth: 0,
      }
    })

  // re-bucket month numbers per size from the txn list (txns replayed above for totals only)
  for (const t of iterate(txns)) {
    if (new Date(t.created_at as string) < monthStart) continue
    const type = t.transaction_type as string
    const pid = t.product_id as string
    const row = sizes.find(s => s.productId === pid)
    if (!row) continue
    const qty = Number(t.quantity) || 0
    const value = Math.abs(qty * (Number(t.unit_cost) || 0))
    if (type === 'purchase' || type === 'return') {
      row.deliveredMonth += qty
      row.deliveredMonthValue += value
    } else if (type === 'gas_usage') {
      row.usedMonth += Math.abs(qty)
    }
  }

  const weekly = [...weekMap.values()].sort((a, b) => a.week - b.week).slice(-14)

  return {
    sizes,
    onHandTotal: sizes.reduce((s, r) => s + (r.onHand ?? 0), 0),
    weekly,
    monthDeliveredQty,
    monthUsedQty,
    monthDeliveredValue,
    monthUsedValue,
    recentEvents: recentEvents.slice(0, 20),
  }
}

export interface RecordGasInput {
  productId: string
  locationId?: string | null
  kind: 'delivery' | 'usage'
  quantity: number
  unitCost?: number | null
  notes?: string | null
  performedBy?: string | null
}

/** Record a gas cylinder delivery (purchase) or usage (gas_usage). */
export async function recordGas(input: RecordGasInput): Promise<{ id: string }> {
  const supabase = getInventoryClient()
  const resolvedLocationId = await resolveLocationId(input.locationId)
  if (!resolvedLocationId) throw new Error('No active inventory location found')
  const { data: product } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('id', input.productId)
    .maybeSingle()

  if (!product) throw new Error('Gas product not found')

  const qty = input.kind === 'usage' ? -Math.abs(input.quantity) : Math.abs(input.quantity)

  const created = await createTransaction({
    product_id: input.productId,
    location_id: resolvedLocationId,
    transaction_type: input.kind === 'usage' ? 'gas_usage' : 'purchase',
    quantity: qty,
    unit_cost: input.kind === 'usage' ? null : (input.unitCost ?? null),
    reason_type: input.kind === 'usage' ? 'GAS_USAGE' : 'DELIVERY',
    reason_notes: input.notes ?? null,
    reference_type: 'manual',
    performed_by: input.performedBy ?? null,
    notes: input.kind === 'usage' ? `Gas used: ${product.name}` : `Gas delivered: ${product.name}`,
  } satisfies CreateTransactionInput)

  await writeAuditLog('inventory_transactions', created.id, 'created', { kind: input.kind, product_id: input.productId }, input.performedBy ?? null)

  return { id: created.id }
}