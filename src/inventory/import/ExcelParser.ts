import * as XLSX from 'xlsx'
import type { ParsedRow, ParseError, ParseResult, ImportType, DetectedHeader, ColumnOverride, ImportField } from './ImportTypes'

const HEADER_ALIASES: Record<ImportField, string[]> = {
  productName: ['product', 'product name', 'item', 'item name', 'description', 'name', 'product description', 'menu item'],
  quantity: ['qty', 'quantity', 'count', 'amount', 'units', 'number', 'total qty', 'total quantity'],
  unit: ['unit', 'uom', 'measure', 'unit of measure', 'measurement', 'package size', 'size', 'pack size'],
  supplierSku: ['supplier sku', 'sku', 'supplier code', 'code', 'product code', 'item code', 'vendor code', 'ref', 'sku no', 'sku #'],
  unitCost: ['unit cost', 'cost', 'price', 'unit price', 'cost per unit', 'purchase price', 'unit price (zar)', 'price per unit', 'buy price', 'wholesale price'],
  bottleSizeMl: ['bottle size', 'bottle size ml', 'size ml', 'ml', 'volume ml', 'volume', 'capacity'],
  fullBottles: ['full bottles', 'bottles', 'bottle count', 'whole bottles'],
  tots: ['tots', 'shots', 'pours', 'tot count', 'shot count'],
  notes: ['notes', 'comment', 'comments', 'remarks', 'note', 'additional notes'],
  categoryName: ['category', 'product category', 'type', 'group', 'department', 'section', 'category type'],
  inventoryType: ['item type', 'inventory type', 'product type', 'type of item', 'for'],
  sku: ['internal sku', 'my sku', 'sku (internal)', 'product sku'],
  barcode: ['barcode', 'bar code', 'upc', 'ean', 'gs1', 'scan code'],
  parLevel: ['par level', 'par', 'par stock', 'min target', 'minimum stock', 'target stock', 'par qty'],
  reorderPoint: ['reorder point', 'reorder level', 'reorder alert', 'alert point', 'trigger point'],
  preferredSupplier: ['preferred supplier', 'supplier', 'default supplier', 'vendor', 'main supplier', 'buy from'],
}

// Priority order used by the auto-detect pass (unmapped columns).
const FIELD_PRIORITY: ImportField[] = [
  'productName',
  'quantity',
  'unitCost',
  'unit',
  'preferredSupplier',
  'supplierSku',
  'categoryName',
  'inventoryType',
  'bottleSizeMl',
  'fullBottles',
  'tots',
  'sku',
  'barcode',
  'parLevel',
  'reorderPoint',
  'notes',
]

