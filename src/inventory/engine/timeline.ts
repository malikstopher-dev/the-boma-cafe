import { getInventoryClient } from '../lib/db'
import type { MovementEvent } from './types'

export interface TimelineQuery {
  productId?: string
  locationId?: string
  supplierId?: string
  purchaseOrderId?: string
  bookingId?: string
  customerId?: string
  limit?: number
  from?: string
  to?: string
}

export async function getTimeline(query: TimelineQuery): Promise<MovementEvent[]> {
  const supabase = getInventoryClient()
  const limit = query.limit ?? 50

  let dbQuery = supabase
    .from('inventory_transactions')
    .select(`
      id,
      transaction_type,
      quantity,
      reason_type,
      reason_notes,
      manager_note,
      note_author,
      performed_by,
      created_at,
      reference_type,
      reference_id,
      notes,
      cost_centre_id,
      cost_centres!inner(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (query.productId) {
    dbQuery = dbQuery.eq('product_id', query.productId)
  }
  if (query.locationId) {
    dbQuery = dbQuery.eq('location_id', query.locationId)
  }
  if (query.supplierId) {
    dbQuery = dbQuery.eq('reference_type', 'purchase_order')
      // supplier filtering would need a join to purchase_orders
      // For now, supplier timeline is scoped by the caller
  }
  if (query.purchaseOrderId) {
    dbQuery = dbQuery
      .eq('reference_type', 'purchase_order')
      .eq('reference_id', query.purchaseOrderId)
  }
  if (query.bookingId) {
    dbQuery = dbQuery
      .eq('reference_type', 'booking')
      .eq('reference_id', query.bookingId)
  }
  if (query.from) {
    dbQuery = dbQuery.gte('created_at', query.from)
  }
  if (query.to) {
    dbQuery = dbQuery.lte('created_at', query.to)
  }

  const { data, error } = await dbQuery

  if (error) {
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    transaction_type: row.transaction_type,
    quantity: Number(row.quantity),
    reason_type: row.reason_type ?? null,
    reason_notes: row.reason_notes ?? null,
    manager_note: row.manager_note ?? null,
    note_author: row.note_author ?? null,
    cost_centre_name: row.cost_centres?.name ?? null,
    performed_by: row.performed_by ?? null,
    created_at: row.created_at,
    reference_type: row.reference_type ?? null,
    reference_id: row.reference_id ?? null,
    notes: row.notes ?? null,
  }))
}
