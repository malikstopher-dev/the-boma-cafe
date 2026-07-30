import type { ImportRollbackResult } from './ImportTypes'
import { getInventoryClient } from '../lib/db'
import { createTransaction } from '../engine/ledger'
import type { CreateTransactionInput } from '../engine/types'

export class ImportRollbackService {
  async rollback(
    importBatchId: string,
    performedBy?: string | null,
  ): Promise<ImportRollbackResult> {
    const supabase = getInventoryClient()

    const { data: batch } = await supabase
      .from('inventory_imports')
      .select('*')
      .eq('id', importBatchId)
      .maybeSingle()

    if (!batch) {
      throw new Error(`Import batch not found: ${importBatchId}`)
    }

    if (batch.status !== 'applied') {
      throw new Error(`Import batch ${importBatchId} is not in 'applied' status`)
    }

    const appliedAt = batch.applied_at ? new Date(batch.applied_at).getTime() : 0
    const hoursSinceApply = (Date.now() - appliedAt) / (1000 * 60 * 60)
    if (hoursSinceApply > 24) {
      throw new Error('Rollback window has expired (24 hours)')
    }

    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('id, product_id, location_id, quantity, transaction_type')
      .eq('import_batch_id', importBatchId)

    const reversalTransactionIds: string[] = []

    if (transactions) {
      for (const tx of transactions) {
        const reversalQuantity = Math.abs(Number(tx.quantity))
        const reversal = await createTransaction({
          product_id: tx.product_id,
          location_id: tx.location_id,
          transaction_type: 'adjustment',
          quantity: reversalQuantity,
          performed_by: performedBy ?? null,
          reference_type: 'import_batch',
          reference_id: importBatchId,
          notes: `Rollback of import batch ${importBatchId}`,
        } satisfies CreateTransactionInput)
        reversalTransactionIds.push(reversal.id)
      }
    }

    await supabase
      .from('inventory_imports')
      .update({
        status: 'rolled_back',
      })
      .eq('id', importBatchId)

    return {
      importBatchId,
      reversalTransactionIds,
      rolledBackAt: new Date().toISOString(),
    }
  }
}
