import type { InventoryStockCount, InventoryStockCountItem, StockCountStatus, CreateTransactionInput } from './types'
import { getInventoryClient } from '../lib/db'
import { createTransaction, getBalanceAtTime } from './ledger'
import { refreshDashboardCache } from './dashboard'
import { writeAuditLog } from '../lib/audit'

export interface CreateStockCountResult {
  stockCount: InventoryStockCount
  productCount: number
}

export async function createStockCount(
  locationId: string,
  performedBy?: string | null,
  notes?: string | null,
): Promise<CreateStockCountResult> {
  const supabase = getInventoryClient()

  const { data: location, error: locationError } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('id', locationId)
    .eq('is_active', true)
    .maybeSingle()

  if (locationError) throw new Error(`Failed to validate stock count location: ${locationError.message}`)
  if (!location) throw new Error(`Location not found or inactive: ${locationId}`)

  const { data: maxTx, error: snapshotError } = await supabase
    .from('inventory_transactions')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (snapshotError) throw new Error(`Failed to establish stock count snapshot: ${snapshotError.message}`)
  const snapshotTxBefore: string | null = maxTx?.id ?? null

  const { count: productCount, error: countError } = await supabase
    .from('inventory_product_balances')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .gt('balance', 0)

  if (countError) throw new Error(`Failed to count stocked products: ${countError.message}`)

  const { data, error } = await supabase
    .from('inventory_stock_counts')
    .insert({
      location_id: locationId,
      status: 'in_progress',
      snapshot_tx_before: snapshotTxBefore,
      performed_by: performedBy ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create stock count: ${error.message}`)

  await writeAuditLog('inventory_stock_counts', data.id, 'created', { location_id: locationId }, performedBy ?? null)

  return { stockCount: data as InventoryStockCount, productCount: productCount ?? 0 }
}

export async function saveCountItem(
  stockCountId: string,
  productId: string,
  physicalQuantity: number,
  varianceReason?: string | null,
): Promise<InventoryStockCountItem> {
  const supabase = getInventoryClient()

  const { data: session, error: sessionError } = await supabase
    .from('inventory_stock_counts')
    .select('id, status, location_id, snapshot_tx_before')
    .eq('id', stockCountId)
    .maybeSingle()

  if (sessionError) throw new Error(`Failed to load stock count: ${sessionError.message}`)
  if (!session) throw new Error(`Stock count not found: ${stockCountId}`)
  if (session.status !== 'in_progress') throw new Error(`Stock count is ${session.status}, not in_progress`)

  let expectedQuantity: number | null = null
  if (session.snapshot_tx_before) {
    const { data: txData, error: snapshotError } = await supabase
      .from('inventory_transactions')
      .select('created_at')
      .eq('id', session.snapshot_tx_before)
      .maybeSingle()

    if (snapshotError) throw new Error(`Failed to load stock count snapshot transaction: ${snapshotError.message}`)
    if (!txData) throw new Error(`Stock count snapshot transaction not found: ${session.snapshot_tx_before}`)
    expectedQuantity = await getBalanceAtTime(productId, session.location_id, txData.created_at)
  }

  if (expectedQuantity === null) {
    expectedQuantity = 0
  }

  const { data, error } = await supabase
    .from('inventory_stock_count_items')
    .upsert(
      {
        stock_count_id: stockCountId,
        product_id: productId,
        physical_quantity: physicalQuantity,
        expected_quantity: expectedQuantity,
        variance_reason: varianceReason ?? null,
      },
      { onConflict: 'stock_count_id,product_id' },
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save count item: ${error.message}`)

  return data as InventoryStockCountItem
}

export async function getStockCount(id: string): Promise<{ stockCount: InventoryStockCount; items: InventoryStockCountItem[] } | null> {
  const supabase = getInventoryClient()

  const { data: stockCount, error: stockCountError } = await supabase
    .from('inventory_stock_counts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (stockCountError) throw new Error(`Failed to load stock count: ${stockCountError.message}`)
  if (!stockCount) return null

  const { data: items, error: itemsError } = await supabase
    .from('inventory_stock_count_items')
    .select('*, inventory_products(id, name, sku)')
    .eq('stock_count_id', id)
    .order('id', { ascending: true })

  if (itemsError) throw new Error(`Failed to load stock count items: ${itemsError.message}`)

  return {
    stockCount: stockCount as InventoryStockCount,
    items: (items ?? []) as InventoryStockCountItem[],
  }
}

export async function listStockCounts(locationId?: string): Promise<InventoryStockCount[]> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_stock_counts')
    .select('*')

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50)

  if (error) throw new Error(`Failed to list stock counts: ${error.message}`)

  return (data ?? []) as InventoryStockCount[]
}

