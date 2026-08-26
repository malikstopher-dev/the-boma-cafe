import { getInventoryClient } from '../lib/db'
import { resolveLocationId } from '../lib/location'
import { getAlerts } from './dashboard'

export type OwnerPeriod = 'this_week' | 'this_month' | 'last_7' | 'last_30' | 'custom'

export interface OwnerRange {
  start: string // ISO (inclusive)
  end: string // ISO (exclusive)
  label: string
  previousStart: string
  previousEnd: string
}

export interface OwnerKpi {
  purchased: number
  used: number
  wastage: number
  adjustments: number
  stockValue: number
  supplierPayments: number
  supplierOutstanding: number
  purchasedPrev: number
  usedPrev: number
  wastagePrev: number
  adjustmentsPrev: number
  stockValuePrev: number | null
}

export interface OwnerLocationRow {
  locationId: string
  name: string
  items: number
  value: number
  pct: number
  movement: number
}

export interface OwnerSupplierRow {
  supplierId: string | null
  supplierName: string
  week: number
  month: number
  outstanding: number
}

export interface OwnerPayment {
  supplierId: string | null
  supplierName: string
  amount: number
  at: string
}

export type StockGroup = 'food' | 'beverage' | 'general' | 'gas'

export interface OwnerBoard {
  key: StockGroup
  label: string
  href: string
  items: number
  value: number
  purchased: number
  used: number
  wastage: number
  cylinders: number | null
}

export interface OwnerAlert {
  severity: 'high' | 'medium' | 'low'
  message: string
  href?: string
}

export interface OwnerActivityItem {
  kind: string
  description: string
  person: string
  at: string
}

export interface OwnerMovementPoint {
  date: string
  purchased: number
  used: number
}

export interface OwnerDashboardData {
  range: OwnerRange
  location: string | null
  locationName: string
  kpi: OwnerKpi
  locations: OwnerLocationRow[]
  suppliers: OwnerSupplierRow[]
  supplierTotal: number
  recentPayments: OwnerPayment[]
  boards: OwnerBoard[]
  alerts: OwnerAlert[]
  activity: OwnerActivityItem[]
  movement: OwnerMovementPoint[]
  supplierPaymentsEnabled: boolean
  managementActivity: Array<{
    id: string
    admin_name: string | null
    admin_role: string | null
    action: string
    target_type: string | null
    created_at: string
  }>
}

// ---------------------------------------------------------------------------
// Period resolution: Mon–Sun weeks, calendar months, rolling windows, custom.
// end is EXCLUSIVE (ISO); comparisons use gte(start) / lt(end).
// ---------------------------------------------------------------------------

function iso(d: Date): string {
  return d.toISOString()
}

export function getOwnerRange(period: OwnerPeriod, customFrom?: string | null, customTo?: string | null): OwnerRange {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  if (period === 'custom') {
    const from = customFrom || today.toISOString().slice(0, 10)
    const to = customTo || today.toISOString().slice(0, 10)
    const start = new Date(`${from}T00:00:00.000Z`)
    const end = new Date(`${to}T00:00:00.000Z`)
    end.setUTCDate(end.getUTCDate() + 1)
    const spanMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - spanMs)
    return { start: iso(start), end: iso(end), label: `${from} to ${to}`, previousStart: iso(prevStart), previousEnd: iso(start) }
  }

  if (period === 'this_week') {
    const dow = today.getUTCDay() || 7 // Sunday = 7, so Monday = 1
    const monday = new Date(today)
    monday.setUTCDate(today.getUTCDate() - (dow - 1))
    const nextMonday = new Date(monday)
    nextMonday.setUTCDate(monday.getUTCDate() + 7)
    const prevMonday = new Date(monday)
    prevMonday.setUTCDate(monday.getUTCDate() - 7)
    return {
      start: iso(monday),
      end: iso(nextMonday),
      label: 'This week',
      previousStart: iso(prevMonday),
      previousEnd: iso(monday),
    }
  }

  if (period === 'this_month') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1))
    const prevStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    return {
      start: iso(start),
      end: iso(end),
      label: 'This month',
      previousStart: iso(prevStart),
      previousEnd: iso(start),
    }
  }

  const days = period === 'last_30' ? 30 : 7
  const start = new Date(today)
  start.setUTCDate(today.getUTCDate() - (days - 1))
  const end = new Date(today)
  end.setUTCDate(today.getUTCDate() + 1)
  const prevStart = new Date(start)
  prevStart.setUTCDate(start.getUTCDate() - days)
  return {
    start: iso(start),
    end: iso(end),
    label: `Last ${days} days`,
    previousStart: iso(prevStart),
    previousEnd: iso(start),
  }
}

