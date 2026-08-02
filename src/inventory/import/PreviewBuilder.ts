import type { ParsedRow, ProductMatch, PreviewRow, ImportPreview, ImportType, DetectedHeader } from './ImportTypes'
import { createId } from '../lib/id'

export class PreviewBuilder {
  async build(
    rows: ParsedRow[],
    matches: ProductMatch[],
    importType: ImportType,
    filename: string,
    headers?: DetectedHeader[],
  ): Promise<ImportPreview> {
    const matchMap = new Map<number, ProductMatch>()
    for (const m of matches) {
      matchMap.set(m.rowIndex, m)
    }

    const previewRows: PreviewRow[] = rows.map(row => {
      const match = matchMap.get(row.rowIndex) ?? null
      const isBlank = !row.productName
      return {
        rowIndex: row.rowIndex,
        productName: row.productName,
        match,
        parsedQuantity: row.quantity,
        currentStock: null,
        incomingQuantity: row.quantity,
        expectedStock: null,
        unitCost: row.unitCost,
        errors: [],
        warnings: [],
        skipped: isBlank,
        skipReason: isBlank ? 'Blank row — no product name. Skipped.' : null,
      }
    })

    // Skip rows will be re-detected by the validator too; this gives the
    // builder's counts a correct base before ImportService applies skips.
    const nonSkipped = previewRows.filter(r => !r.skipped)
    const matched = nonSkipped.filter(r => r.match && r.match.matchSource !== 'none')
    const unmatched = nonSkipped.filter(r => !r.match || r.match.matchSource === 'none')
    const errored = nonSkipped.filter(r => r.errors.length > 0)
    const skippedRows = previewRows.filter(r => r.skipped)

    const totalQuantity = nonSkipped.reduce((sum, r) => sum + (r.parsedQuantity ?? 0), 0)
    const totalValue = nonSkipped.reduce((sum, r) => sum + ((r.parsedQuantity ?? 0) * (r.unitCost ?? 0)), 0)

    return {
      id: createId(),
      importType,
      filename,
      totalRows: nonSkipped.length,
      matchedRows: matched.length,
      unknownRows: unmatched.length,
      errorRows: errored.length,
      skippedRows: skippedRows.length,
      skipReasons: [...new Set(skippedRows.map(r => r.skipReason ?? '').filter(Boolean))],
      rows: previewRows,
      headers,
      summary: {
        totalProducts: nonSkipped.length,
        matchedProducts: matched.length,
        unknownProducts: unmatched.length,
        totalQuantity,
        totalValue,
      },
      createdAt: new Date().toISOString(),
    }
  }
}