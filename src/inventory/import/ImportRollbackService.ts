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

    // Claim the batch BEFORE creating any reversals. The status predicate
    // makes this an optimistic lock: a concurrent rollback (double-click)
    // affects zero rows. On failure the status is restored (best effort) so
    // the rollback can be retried safely.
    const { data: claimed, error: claimError } = await supabase
      .from('inventory_imports')
      .update({ status: 'rolled_back' })
      .eq('id', importBatchId)
      .eq('status', 'applied')
      .select('id')
      .maybeSingle()

    if (claimError) throw new Error(`Failed to mark import batch as rolled back: ${claimError.message}`)
    if (!claimed) {
      // H4 re-entry: a crashed or concurrent attempt may have left the
      // batch 'rolled_back' with partial reversals. Resume instead of
      // rejecting — the notes-signature filter below plus the unique index
      // (migration 078) make the loop idempotent, so a resumed run only
      // creates the missing reversals and can never double-post.
      const { data: current } = await supabase
        .from('inventory_imports')
        .select('status')
        .eq('id', importBatchId)
        .maybeSingle()

      if (!current || current.status !== 'rolled_back') {
        throw new Error(`Import batch ${importBatchId} was already rolled back`)
      }
    }

    // Only the batch's ORIGINAL movements are reversed. Reversal rows never
    // carry import_batch_id (see below), but excluding them by their notes
    // signature makes the query robust even against partial prior attempts.
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('id, product_id, location_id, quantity, unit_cost, transaction_type')
      .eq('import_batch_id', importBatchId)
      .not('notes', 'like', 'Rollback of import batch %')

    const reversalTransactionIds: string[] = []

    try {
      if (transactions) {
        for (const tx of transactions) {
          // Exact sign negation: a +10 purchase reverses to -10 (stock OUT),
          // a -4 adjustment reverses to +4. Math.abs() would force both
          // positive and roll back by ADDING stock.
          const reversalQuantity = -Number(tx.quantity)
          // The notes carry the source transaction id (migration 078): the
          // partial unique index guarantees at most one reversal per source
          // movement, even when two rollback loops run concurrently.
          const reversalNotes = `Rollback of import batch ${importBatchId} (reversal of ${tx.id})`
          let reversalId: string
          try {
            const reversal = await createTransaction({
              product_id: tx.product_id,
              location_id: tx.location_id,
              transaction_type: 'adjustment',
              quantity: reversalQuantity,
              unit_cost: tx.unit_cost ?? null,
              performed_by: performedBy ?? null,
              reference_type: 'import_batch',
              reference_id: importBatchId,
              notes: reversalNotes,
            } satisfies CreateTransactionInput)
            reversalId = reversal.id
          } catch (error) {
            if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
              // H4: a concurrent rollback loop posted this reversal while we
              // were mid-loop. Reuse it; never post a second one.
              const { data: existing } = await supabase
                .from('inventory_transactions')
                .select('id')
                .eq('notes', reversalNotes)
                .maybeSingle()
              if (!existing) throw error
              reversalId = existing.id
            } else {
              throw error
            }
          }
          reversalTransactionIds.push(reversalId)
        }
      }
    } catch (error) {
      // Best-effort restore so the rollback can be retried. A retry only
      // reverses txns NOT already reversed (the notes-signature filter
      // above), so nothing double-posts.
      await supabase
        .from('inventory_imports')
        .update({ status: 'applied' })
        .eq('id', importBatchId)
        .eq('status', 'rolled_back')
      throw error
    }

    return {
      importBatchId,
      reversalTransactionIds,
      rolledBackAt: new Date().toISOString(),
    }
  }
}