// ---------------------------------------------------------------------------
// Transaction aggregation (single source of truth: the ledger)
// ---------------------------------------------------------------------------

export interface RawTxn {
  quantity: number
  unit_cost: number | null
  transaction_type: string
  created_at: string
  inventory_type?: string | null
}

const PURCHASE_TYPES = new Set(['purchase', 'return'])
const USED_TYPES = new Set(['sale', 'sale_bottle', 'comp', 'staff', 'production', 'waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'stolen', 'gas_usage', 'breakage'])
const WASTE_TYPES = new Set(['waste', 'expiry_loss', 'spillage', 'theft', 'donation', 'breakage'])

function typeGroup(t: string | null | undefined): StockGroup {
  const v = (t ?? '').toUpperCase()
  if (v === 'FOOD') return 'food'
  if (v === 'BEVERAGE') return 'beverage'
  if (v === 'GAS') return 'gas'
  return 'general' // CLEANING, PACKAGING, GENERAL, unknown
}

export interface GroupTotals {
  purchased: number
  used: number
  wastage: number
  adjustments: number
}

export function summarizeTxnsByGroup(txns: RawTxn[]): Record<StockGroup, GroupTotals> {
  const out: Record<StockGroup, GroupTotals> = {
    food: { purchased: 0, used: 0, wastage: 0, adjustments: 0 },
    beverage: { purchased: 0, used: 0, wastage: 0, adjustments: 0 },
    general: { purchased: 0, used: 0, wastage: 0, adjustments: 0 },
    gas: { purchased: 0, used: 0, wastage: 0, adjustments: 0 },
  }

  for (const t of txns) {
    const type = (t.transaction_type || '').toLowerCase()
    const qty = Number(t.quantity) || 0
    const cost = Number(t.unit_cost) || 0
    const val = Math.abs(qty) * cost
    const row = out[typeGroup(t.inventory_type)]

    if (row) {
      if (PURCHASE_TYPES.has(type) && qty > 0) row.purchased += val
      if (USED_TYPES.has(type) && qty < 0) row.used += val
      if (WASTE_TYPES.has(type) && qty < 0) row.wastage += val
      if (type === 'adjustment') row.adjustments += val
    }
  }

  return out
}

export function summarizeTxns(txns: RawTxn[]): { purchased: number; used: number; wastage: number; adjustments: number } {
  let purchased = 0
  let used = 0
  let wastage = 0
  let adjustments = 0

  for (const t of txns) {
    const type = (t.transaction_type || '').toLowerCase()
    const qty = Number(t.quantity) || 0
    const cost = Number(t.unit_cost) || 0
    const val = Math.abs(qty) * cost

    if (PURCHASE_TYPES.has(type) && qty > 0) purchased += val
    if (USED_TYPES.has(type) && qty < 0) used += val
    if (WASTE_TYPES.has(type) && qty < 0) wastage += val
    if (type === 'adjustment') adjustments += val
  }

  return { purchased, used, wastage, adjustments }
}

export async function fetchTxns(start: string, end: string): Promise<RawTxn[]> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('quantity, unit_cost, transaction_type, created_at, inventory_products(inventory_type)')
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) return []
  return ((data ?? []) as unknown as any[]).map(t => ({
    quantity: t.quantity,
    unit_cost: t.unit_cost,
    transaction_type: t.transaction_type,
    created_at: t.created_at,
    inventory_type: t.inventory_products?.inventory_type ?? null,
  }))
}

