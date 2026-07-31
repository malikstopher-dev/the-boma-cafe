import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'
import { WasteValidationError } from '../lib/errors'
import type { InventoryTransaction, MovementReason, TransactionType, WasteSummaryRow } from './types'

export const WASTE_TRANSACTION_TYPES: ReadonlyArray<TransactionType> = [
  'waste',
  'breakage',
  'spillage',
  'comp',
  'expiry_loss',
  'theft',
  'donation',
]

export const WASTE_REASONS: ReadonlyArray<MovementReason> = [
  'BREAKAGE',
  'WASTE',
  'SPILLAGE',
  'EXPIRED',
  'THEFT',
  'DONATION',
  'COMP',
  'STAFF_MEAL',
  'PROMOTION',
]

const DEFAULT_REASON: Record<string, MovementReason> = {
  waste: 'WASTE',
  breakage: 'BREAKAGE',
  spillage: 'SPILLAGE',
  comp: 'COMP',
  expiry_loss: 'EXPIRED',
  theft: 'THEFT',
  donation: 'DONATION',
}

export interface RecordWasteInput {
  product_id: string
  location_id: string
  transaction_type: TransactionType
  quantity: number
  reason_type?: MovementReason | null
  reason_notes?: string | null
  cost_centre_id?: string | null
  performed_by?: string | null
}

export async function recordWaste(input: RecordWasteInput): Promise<InventoryTransaction> {
  if (!WASTE_TRANSACTION_TYPES.includes(input.transaction_type)) {
    throw new WasteValidationError(
      `transaction_type must be one of: ${WASTE_TRANSACTION_TYPES.join(', ')}`,
    )
  }

  if (!input.quantity || input.quantity <= 0) {
    throw new WasteValidationError('quantity must be a positive number')
  }

  const defaultReason = DEFAULT_REASON[input.transaction_type] ?? 'WASTE'

  return createTransaction({
    product_id: input.product_id,
    location_id: input.location_id,
    transaction_type: input.transaction_type,
    quantity: -Math.abs(input.quantity),
    reason_type: input.reason_type ?? defaultReason,
    reason_notes: input.reason_notes ?? null,
    cost_centre_id: input.cost_centre_id ?? null,
    performed_by: input.performed_by ?? null,
    reference_type: 'manual',
  })
}

export interface WasteEventQuery {
  location_id?: string | null
  from?: string | null
  to?: string | null
  limit?: number
}

export async function listWasteEvents(query: WasteEventQuery = {}): Promise<InventoryTransaction[]> {
  const supabase = getInventoryClient()
  const limit = Math.min(query.limit ?? 100, 200)

  let q = supabase
    .from('inventory_transactions')
    .select('*, inventory_products!inner(id, name, sku)')
    .in('transaction_type', WASTE_TRANSACTION_TYPES as unknown as string[])

  if (query.location_id) q = q.eq('location_id', query.location_id)
  if (query.from) q = q.gte('created_at', query.from)
  if (query.to) q = q.lte('created_at', query.to)

  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as InventoryTransaction[]
}

export async function wasteSummary(query: WasteEventQuery = {}): Promise<WasteSummaryRow[]> {
  const supabase = getInventoryClient()
  const from = query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = query.to ?? new Date().toISOString()

  let q = supabase
    .from('inventory_transactions')
    .select(
      'transaction_type, quantity, unit_cost, inventory_products!inner(id, name, sku)',
    )
    .in('transaction_type', WASTE_TRANSACTION_TYPES as unknown as string[])
    .gte('created_at', from)
    .lte('created_at', to)

  if (query.location_id) q = q.eq('location_id', query.location_id)

  const { data, error } = await q

  if (error) throw error

  const rows = (data ?? []) as unknown as Array<{
    transaction_type: TransactionType
    quantity: number
    unit_cost: number | null
  }>

  const map = new Map<TransactionType, { count: number; total: number; value: number }>()

  for (const row of rows) {
    const entry = map.get(row.transaction_type) ?? { count: 0, total: 0, value: 0 }
    entry.count += 1
    entry.total += Math.abs(row.quantity)
    entry.value += Math.abs(row.quantity) * (row.unit_cost ?? 0)
    map.set(row.transaction_type, entry)
  }

  return [...map.entries()]
    .map(([transaction_type, v]) => ({
      transaction_type,
      count: v.count,
      total_quantity: v.total,
      estimated_value: v.value,
    }))
    .sort((a, b) => b.estimated_value - a.estimated_value)
}