export async function submitStockCount(id: string, performedBy?: string | null): Promise<InventoryStockCount> {
  const supabase = getInventoryClient()

  const session = await getStockCount(id)
  if (!session) throw new Error(`Stock count not found: ${id}`)
  if (session.stockCount.status !== 'in_progress') throw new Error(`Stock count is ${session.stockCount.status}, cannot submit`)

  const { data, error } = await supabase
    .from('inventory_stock_counts')
    .update({ status: 'submitted' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to submit stock count: ${error.message}`)

  return data as InventoryStockCount
}

export async function approveStockCount(id: string, approvedBy: string | null = null): Promise<InventoryStockCount> {
  const supabase = getInventoryClient()

  const session = await getStockCount(id)
  if (!session) throw new Error(`Stock count not found: ${id}`)
  // 'approving' is re-enterable: a crash mid-approval leaves the session in
  // this state, and retrying the approve action resumes (items whose
  // transaction_id is already set are skipped, so nothing double-posts).
  if (!['submitted', 'approving'].includes(session.stockCount.status)) {
    throw new Error(`Stock count is ${session.stockCount.status}, cannot approve`)
  }

  // C2 preflight: the stamp below writes inventory_stock_count_items.
  // transaction_id (migration 073). If the column is missing (PGRST204 —
  // code deployed before the migration), fail cleanly BEFORE claiming or
  // creating any transactions; without this, every approval posts item
  // adjustments and then dies on the first stamp, and each retry stacks a
  // duplicate adjustment.
  const { error: preflightError } = await supabase
    .from('inventory_stock_count_items')
    .select('transaction_id')
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .maybeSingle()

  if (preflightError) {
    throw new Error(
      'Stock count approval is unavailable: migration 073 (inventory_stock_count_items.transaction_id) is not applied. ' +
        'Apply it to the database before approving stock counts.',
    )
  }

  // Claim the session BEFORE creating any transactions. The status
  // predicate is an optimistic lock: a concurrent approve (double-click)
  // affects zero rows and is rejected before it can post duplicate
  // adjustments.
  const { data: claimed, error: claimError } = await supabase
    .from('inventory_stock_counts')
    .update({ status: 'approving' })
    .eq('id', id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (claimError) throw new Error(`Failed to start approval: ${claimError.message}`)

  if (!claimed) {
    const current = await getStockCount(id)
    if (!current) throw new Error(`Stock count not found: ${id}`)
    if (current.stockCount.status === 'approved') return current.stockCount
    // 'approving' means an earlier attempt crashed mid-approval; re-enter.
    if (current.stockCount.status !== 'approving') {
      throw new Error(`Stock count is ${current.stockCount.status}, cannot approve`)
    }
  }

  try {
    for (const item of session.items) {
      // Idempotency: an item already adjusted by a previous (interrupted)
      // attempt is skipped — its transaction_id links it to the posted
      // adjustment, so retrying never double-posts.
      if (item.transaction_id) continue

      const variance = Number(item.variance ?? 0)
      if (variance !== 0) {
        let txn: { id: string }
        try {
          txn = await createTransaction({
            product_id: item.product_id,
            location_id: session.stockCount.location_id,
            transaction_type: 'physical_count',
            quantity: variance,
            reference_type: 'stock_count',
            reference_id: id,
            performed_by: approvedBy ?? null,
            notes: `Stock count adjustment: variance was ${variance > 0 ? '+' : ''}${variance}`,
          } satisfies CreateTransactionInput)
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
            // H1: this item's adjustment already exists — a concurrent
            // approval won the insert, or a retry after a crash between
            // createTransaction and the stamp. Reuse the posted txn
            // (unique index 076 guarantees at most one) and stamp it;
            // never post a second adjustment.
            const { data: existing } = await supabase
              .from('inventory_transactions')
              .select('id')
              .eq('reference_id', id)
              .eq('product_id', item.product_id)
              .eq('transaction_type', 'physical_count')
              .maybeSingle()
            if (!existing) throw error
            txn = existing as { id: string }
          } else {
            throw error
          }
        }

        const { error: stampError } = await supabase
          .from('inventory_stock_count_items')
          .update({ transaction_id: txn.id })
          .eq('id', item.id)
        if (stampError) throw new Error(`Failed to link adjustment to count item: ${stampError.message}`)
      }
    }

    const { data: maxTx, error: snapshotError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (snapshotError) throw new Error(`Failed to establish approved stock count snapshot: ${snapshotError.message}`)

    const { data, error } = await supabase
      .from('inventory_stock_counts')
      .update({
        status: 'approved',
        snapshot_tx_after: maxTx?.id ?? null,
        approved_by: approvedBy ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'approving')
      .select()
      .single()

    if (error) throw new Error(`Failed to approve stock count: ${error.message}`)

    await refreshDashboardCache(session.stockCount.location_id)
    await writeAuditLog('inventory_stock_counts', id, 'updated', { status: 'approved', approved_by: approvedBy ?? null }, approvedBy ?? null)

    return data as InventoryStockCount
  } catch (error) {
    // Best-effort restore: back to 'submitted' so the approve action can be
    // retried. Items already stamped with a transaction_id are skipped on
    // retry, so a restored session never double-posts.
    await supabase
      .from('inventory_stock_counts')
      .update({ status: 'submitted' })
      .eq('id', id)
      .eq('status', 'approving')
    throw error
  }
}

export async function cancelStockCount(id: string): Promise<InventoryStockCount> {
  const supabase = getInventoryClient()

  const { data, error } = await supabase
    .from('inventory_stock_counts')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel stock count: ${error.message}`)

  return data as InventoryStockCount
}