async function fetchTxnsByLocation(locationId: string, start: string, end: string): Promise<RawTxn[]> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('quantity, unit_cost, transaction_type, created_at, inventory_products(inventory_type)')
    .eq('location_id', locationId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) return []
  return ((data ?? []) as unknown as any[]).map(t => ({
    quantity: t.quantity,
    unit_cost: t.unit_cost,
    transaction_type: t.transaction_type,
    created_at: t.created_at,
    inventory_type: t.inventory_products?.inventory_type ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Stock value by location (from the balance cache + last purchase price)
// ---------------------------------------------------------------------------

async function stockValue(locationId: string): Promise<{ value: number; items: number }> {
  const supabase = getInventoryClient()
  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)

  let value = 0
  let items = 0

  for (const b of (balances ?? []) as unknown as Array<{ product_id: string; balance: number }>) {
    const balance = Number(b.balance)
    if (balance <= 0) continue
    items += 1

    const { data: cost } = await supabase
      .from('inventory_transactions')
      .select('unit_cost')
      .eq('product_id', b.product_id)
      .eq('location_id', locationId)
      .not('unit_cost', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    value += balance * Number((cost as any)?.unit_cost ?? 0)
  }

  return { value, items }
}

// ---------------------------------------------------------------------------
// Stock value + counts grouped by inventory type (Kitchen / Bar / General / Gas)
// ---------------------------------------------------------------------------

async function stockValueByGroup(): Promise<Record<StockGroup, { value: number; items: number }>> {
  const supabase = getInventoryClient()
  const [balancesRes, productsRes, costsRes] = await Promise.all([
    supabase.from('inventory_product_balances').select('product_id, balance'),
    supabase.from('inventory_products').select('id, inventory_type').eq('is_active', true),
    supabase
      .from('inventory_transactions')
      .select('product_id, unit_cost')
      .not('unit_cost', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20000),
  ])

  const lastCost = new Map<string, number>()
  for (const c of (costsRes.data ?? []) as any[]) {
    const pid = c.product_id as string
    if (!lastCost.has(pid)) lastCost.set(pid, Number(c.unit_cost) || 0)
  }

  const typeById = new Map<string, StockGroup>()
  for (const p of (productsRes.data ?? []) as any[]) {
    typeById.set(p.id as string, typeGroup(p.inventory_type as string | null))
  }

  const out: Record<StockGroup, { value: number; items: number }> = {
    food: { value: 0, items: 0 },
    beverage: { value: 0, items: 0 },
    general: { value: 0, items: 0 },
    gas: { value: 0, items: 0 },
  }

  for (const b of (balancesRes.data ?? []) as any[]) {
    const balance = Number(b.balance)
    if (balance <= 0) continue
    const g = typeById.get(b.product_id as string) ?? 'general'
    const row = out[g]
    if (row) {
      row.items += 1
      row.value += balance * (lastCost.get(b.product_id as string) ?? 0)
    }
  }

  return out
}

async function gasCylindersOnHand(): Promise<number> {
  const supabase = getInventoryClient()
  const { data: gasProducts } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('inventory_type', 'GAS')
    .eq('is_active', true)

  const ids = (gasProducts ?? []).map((p: any) => p.id as string)
  if (ids.length === 0) return 0

  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('balance')
    .in('product_id', ids)

  return (balances ?? []).reduce((sum: number, b: any) => sum + (Number(b.balance) || 0), 0)
}

// ---------------------------------------------------------------------------
// Supplier invoices + payments (migration 064)
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string
  supplier_id: string
  total_amount: number
  status: string
}

async function invoiceTotalsForSupplier(supplierId: string, start: string, end: string): Promise<number> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_supplier_invoices')
    .select('total_amount')
    .eq('supplier_id', supplierId)
    .gte('invoice_date', start.slice(0, 10))
    .lt('invoice_date', end.slice(0, 10))

  if (error) return 0
  return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.total_amount ?? 0), 0)
}