function normalizeHeaderForField(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Match a single spreadsheet header against a field's alias list. Returns
// 'exact', 'alias' (substring), or 'none'.
export function matchHeaderToField(header: string, field: ImportField): 'exact' | 'alias' | 'none' {
  const cleaned = normalizeHeaderForField(header)
  if (!cleaned) return 'none'
  const aliasList = HEADER_ALIASES[field] ?? []
  for (const alias of aliasList) {
    const cleanAlias = alias.toLowerCase()
    if (cleaned === cleanAlias) return 'exact'
  }
  for (const alias of aliasList) {
    const cleanAlias = normalizeHeaderForField(alias)
    if (!cleanAlias) continue
    if (cleaned.includes(cleanAlias) || cleanAlias.includes(cleaned)) return 'alias'
  }
  return 'none'
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  const str = String(value).trim().replace(/[Rr\s,]/g, '')
  const num = Number(str)
  return Number.isFinite(num) ? num : null
}

type HeaderMeta = { raw: string; field: ImportField | null; match: 'exact' | 'alias' | 'none' }

export class ExcelParser {
  /**
   * Detect and (optionally) remap spreadsheet columns without parsing rows.
   * Used by the wizard's Step 2 so the user can verify/adjust mapping before
   * the heavy parse happens. Returns the header metadata.
   */
  detectHeaders(buffer: ArrayBuffer, override?: ColumnOverride | null): DetectedHeader[] {
    const workbook: XLSX.WorkBook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName!]
    if (!sheet) return []

    const ref = sheet['!ref']
    if (!ref) return []

    const range = XLSX.utils.decode_range(ref)
    const headerRow = range.s.r
    const headers: { header: string }[] = []

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c })
      const cell = sheet[addr]
      if (cell?.v !== undefined && cell.v !== null) {
        headers.push({ header: String(cell.v).trim() })
      }
    }

    return this.mapHeaders(headers.map(h => h.header), override)
  }

  /**
   * Given the raw spreadsheet header strings, assign each to a system field
   * (or leave unmapped). Honors an explicit user override first, then falls
   * back to alias-based detection. The mapping is deterministic.
   */
  mapHeaders(rawHeaders: string[], override?: ColumnOverride | null): DetectedHeader[] {
    const usedOverrides = new Set<string>()

    // First pass: honor explicit overrides.
    const result: DetectedHeader[] = rawHeaders.map<DetectedHeader>((header) => {
      // An override maps field -> original header text. Match by exact raw header.
      let matched: ImportField | null = null
      for (const [field, srcHeader] of Object.entries(override ?? {})) {
        if (!srcHeader) continue
        if (srcHeader === header) {
          matched = field as ImportField
          usedOverrides.add(field)
          return { field: matched, header, match: 'exact' }
        }
      }
      return { field: null, header, match: 'none' }
    })

    // Second pass: auto-detect remaining unmapped headers.
    const assigned = new Set<string>([...usedOverrides])
    for (let i = 0; i < result.length; i++) {
      const entry = result[i]
      if (!entry) continue
      if (entry.field) continue // already overridden

      const best = this.bestFieldForHeader(entry.header, assigned)
      if (best) {
        entry.field = best.field
        entry.match = best.match
        assigned.add(best.field)
      }
    }

    // Sort by column order, keeping the stable output shape.
    return result
  }

  private bestFieldForHeader(header: string, assigned: Set<string>): { field: ImportField; match: 'exact' | 'alias' } | null {
    let bestMatch: 'exact' | 'alias' | null = null
    let bestField: ImportField | null = null
    for (const field of FIELD_PRIORITY) {
      if (assigned.has(field)) continue
      const match = matchHeaderToField(header, field)
      if (match !== 'none') {
        if (bestMatch === null || (match === 'exact' && bestMatch !== 'exact')) {
          bestMatch = match
          bestField = field
        }
      }
    }
    return bestField ? { field: bestField, match: bestMatch! } : null
  }

  parse(buffer: ArrayBuffer, importType: ImportType, override?: ColumnOverride | null): ParseResult {
    const errors: ParseError[] = []
    const workbook: XLSX.WorkBook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName!]

    if (!sheet) {
      return {
        rows: [],
        errors: [{ rowIndex: 0, field: 'sheet', message: 'Worksheet not found' }],
        totalRows: 0,
        headers: [],
      }
    }
    const ref = sheet['!ref']
    if (!ref) {
      return {
        rows: [],
        errors: [{ rowIndex: 0, field: 'sheet', message: 'Empty spreadsheet' }],
        totalRows: 0,
        headers: [],
      }
    }

    const range = XLSX.utils.decode_range(ref)
    const headerRow = range.s.r

    // Collect raw headers in column order.
    const rawColumnHeaders: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c })
      const cell = sheet[addr]
      if (cell?.v !== undefined && cell.v !== null) {
        rawColumnHeaders.push(String(cell.v).trim())
      }
    }
    const headers = this.mapHeaders(rawColumnHeaders, override)

    // Build colIndex -> field map for row parsing.
    const colToField = new Map<number, ImportField>()
    headers.forEach((h, idx) => {
      if (h.field) colToField.set(idx, h.field)
    })

    const hasProductName = headers.some(h => h.field === 'productName')
    if (!hasProductName) {
      errors.push({ rowIndex: 0, field: 'productName', message: 'Missing required column: Product Name (or equivalent)' })
    }

    const rawRows = extractRows(sheet, headerRow, rawColumnHeaders)
    const totalRows = rawRows.length
    const parsedRows: ParsedRow[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i]
      if (!raw) continue
      const rowIndex = i + 2

      const row: ParsedRow = {
        rowIndex,
        productName: '',
        quantity: null,
        unit: null,
        supplierSku: null,
        unitCost: null,
        bottleSizeMl: null,
        fullBottles: null,
        tots: null,
        notes: null,
        categoryName: null,
        inventoryType: null,
        sku: null,
        barcode: null,
        parLevel: null,
        reorderPoint: null,
        preferredSupplier: null,
      }

      for (const [idx, field] of colToField.entries()) {
        const rawValue = raw[String(idx)]
        if (rawValue === undefined) continue
        const strVal = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : ''

        switch (field) {
          case 'productName':
            row.productName = strVal
            break
          case 'quantity':
            row.quantity = parseNumeric(rawValue)
            break
          case 'unit':
            row.unit = strVal || null
            break
          case 'supplierSku':
            row.supplierSku = strVal || null
            break
          case 'unitCost':
            row.unitCost = parseNumeric(rawValue)
            break
          case 'bottleSizeMl':
            row.bottleSizeMl = parseNumeric(rawValue)
            break
          case 'fullBottles':
            row.fullBottles = parseNumeric(rawValue)
            break
          case 'tots':
            row.tots = parseNumeric(rawValue)
            break
          case 'notes':
            row.notes = strVal || null
            break
          case 'categoryName':
            row.categoryName = strVal || null
            break
          case 'inventoryType':
            row.inventoryType = strVal || null
            break
          case 'sku':
            row.sku = strVal || null
            break
          case 'barcode':
            row.barcode = strVal || null
            break
          case 'parLevel':
            row.parLevel = parseNumeric(rawValue)
            break
          case 'reorderPoint':
            row.reorderPoint = parseNumeric(rawValue)
            break
          case 'preferredSupplier':
            row.preferredSupplier = strVal || null
            break
        }
      }

      if (!row.productName) {
        errors.push({ rowIndex, field: 'productName', message: 'Product name is required' })
      }

      if (row.quantity !== null && row.quantity <= 0) {
        errors.push({ rowIndex, field: 'quantity', message: 'Quantity must be a positive number' })
      }

      if (importType === 'supplier_delivery') {
        if (row.unitCost !== null && row.unitCost <= 0) {
          errors.push({ rowIndex, field: 'unitCost', message: 'Unit cost must be a positive number' })
        }
      }

      parsedRows.push(row)
    }

    return { rows: parsedRows, errors, totalRows, headers }
  }
}

function extractRows(sheet: XLSX.WorkSheet, headerRow: number, rawHeaders: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const ref = sheet['!ref']
  if (!ref) return rows
  const range = XLSX.utils.decode_range(ref)
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const row: Record<string, unknown> = {}
    let isEmpty = true
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[addr]
      const header = c < rawHeaders.length ? rawHeaders[c] : undefined
      if (cell !== undefined && cell !== null && header !== undefined) {
        row[String(c)] = cell.v
        if (cell.v !== '' && cell.v !== null && cell.v !== undefined) {
          isEmpty = false
        }
      }
    }
    if (!isEmpty) rows.push(row)
  }
  return rows
}