import type { ImportDecision, ImportApplyResult, ImportType } from './ImportTypes'
import { getInventoryClient } from '../lib/db'
import { createTransaction } from '../engine/ledger'
import type { CreateTransactionInput, TransactionType } from '../engine/types'
import { createId } from '../lib/id'
import { resolveLocationId } from '../lib/location'

export class ImportExecutor {
  async execute(
    importId: string,
    decisions: ImportDecision[],
    performedBy?: string | null,
    meta?: { importType: ImportType; filename: string },
  ): Promise<ImportApplyResult> {
    const supabase = getInventoryClient()
    const transactionIds: string[] = []
    const productIds: string[] = []
    let appliedCount = 0
    const locationIds = new Set<string>()
    let defaultLocationId: string | null = null

    for (const decision of decisions) {
      if (decision.action === 'skip') continue

      let productId = decision.productId ?? null

      if (decision.action === 'create_product' && decision.newProductName) {
        const { data: newProduct } = await supabase
          .from('inventory_products')
          .insert({
            name: decision.newProductName,
            category_id: decision.newProductCategoryId ?? null,
          })
          .select('id')
          .single()
        if (newProduct) {
          productId = newProduct.id
          productIds.push(newProduct.id)
        }
      }

      // Resolve the default active location once when a decision has no
      // location (the apply UI sends locationId: null). Without this, no
      // ledger transaction is created and the import silently applies 0 rows.
      if (productId && decision.quantity != null) {
        if (!decision.locationId && !defaultLocationId) {
          defaultLocationId = await resolveLocationId()
        }
        const locationId = decision.locationId ?? defaultLocationId
        if (locationId) {
          if (!productIds.includes(productId)) {
            productIds.push(productId)
          }
          locationIds.add(locationId)
          const txn = await createTransaction({
            product_id: productId,
            location_id: locationId,
            transaction_type: (decision.transactionType ?? 'purchase') as TransactionType,
            quantity: Math.abs(decision.quantity),
            unit_cost: decision.unitCost ?? null,
            reference_type: 'import_batch',
            reference_id: importId,
            performed_by: performedBy ?? null,
            notes: `Import: ${decision.sourceRow ?? 'unknown row'}`,
            import_batch_id: importId,
            cost_centre_id: decision.costCentreId ?? null,
            reason_type: (decision.reasonType ?? null) as any,
            reason_notes: decision.reasonNotes ?? null,
          } satisfies CreateTransactionInput)
        transactionIds.push(txn.id)
        appliedCount++
      }
    }
    }

    const batchId = createId()
    const result: ImportApplyResult = {
      importBatchId: batchId,
      transactionIds,
      productIds: [...new Set(productIds)],
      rowCount: appliedCount,
      appliedAt: new Date().toISOString(),
    }

    // Upsert: the row may already exist from preview(), or this is a direct
    // apply where no preview row exists yet. update() alone silently affects
    // 0 rows, leaving history empty and rollback broken ("batch not found").
    // meta is only passed for direct applies (no preview row) and carries the
    // NOT NULL columns; without meta, only the existing row is updated.
    await supabase
      .from('inventory_imports')
      .upsert({
        id: importId,
        status: 'applied',
        applied_at: result.appliedAt,
        applied_by: performedBy ?? null,
        row_count: appliedCount,
        matched_count: productIds.length,
        ...(meta
          ? {
              import_type: meta.importType,
              filename: meta.filename,
              storage_path: importId,
              idempotency_key: `batch:${importId}`,
            }
          : {}),
      }, { onConflict: 'id' })

    return result
  }
}