async function openInvoicesForSupplier(supplierId: string): Promise<Array<{ id: string; total_amount: number }>> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_supplier_invoices')
    .select('id, total_amount')
    .eq('supplier_id', supplierId)
    .in('status', ['pending', 'partial', 'overdue'])

  if (error) return []
  return (data ?? []) as unknown as Array<{ id: string; total_amount: number }>
}

async function paidForInvoice(invoiceId: string): Promise<number> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_supplier_payments')
    .select('amount')
    .eq('invoice_id', invoiceId)

  if (error) return 0
  return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0)
}

async function supplierPayables(): Promise<{ rows: OwnerSupplierRow[]; total: number; enabled: boolean }> {
  const supabase = getInventoryClient()
  try {
    const { data: suppliers } = await supabase
      .from('inventory_suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    const roster = (suppliers ?? []) as unknown as Array<{ id: string; name: string }>
    const week = getOwnerRange('this_week')
    const month = getOwnerRange('this_month')
    const rows: OwnerSupplierRow[] = []
    let total = 0

    for (const sup of roster) {
      const [weekAmount, monthAmount, openInvoices] = await Promise.all([
        invoiceTotalsForSupplier(sup.id, week.start, week.end),
        invoiceTotalsForSupplier(sup.id, month.start, month.end),
        openInvoicesForSupplier(sup.id),
      ])

      let outstanding = 0
      for (const inv of openInvoices) {
        const paid = await paidForInvoice(inv.id)
        const open = Number(inv.total_amount) - paid
        if (open > 0.004) outstanding += open
      }
      total += outstanding
      rows.push({ supplierId: sup.id, supplierName: sup.name, week: weekAmount, month: monthAmount, outstanding })
    }

    return { rows, total, enabled: true }
  } catch {
    // Tables don't exist yet (migration 064 not applied) — caller degrades gracefully
    return { rows: [], total: 0, enabled: false }
  }
}

async function supplierPaymentsInRange(start: string, end: string): Promise<{ amount: number; enabled: boolean }> {
  try {
    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_supplier_payments')
      .select('amount')
      .gte('paid_at', start)
      .lt('paid_at', end)
    if (error) return { amount: 0, enabled: false }
    return { amount: (data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount ?? 0), 0), enabled: true }
  } catch {
    return { amount: 0, enabled: false }
  }
}

