import { getInventoryClient } from '../lib/db'
import type { PriceHistoryEntry } from './types'

export async function recordPriceChange(
  productId: string,
  unitCost: number,
  supplierId?: string | null,
  quantity?: number | null,
  transactionId?: string | null,
  notes?: string | null,
  recordedBy?: string | null,
): Promise<PriceHistoryEntry> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_price_history')
    .insert({
      product_id: productId,
      supplier_id: supplierId ?? null,
      unit_cost: unitCost,
      quantity: quantity ?? null,
      transaction_id: transactionId ?? null,
      effective_date: new Date().toISOString().slice(0, 10),
      notes: notes ?? null,
      recorded_by: recordedBy ?? null,
    })
    .select()
    .single()

  if (!data) throw new Error('Failed to record price change')

  return data as PriceHistoryEntry
}

export async function getPriceHistory(
  productId: string,
  supplierId?: string,
  limit?: number,
): Promise<PriceHistoryEntry[]> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('effective_date', { ascending: false })
    .limit(limit ?? 20)

  if (supplierId) query = query.eq('supplier_id', supplierId)

  const { data } = await query
  return (data ?? []) as PriceHistoryEntry[]
}

export async function getLatestPrice(
  productId: string,
  supplierId?: string,
): Promise<PriceHistoryEntry | null> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('effective_date', { ascending: false })
    .limit(1)

  if (supplierId) query = query.eq('supplier_id', supplierId)

  const { data } = await query
  return (data?.[0] as PriceHistoryEntry) ?? null
}
