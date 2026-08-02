import type {
  ImportPreview,
  ImportDecision,
  ImportApplyResult,
  ImportRollbackResult,
  ParsedRow,
  ProductMatch,
  ImportType,
  ImportMode,
  ImportHistoryEntry,
  ImportDetail,
  DetectedHeader,
  ColumnOverride,
} from './ImportTypes'
import { ExcelParser } from './ExcelParser'
import { ColumnMapper } from './ColumnMapper'
import { ImportValidator } from './ImportValidator'
import { ProductMatcher } from './ProductMatcher'
import { PreviewBuilder } from './PreviewBuilder'
import { ImportExecutor } from './ImportExecutor'
import { ImportRollbackService } from './ImportRollbackService'
import { getInventoryClient } from '../lib/db'
import { createId } from '../lib/id'

export class ImportService {
  private parser = new ExcelParser()
  private columnMapper = new ColumnMapper()
  private validator = new ImportValidator()
  private matcher = new ProductMatcher()
  private previewBuilder = new PreviewBuilder()
  private executor = new ImportExecutor()
  private rollbackService = new ImportRollbackService()

  /**
   * Parse ONLY the headers of an upload so the wizard can show + let the user
   * adjust column mapping before committing to the heavy row parse.
   */
  detectColumns(buffer: ArrayBuffer, columnOverride?: ColumnOverride | null): DetectedHeader[] {
    return this.parser.detectHeaders(buffer, columnOverride)
  }

  async preview(
    buffer: ArrayBuffer,
    filename: string,
    importType: ImportType,
    supplierId?: string | null,
    importMode?: ImportMode,
    columnOverride?: ColumnOverride | null,
  ): Promise<ImportPreview> {
    const parseResult = this.parser.parse(buffer, importType, columnOverride)
    const validation = this.validator.validate(parseResult.rows, importType)

    const matches = await this.matcher.match(parseResult.rows, supplierId)
    const preview = await this.previewBuilder.build(parseResult.rows, matches, importType, filename, parseResult.headers)

    for (const err of validation.errors) {
      const row = preview.rows.find(r => r.rowIndex === err.rowIndex)
      if (row) {
        row.errors.push(err)
      }
    }

    // Persist the import record so the Apply → Rollback → History flow has a
    // real row to work with. Without this, apply() updates a non-existent row
    // and history/rollback/detail all report "not found".
    const supabase = getInventoryClient()
    const rowCount = preview.totalRows
    const matchedCount = preview.rows.filter(r => r.match?.productId).length
    const unknownCount = preview.rows.filter(r => !r.match?.productId).length
    const errorCount = preview.rows.reduce((sum, r) => sum + r.errors.length, 0)

    await supabase
      .from('inventory_imports')
      .upsert({
        id: preview.id,
        import_type: importType,
        filename,
        storage_path: preview.id,
        status: 'previewed',
        supplier_id: supplierId ?? null,
        idempotency_key: `preview:${preview.id}`,
        row_count: rowCount,
        matched_count: matchedCount,
        unknown_count: unknownCount,
        error_count: errorCount,
        errors: validation.errors,
      }, { onConflict: 'id' })

    if (importMode === 'direct' && validation.isValid) {
      const allApply: ImportDecision[] = preview.rows
        .filter(r => r.match?.productId)
        .map(r => ({
          rowIndex: r.rowIndex,
          action: 'apply',
          productId: r.match!.productId!,
          quantity: r.parsedQuantity,
          locationId: null,
          unitCost: r.unitCost,
          transactionType: importType === 'adjustment' ? 'adjustment' : 'purchase',
          sourceRow: r.productName,
        }))
      if (allApply.length > 0) {
        const result = await this.executor.execute(preview.id, allApply)
        preview.autoApplied = result.rowCount
      }
    }

    return preview
  }

  async directApply(
    buffer: ArrayBuffer,
    filename: string,
    importType: ImportType,
    locationId: string,
    performedBy?: string | null,
  ): Promise<ImportApplyResult> {
    const parseResult = this.parser.parse(buffer, importType)
    const validation = this.validator.validate(parseResult.rows, importType)

    if (!validation.isValid) {
      throw new Error(`Cannot apply: ${validation.errors.length} validation errors`)
    }

    const matches = await this.matcher.match(parseResult.rows, null)
    const rawDecisions: (ImportDecision | null)[] = parseResult.rows
      .map((row) => {
        const match = matches.find(m => m.rowIndex === row.rowIndex)
        if (!match?.productId) return null
        return {
          rowIndex: row.rowIndex,
          action: 'apply' as const,
          productId: match.productId,
          quantity: row.quantity,
          locationId,
          unitCost: row.unitCost,
          transactionType: importType === 'adjustment' ? 'adjustment' : 'purchase',
          sourceRow: row.productName,
          costCentreId: row.costCentreId,
          reasonType: row.reasonType,
          reasonNotes: row.reasonNotes,
        }
      })
    const decisions = rawDecisions.filter((d): d is ImportDecision => d !== null)

    if (decisions.length === 0) {
      throw new Error('No products matched — cannot direct apply')
    }

    const importId = createId()
    return this.executor.execute(importId, decisions, performedBy, {
      importType,
      filename,
    })
  }

  async apply(
    importId: string,
    decisions: ImportDecision[],
    performedBy?: string | null,
  ): Promise<ImportApplyResult> {
    return this.executor.execute(importId, decisions, performedBy)
  }

  async rollback(
    importBatchId: string,
    performedBy?: string | null,
  ): Promise<ImportRollbackResult> {
    return this.rollbackService.rollback(importBatchId, performedBy)
  }

  async getHistory(): Promise<ImportHistoryEntry[]> {
    const supabase = getInventoryClient()
    const { data } = await supabase
      .from('inventory_imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    return (data ?? []).map(row => ({
      id: row.id,
      importType: row.import_type as ImportType,
      importMode: (row.import_mode ?? 'draft') as ImportMode,
      filename: row.filename,
      status: row.status,
      supplierId: row.supplier_id,
      supplierName: null,
      rowCount: row.row_count,
      matchedCount: row.matched_count,
      unknownCount: row.unknown_count,
      errorCount: row.error_count,
      appliedBy: row.applied_by,
      appliedAt: row.applied_at,
      createdAt: row.created_at,
      canRollback: row.status === 'applied',
    }))
  }

  async getDetail(id: string): Promise<ImportDetail | null> {
    const supabase = getInventoryClient()
    const { data } = await supabase
      .from('inventory_imports')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data) return null

    return {
      id: data.id,
      importType: data.import_type,
      importMode: (data.import_mode ?? 'draft') as ImportMode,
      filename: data.filename,
      status: data.status,
      supplierId: data.supplier_id,
      supplierName: null,
      rowCount: data.row_count,
      matchedCount: data.matched_count,
      unknownCount: data.unknown_count,
      errorCount: data.error_count,
      appliedBy: data.applied_by,
      appliedAt: data.applied_at,
      createdAt: data.created_at,
      canRollback: data.status === 'applied',
      storagePath: data.storage_path,
      errors: data.errors,
      rows: [],
    }
  }
}