/** Payments recorded in the selected period, newest first, with supplier names. */
async function supplierRecentPayments(start: string, end: string): Promise<OwnerPayment[]> {
  try {
    const supabase = getInventoryClient()
    const { data, error } = await supabase
      .from('inventory_supplier_payments')
      .select('amount, paid_at, inventory_supplier_invoices(supplier_id, inventory_suppliers(name))')
      .gte('paid_at', start)
      .lt('paid_at', end)
      .order('paid_at', { ascending: false })
      .limit(25)

    if (error) return []
    return ((data ?? []) as any[])
      .map((p: any) => ({
        supplierId: (p.inventory_supplier_invoices?.supplier_id as string) ?? null,
        supplierName: (p.inventory_supplier_invoices?.inventory_suppliers?.name as string) ?? 'Unknown supplier',
        amount: Number(p.amount) || 0,
        at: p.paid_at as string,
      }))
      .filter(p => p.amount > 0)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Alerts — only real conditions; empty when everything is fine
// ---------------------------------------------------------------------------

async function buildAlerts(locationId: string): Promise<OwnerAlert[]> {
  const supabase = getInventoryClient()
  const alerts: OwnerAlert[] = []

  const stockAlerts = await getAlerts(locationId)
  for (const a of (stockAlerts ?? []).slice(0, 4)) {
    alerts.push({
      severity: a.type === 'out_of_stock' || a.type === 'negative_balance' ? 'high' : 'medium',
      message: `${a.productName} — ${a.type === 'out_of_stock' ? 'out of stock' : 'low stock'} (${a.currentBalance} on hand)`,
      href: '/inv/products',
    })
  }

  try {
    const { data: pendingReceipts } = await supabase
      .from('inventory_po_receipts')
      .select('id')
      .eq('verification_status', 'pending')
      .limit(5)
    if ((pendingReceipts ?? []).length > 0) {
      const n = pendingReceipts?.length ?? 0
      alerts.push({ severity: 'medium', message: `${n} delivery${n > 1 ? 's' : ''} awaiting verification`, href: '/inv/purchases' })
    }
  } catch { /* column missing until migration 064 */ }

  try {
    const { data: pendingInvoices } = await supabase
      .from('inventory_supplier_invoices')
      .select('id')
      .in('status', ['pending', 'partial', 'overdue'])
      .limit(5)
    if ((pendingInvoices ?? []).length > 0) {
      const n = pendingInvoices?.length ?? 0
      alerts.push({ severity: 'low', message: `${n} supplier invoice${n > 1 ? 's' : ''} open`, href: '/inv/suppliers' })
    }
  } catch { /* tables absent */ }

  const { data: pendingCounts } = await supabase
    .from('inventory_stock_counts')
    .select('id')
    .eq('status', 'submitted')
    .limit(1)
  if ((pendingCounts ?? []).length > 0) {
    alerts.push({ severity: 'medium', message: 'A stock count is awaiting approval', href: '/inv/stock-counts' })
  }

  return alerts.slice(0, 8)
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

async function buildActivity(): Promise<OwnerActivityItem[]> {
  const supabase = getInventoryClient()
  const items: OwnerActivityItem[] = []

  const { data: recentTxns } = await supabase
    .from('inventory_transactions')
    .select('transaction_type, quantity, unit_cost, created_at, order_id, order_line_id, recipe_id, inventory_products(name)')
    .order('created_at', { ascending: false })
    .limit(8)

  for (const t of (recentTxns ?? []) as any[]) {
    items.push({
      kind: t.transaction_type || 'movement',
      description: `${t.inventory_products?.name || 'Item'} (${t.quantity > 0 ? '+' : ''}${t.quantity})`,
      person: '',
      at: t.created_at,
    })
  }

  try {
    const { data: payments } = await supabase
      .from('inventory_supplier_payments')
      .select('amount, paid_at')
      .order('paid_at', { ascending: false })
      .limit(3)
    for (const p of (payments ?? []) as any[]) {
      items.push({ kind: 'payment', description: `Supplier payment R${Number(p.amount ?? 0).toLocaleString()}`, person: '', at: p.paid_at })
    }
  } catch { /* absent */ }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 10)
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function getOwnerDashboardLegacy(
  period: OwnerPeriod = 'this_week',
  customFrom?: string | null,
  customTo?: string | null,
): Promise<OwnerDashboardData> {
  const supabase = getInventoryClient()
  const range = getOwnerRange(period, customFrom, customTo)

  const [currentTxns, previousTxns] = await Promise.all([
    fetchTxns(range.start, range.end),
    fetchTxns(range.previousStart, range.previousEnd),
  ])

  const current = summarizeTxns(currentTxns)
  const previous = summarizeTxns(previousTxns)

  const locationId = (await resolveLocationId(null)) ?? ''

  const { data: locations } = await supabase
    .from('inventory_locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const locList = ((locations ?? []) as unknown as Array<{ id: string; name: string }>) || []

  const located: OwnerLocationRow[] = []
  let totalValue = 0

  for (const l of locList) {
    const sv = await stockValue(l.id)
    totalValue += sv.value
    located.push({
      locationId: l.id,
      name: l.name,
      items: sv.items,
      value: sv.value,
      pct: 0,
      movement: 0,
    })
  }

  for (const row of located) {
    row.pct = totalValue > 0 ? Math.round((row.value / totalValue) * 1000) / 10 : 0
    const mv = await fetchTxnsByLocation(row.locationId, range.start, range.end)
    const sums = summarizeTxns(mv)
    row.movement = sums.purchased - sums.used
  }

  const payables = await supplierPayables()
  const payments = await supplierPaymentsInRange(range.start, range.end)
  const previousPayments = await supplierPaymentsInRange(range.previousStart, range.previousEnd)

  const stockValuePrev = await stockValueAt(range.previousStart)

  const [alerts, activity, movement, stockByGroup, recentPayments, gasCylinders] = await Promise.all([
    buildAlerts(locationId),
    buildActivity(),
    buildMovement(range),
    stockValueByGroup(),
    supplierRecentPayments(range.start, range.end),
    gasCylindersOnHand(),
  ])

  const byGroup = summarizeTxnsByGroup(currentTxns)
  const boards: OwnerBoard[] = [
    {
      key: 'food',
      label: 'Kitchen Stock',
      href: '/admin/operations/food/products',
      items: stockByGroup.food.items,
      value: stockByGroup.food.value,
      purchased: byGroup.food.purchased,
      used: byGroup.food.used,
      wastage: byGroup.food.wastage,
      cylinders: null,
    },
    {
      key: 'beverage',
      label: 'Bar Stock',
      href: '/admin/operations/beverage/products',
      items: stockByGroup.beverage.items,
      value: stockByGroup.beverage.value,
      purchased: byGroup.beverage.purchased,
      used: byGroup.beverage.used,
      wastage: byGroup.beverage.wastage,
      cylinders: null,
    },
    {
      key: 'general',
      label: 'General Stock',
      href: '/admin/operations/products',
      items: stockByGroup.general.items,
      value: stockByGroup.general.value,
      purchased: byGroup.general.purchased,
      used: byGroup.general.used,
      wastage: byGroup.general.wastage,
      cylinders: null,
    },
    {
      key: 'gas',
      label: 'Gas Tracker',
      href: '/admin/operations/gas',
      items: stockByGroup.gas.items,
      value: stockByGroup.gas.value,
      purchased: byGroup.gas.purchased,
      used: byGroup.gas.used,
      wastage: byGroup.gas.wastage,
      cylinders: gasCylinders,
    },
  ]

  return {
    range,
    location: locationId,
    locationName: locList.find(l => l.id === locationId)?.name ?? 'All locations',
    kpi: {
      purchased: current.purchased,
      used: current.used,
      wastage: current.wastage,
      adjustments: current.adjustments,
      stockValue: totalValue,
      supplierPayments: payments.amount,
      supplierOutstanding: payables.total,
      purchasedPrev: previous.purchased,
      usedPrev: previous.used,
      wastagePrev: previous.wastage,
      adjustmentsPrev: previous.adjustments,
      stockValuePrev,
    },
    locations: located,
    suppliers: payables.rows,
    supplierTotal: payables.rows.length,
    recentPayments,
    boards,
    alerts,
    activity,
    movement,
    supplierPaymentsEnabled: payments.enabled && payables.enabled,
    managementActivity: [],
  }
}

function isMissingOwnerDashboardRpc(error: { code?: string | null; message?: string | null }): boolean {
  return error.code === 'PGRST202' || error.message?.includes('owner_dashboard') === true && error.message?.includes('schema cache') === true
}

function normalizeLegacyAlertPresentation(payload: any): void {
  if (!Array.isArray(payload.alerts)) return
  payload.alerts = payload.alerts.map((alert: any) => {
    const receipt = /^(\d+) deliveries awaiting verification$/.exec(String(alert?.message ?? ''))
    if (receipt) {
      const count = Math.min(Number(receipt[1]), 5)
      return { ...alert, message: `${count} delivery${count > 1 ? 's' : ''} awaiting verification` }
    }
    const invoice = /^(\d+) supplier invoices open$/.exec(String(alert?.message ?? ''))
    if (invoice) {
      const count = Math.min(Number(invoice[1]), 5)
      return { ...alert, message: `${count} supplier invoice${count > 1 ? 's' : ''} open` }
    }
    return alert
  })
}

function normalizeLegacyActivityPresentation(payload: any): void {
  if (!Array.isArray(payload.activity)) return
  payload.activity = payload.activity.map((activity: any) => {
    const description = String(activity?.description ?? '')
    const match = /\(([+-]?)(-?\d+(?:\.\d+)?)\)$/.exec(description)
    if (!match) return activity
    const numeric = Number(match[2])
    if (!Number.isFinite(numeric)) return activity
    const sign = match[1] || (numeric > 0 ? '+' : '')
    return { ...activity, description: `${description.slice(0, match.index)}(${sign}${Math.abs(numeric)})` }
  })
}

/**
 * Primary owner-dashboard reader. Migration 102 moves the existing calculation
 * into one database snapshot; the legacy engine remains only for a bounded
 * missing-RPC rollout fallback, never for arbitrary RPC errors.
 */
export async function getOwnerDashboard(
  period: OwnerPeriod = 'this_week',
  customFrom?: string | null,
  customTo?: string | null,
): Promise<OwnerDashboardData> {
  const range = getOwnerRange(period, customFrom, customTo)
  const { data, error } = await getInventoryClient().rpc('owner_dashboard_consistent', {
    p_start: range.start,
    p_end: range.end,
    p_previous_start: range.previousStart,
    p_previous_end: range.previousEnd,
  })

  if (error) {
    if (isMissingOwnerDashboardRpc(error)) {
      return getOwnerDashboardLegacy(period, customFrom, customTo)
    }
    throw error
  }

  const payload = Array.isArray(data) ? data[0] : data
  if (!payload || typeof payload !== 'object') {
    throw new Error('owner_dashboard returned an invalid payload')
  }

  normalizeLegacyAlertPresentation(payload)
  normalizeLegacyActivityPresentation(payload)
  return { range, ...payload } as OwnerDashboardData
}

export async function stockValueAt(startIso: string): Promise<number | null> {
  const date = startIso.slice(0, 10)
  const prevDate = new Date(new Date(startIso).getTime() - 86400000).toISOString().slice(0, 10)
  const snapshots = await getInventoryClient()
    .from('inventory_daily_snapshots')
    .select('stock_value, date')
    .in('date', [date, prevDate])
    .order('date', { ascending: false })
    .limit(1)

  if (snapshots.error) return null
  const best = (snapshots.data ?? [])[0] as any
  return best ? Number(best.stock_value ?? 0) : null
}

async function buildMovement(range: OwnerRange): Promise<OwnerMovementPoint[]> {
  const txns = await fetchTxns(range.start, range.end)
  const byDay = new Map<string, { purchased: number; used: number }>()

  for (const t of txns) {
    const day = t.created_at.slice(0, 10)
    const entry = byDay.get(day) ?? { purchased: 0, used: 0 }
    const type = (t.transaction_type || '').toLowerCase()
    const qty = Math.abs(t.quantity)
    const cost = Number(t.unit_cost) || 0

    if (PURCHASE_TYPES.has(type) && t.quantity > 0) entry.purchased += qty * cost
    if (USED_TYPES.has(type) && t.quantity < 0) entry.used += qty * cost
    byDay.set(day, entry)
  }

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, purchased: round2(v.purchased), used: round2(v.used) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatRand(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return `R${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
