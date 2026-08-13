import type { ImportDecision, ImportApplyResult, ImportType } from './ImportTypes'
import { getInventoryClient } from '../lib/db'
import { createTransaction } from '../engine/ledger'
import type { CreateTransactionInput, TransactionType } from '../engine/types'
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
        const productFields: Record<string, unknown> = {
          name: decision.newProductName,
          category_id: decision.newProductCategoryId ?? null,
        }
        // Metadata from the parsed row was previously dropped, leaving junk
        // defaults (sku NULL, inventory_type GENERAL) on every imported
        // product. Carry it through when the decision provides it.
        if (decision.newProductSku) productFields.sku = decision.newProductSku
        if (decision.newProductBarcode) productFields.barcode = decision.newProductBarcode
        if (decision.newProductInventoryType) productFields.inventory_type = decision.newProductInventoryType
        if (decision.newProductReorderPoint != null) productFields.reorder_threshold = decision.newProductReorderPoint
        if (decision.newProductParLevel != null) productFields.reorder_quantity = decision.newProductParLevel

        const { data: newProduct, error: productError } = await supabase
          .from('inventory_products')
          .insert(productFields)
          .select('id')
          .single()

        if (productError) throw new Error(`Failed to create product: ${productError.message}`)

        if (newProduct) {
          productId = newProduct.id
          productIds.push(newProduct.id)

          // Base UOM link (one_base_uom CHECK forbids is_base AND is_display)
          if (decision.newProductUomId) {
            const { error: uomError } = await supabase
              .from('inventory_product_uoms')
              .insert({
                product_id: newProduct.id,
                uom_id: decision.newProductUomId,
                is_base: true,
                is_display: false,
                conversion_factor: 1,
              })
            if (uomError) throw new Error(`Failed to link product UOM: ${uomError.message}`)
          }
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
            // Sign-preserving: the ledger normalizes decrease types to
            // negative and honors the sign of bidirectional types (adjustment,
            // physical_count). Math.abs() here silently flipped negative
            // adjustments (stock write-offs) into positive stock additions.
            quantity: Number(decision.quantity),
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

    const result: ImportApplyResult = {
      // H3: the batch id returned to callers must be the id the row is
      // upserted under. A fresh createId() here returned a non-existent id
      // on the engine fallback path (the RPC path returns p_import_id),
      // breaking anything keyed on it (navigation, rollback).
      importBatchId: importId,
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
