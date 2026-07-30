import type { ParsedRow, ProductMatch, PreviewRow, ImportPreview, ImportType } from './ImportTypes'
import { createId } from '../lib/id'

export class PreviewBuilder {
  async build(
    rows: ParsedRow[],
    matches: ProductMatch[],
    importType: ImportType,
    filename: string,
  ): Promise<ImportPreview> {
    const matchMap = new Map<number, ProductMatch>()
    for (const m of matches) {
      matchMap.set(m.rowIndex, m)
    }

    const previewRows: PreviewRow[] = rows.map(row => {
      const match = matchMap.get(row.rowIndex) ?? null
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
      }
    })

    const matched = previewRows.filter(r => r.match && r.match.matchSource !== 'none')
    const unknown = previewRows.filter(r => !r.match || r.match.matchSource === 'none')
    const errored = previewRows.filter(r => r.errors.length > 0)

    const totalQuantity = rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0)
    const totalValue = rows.reduce((sum, r) => sum + ((r.quantity ?? 0) * (r.unitCost ?? 0)), 0)

    return {
      id: createId(),
      importType,
      filename,
      totalRows: rows.length,
      matchedRows: matched.length,
      unknownRows: unknown.length,
      errorRows: errored.length,
      rows: previewRows,
      summary: {
        totalProducts: rows.length,
        matchedProducts: matched.length,
        unknownProducts: unknown.length,
        totalQuantity,
        totalValue,
      },
      createdAt: new Date().toISOString(),
    }
  }
}
