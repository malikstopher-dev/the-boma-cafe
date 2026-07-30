import type {
  ImportPreview,
  ImportDecision,
  ImportApplyResult,
  ImportRollbackResult,
  ParsedRow,
  ProductMatch,
  ImportType,
  ImportHistoryEntry,
  ImportDetail,
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

  async preview(
    buffer: ArrayBuffer,
    filename: string,
    importType: ImportType,
    supplierId?: string | null,
  ): Promise<ImportPreview> {
    const parseResult = this.parser.parse(buffer, importType)
    const validation = this.validator.validate(parseResult.rows, importType)

    const matches = await this.matcher.match(parseResult.rows, supplierId)
    const preview = await this.previewBuilder.build(parseResult.rows, matches, importType, filename)

    for (const err of validation.errors) {
      const row = preview.rows.find(r => r.rowIndex === err.rowIndex)
      if (row) {
        row.errors.push(err)
      }
    }

    return preview
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
