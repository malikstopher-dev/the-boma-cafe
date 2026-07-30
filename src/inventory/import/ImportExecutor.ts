import type { ImportDecision, ImportApplyResult } from './ImportTypes'
import { getInventoryClient } from '../lib/db'
import { createTransaction } from '../engine/ledger'
import type { CreateTransactionInput, TransactionType } from '../engine/types'
import { createId } from '../lib/id'

export class ImportExecutor {
  async execute(
    importId: string,
    decisions: ImportDecision[],
    performedBy?: string | null,
  ): Promise<ImportApplyResult> {
    const supabase = getInventoryClient()
    const transactionIds: string[] = []
    const productIds: string[] = []
    let appliedCount = 0
    const locationIds = new Set<string>()

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

      if (productId && decision.quantity != null && decision.locationId) {
        if (!productIds.includes(productId)) {
          productIds.push(productId)
        }
        locationIds.add(decision.locationId)
        const txn = await createTransaction({
          product_id: productId,
          location_id: decision.locationId,
          transaction_type: (decision.transactionType ?? 'purchase') as TransactionType,
          quantity: Math.abs(decision.quantity),
          unit_cost: decision.unitCost ?? null,
          reference_type: 'import_batch',
          reference_id: importId,
          performed_by: performedBy ?? null,
          notes: `Import: ${decision.sourceRow ?? 'unknown row'}`,
          import_batch_id: importId,
        } satisfies CreateTransactionInput)
        transactionIds.push(txn.id)
        appliedCount++
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

    await supabase
      .from('inventory_imports')
      .update({
        status: 'applied',
        applied_at: result.appliedAt,
        row_count: appliedCount,
        matched_count: productIds.length,
      })
      .eq('id', importId)

    return result
  }
}
