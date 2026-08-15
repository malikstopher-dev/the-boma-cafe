import type { CreateTransactionInput, InventoryTransaction, TransactionType } from './types'
import { InsufficientStockError, ProductNotFoundError, LocationNotFoundError } from '../lib/errors'
import { getInventoryClient } from '../lib/db'
import { resolveCostCentreId } from '../lib/cost-centre'
import { writeAuditLog } from '../lib/audit'

const DECREASE_TYPES: ReadonlySet<TransactionType> = new Set([
  'sale', 'sale_bottle', 'spillage', 'comp', 'staff',
  'waste', 'breakage', 'expiry_loss', 'transfer_out',
  'theft', 'donation', 'gas_usage',
])

function isDecreaseType(t: TransactionType): boolean {
  return DECREASE_TYPES.has(t)
}

export async function getCurrentBalance(productId: string, locationId: string): Promise<number> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .rpc('inventory_get_balance', {
      p_product_id: productId,
      p_location_id: locationId,
    })
    .single()

  if (error) {
    const { data: fallback } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', locationId)
    if (!fallback) return 0
    return fallback.reduce((sum, row) => sum + Number(row.quantity), 0)
  }

  return Number((data as { balance?: number } | null)?.balance ?? 0)
}

export async function getBalanceAtTime(
  productId: string,
  locationId: string,
  timestamp: string,
): Promise<number> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .lte('created_at', timestamp)

  if (error) {
    return 0
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.quantity), 0)
}

/**
 * Resolves a product's current cost: the most recent non-NULL
 * unit_cost across its ledger history. Used to attach a real
 * cost to movements written without one (adjustments, waste,
 * gas usage, physical counts, order-item deductions...).
 * Returns null only when the product has no cost history at all.
 */
async function resolveProductCost(productId: string): Promise<number | null> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('unit_cost')
    .eq('product_id', productId)
    .not('unit_cost', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  const cost = Number((data as { unit_cost: number | null } | null)?.unit_cost ?? 0)
  return cost > 0 ? cost : null
}

export async function createTransaction(input: CreateTransactionInput): Promise<InventoryTransaction> {
  const supabase = getInventoryClient()

  const { data: product } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('id', input.product_id)
    .maybeSingle()
  if (!product) throw new ProductNotFoundError(input.product_id)

  const { data: location } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('id', input.location_id)
    .eq('is_active', true)
    .maybeSingle()
  if (!location) throw new LocationNotFoundError(input.location_id)

  if (isDecreaseType(input.transaction_type) && input.quantity >= 0) {
    const currentBalance = await getCurrentBalance(input.product_id, input.location_id)
    const requested = Math.abs(input.quantity)
    if (currentBalance < requested) {
      throw new InsufficientStockError(
        input.product_id,
        input.location_id,
        requested,
        currentBalance,
      )
    }
  }

  // Decrease types are always negative. Bidirectional types (production,
  // physical_count, transfer_in...) honor the caller's sign — negative
  // quantities represent stock leaving, positive quantities entering.
  const actualQuantity = isDecreaseType(input.transaction_type)
    ? -Math.abs(input.quantity)
    : input.quantity < 0
      ? input.quantity
      : Math.abs(input.quantity)

  // Cost centre is required on every movement (migration 050 NOT NULL).
  // Resolve it BEFORE any write: explicit value wins, otherwise the
  // location's configured cost centre. Never emit undefined/null.
  const costCentreId = await resolveCostCentreId(input.location_id, input.cost_centre_id)

  // Every movement should carry a real unit cost (P0 cost
  // integrity): explicit value wins, otherwise the product's
  // latest known cost is attached automatically.
  const unitCost = input.unit_cost ?? (await resolveProductCost(input.product_id))

  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert({
      product_id: input.product_id,
      location_id: input.location_id,
      transaction_type: input.transaction_type,
      quantity: actualQuantity,
      unit_cost: unitCost,
      cost_centre_id: costCentreId,
      reason_type: input.reason_type ?? null,
      reason_notes: input.reason_notes ?? null,
      manager_note: input.manager_note ?? null,
      note_author: input.note_author ?? null,
      reference_type: input.reference_type ?? null,
      reference_id: input.reference_id ?? null,
      performed_by: input.performed_by ?? null,
      notes: input.notes ?? null,
      import_batch_id: input.import_batch_id ?? null,
      reservation_id: input.reservation_id ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`)
  }

  await writeAuditLog('inventory_transactions', data.id, 'created', {
    product_id: input.product_id,
    location_id: input.location_id,
    transaction_type: input.transaction_type,
    quantity: actualQuantity,
    cost_centre_id: costCentreId,
    reason_type: input.reason_type ?? null,
    reference_type: input.reference_type,
    reference_id: input.reference_id,
  }, input.performed_by ?? null)

  try {
    const newBal = await getCurrentBalance(input.product_id, input.location_id)
    await supabase
      .from('inventory_product_balances')
      .upsert({
        product_id: input.product_id,
        location_id: input.location_id,
        balance: newBal,
        refreshed_at: new Date().toISOString(),
      }, { onConflict: 'product_id, location_id' })
  } catch { /* cache refresh is non-critical */ }

  return data as InventoryTransaction
}

export async function getBalance(productId: string, locationId: string): Promise<number> {
  return getCurrentBalance(productId, locationId)
}
