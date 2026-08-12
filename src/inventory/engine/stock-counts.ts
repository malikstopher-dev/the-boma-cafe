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

  const { data: location } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('id', locationId)
    .eq('is_active', true)
    .maybeSingle()

  if (!location) throw new Error(`Location not found or inactive: ${locationId}`)

  const { data: maxTx } = await supabase
    .from('inventory_transactions')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const snapshotTxBefore: string | null = maxTx?.id ?? null

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

  const { count: productCount } = await supabase
    .from('inventory_product_balances')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .gt('balance', 0)

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

  const { data: session } = await supabase
    .from('inventory_stock_counts')
    .select('id, status, location_id, snapshot_tx_before')
    .eq('id', stockCountId)
    .maybeSingle()

  if (!session) throw new Error(`Stock count not found: ${stockCountId}`)
  if (session.status !== 'in_progress') throw new Error(`Stock count is ${session.status}, not in_progress`)

  let expectedQuantity: number | null = null
  if (session.snapshot_tx_before) {
    const { data: txData } = await supabase
      .from('inventory_transactions')
      .select('created_at')
      .eq('id', session.snapshot_tx_before)
      .maybeSingle()

    if (txData) {
      const balance = await getBalanceAtTime(productId, session.location_id, txData.created_at)
      expectedQuantity = balance
    }
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

  const { data: stockCount } = await supabase
    .from('inventory_stock_counts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!stockCount) return null

  const { data: items } = await supabase
    .from('inventory_stock_count_items')
    .select('*, inventory_products(id, name, sku)')
    .eq('stock_count_id', id)
    .order('id', { ascending: true })

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

  await supabase.rpc('inventory_submit_stock_count', { p_stock_count_id: id })

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
  if (session.stockCount.status !== 'submitted') throw new Error(`Stock count is ${session.stockCount.status}, cannot approve`)

  for (const item of session.items) {
    const variance = Number(item.variance ?? 0)
    if (variance !== 0) {
      await createTransaction({
        product_id: item.product_id,
        location_id: session.stockCount.location_id,
        transaction_type: 'physical_count',
        quantity: variance,
        reference_type: 'stock_count',
        reference_id: id,
        performed_by: approvedBy ?? null,
        notes: `Stock count adjustment: variance was ${variance > 0 ? '+' : ''}${variance}`,
      } satisfies CreateTransactionInput)
    }
  }

  const { data: maxTx } = await supabase
    .from('inventory_transactions')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('inventory_stock_counts')
    .update({
      status: 'approved',
      snapshot_tx_after: maxTx?.id ?? null,
      approved_by: approvedBy ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to approve stock count: ${error.message}`)

  await refreshDashboardCache(session.stockCount.location_id)
  await writeAuditLog('inventory_stock_counts', id, 'updated', { status: 'approved', approved_by: approvedBy ?? null }, approvedBy ?? null)

  return data as InventoryStockCount
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
