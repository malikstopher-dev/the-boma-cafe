import type { CreateTransactionInput, InventoryTransaction } from './types'
import {
  InsufficientStockError,
  ProductNotFoundError,
  LocationNotFoundError,
  MissingCostCentreError,
  InvalidCostCentreError,
} from '../lib/errors'
import { getInventoryClient } from '../lib/db'

/**
 * Sums the transaction ledger for a product+location - the authoritative
 * "available" quantity for stock validation and cache refreshes.
 *
 * Decrease validation must NEVER trust the balance cache: the cache is a
 * display mirror and can survive ledger data loss (O1-D wipe), while the
 * ledger is the single write-truth the F2/E1-4 insufficient-stock rule is
 * built on (deduct only what the ledger actually has).
 */
async function ledgerSum(productId: string, locationId: string): Promise<number> {
  const supabase = getInventoryClient()
  const { data: rows, error } = await supabase
    .from('inventory_transactions')
    .select('quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
  if (error) throw new Error(`Failed to read ledger balance: ${error.message}`)
  if (!rows) return 0
  return rows.reduce((sum, row) => sum + Number(row.quantity), 0)
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
    // Migration 094 creates the RPC (reads the engine-maintained balance
    // cache). This ledger-sum fallback keeps pre-094 environments working.
    return ledgerSum(productId, locationId)
  }

  // PostgREST returns scalar RPC results as a bare number (or numeric
  // string); some configurations wrap them as { balance }. Handle both.
  const bal = data as number | string | { balance?: number | string } | null
  if (typeof bal === 'number' || typeof bal === 'string') return Number(bal)
  return Number((bal as { balance?: number | string } | null)?.balance ?? 0)
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
    throw new Error(`Failed to read historical balance: ${error.message}`)
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.quantity), 0)
}

export async function createTransaction(input: CreateTransactionInput): Promise<InventoryTransaction> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase.rpc('create_inventory_transaction', {
    p_input: {
      product_id: input.product_id,
      location_id: input.location_id,
      transaction_type: input.transaction_type,
      quantity: input.quantity,
      unit_cost: input.unit_cost ?? null,
      cost_centre_id: input.cost_centre_id ?? null,
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
      order_id: input.order_id ?? null,
      order_line_id: input.order_line_id ?? null,
      recipe_id: input.recipe_id ?? null,
    },
  })

  if (error || !data) {
    const message = error?.message ?? 'No transaction returned'
    if (message.startsWith('Product not found:')) throw new ProductNotFoundError(input.product_id)
    if (message.startsWith('Location not found:')) throw new LocationNotFoundError(input.location_id)
    if (message.startsWith('No cost centre could be determined')) throw new MissingCostCentreError(input.location_id)
    if (message.startsWith('Cost centre ') && message.includes('does not exist or is not active')) {
      throw new InvalidCostCentreError(input.cost_centre_id ?? 'unknown')
    }
    if (message.startsWith('Insufficient stock for product')) {
      const values = message.match(/requested ([^,]+), available ([^\s]+)/)
      throw new InsufficientStockError(
        input.product_id,
        input.location_id,
        Number(values?.[1] ?? Math.abs(input.quantity)),
        Number(values?.[2] ?? 0),
      )
    }
    throw new Error(`Failed to create transaction atomically: ${message}`)
  }

  return data as InventoryTransaction
}

export async function getBalance(productId: string, locationId: string): Promise<number> {
  return getCurrentBalance(productId, locationId)
}
