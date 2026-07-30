import * as XLSX from 'xlsx'
import type { ParsedRow, ParseError, ParseResult, ImportType } from './ImportTypes'

const HEADER_ALIASES: Record<string, string[]> = {
  productName: ['product', 'product name', 'item', 'item name', 'description', 'name', 'product description', 'menu item'],
  quantity: ['qty', 'quantity', 'count', 'amount', 'units', 'number', 'total qty', 'total quantity'],
  unit: ['unit', 'uom', 'measure', 'unit of measure', 'measurement'],
  supplierSku: ['supplier sku', 'sku', 'supplier code', 'code', 'product code', 'item code', 'vendor code', 'ref'],
  unitCost: ['unit cost', 'cost', 'price', 'unit price', 'cost per unit', 'purchase price', 'unit price (zar)', 'price per unit'],
  bottleSizeMl: ['bottle size', 'bottle size ml', 'size ml', 'size', 'ml', 'volume ml', 'volume'],
  fullBottles: ['full bottles', 'bottles', 'bottle count', 'whole bottles'],
  tots: ['tots', 'shots', 'pours', 'tot count', 'shot count'],
  notes: ['notes', 'comment', 'comments', 'remarks', 'note', 'additional notes'],
  categoryName: ['category', 'product category', 'type', 'group', 'department', 'section'],
}

function normalizeHeader(header: string): string | null {
  const cleaned = header.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(cleaned) || aliases.some(a => cleaned.includes(a))) {
      return field
    }
  }
  return null
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  const str = String(value).trim().replace(/[Rr\s,]/g, '')
  const num = Number(str)
  return Number.isFinite(num) ? num : null
}

function extractRows(sheet: XLSX.WorkSheet, headerRow: number): Record<string, unknown>[] {
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
      const headerAddr = XLSX.utils.encode_cell({ r: headerRow, c })
      const headerVal = sheet[headerAddr]?.v
      if (cell !== undefined && cell !== null && headerVal !== undefined) {
        row[String(headerVal)] = cell.v
        if (cell.v !== '' && cell.v !== null && cell.v !== undefined) {
          isEmpty = false
        }
      }
    }
    if (!isEmpty) rows.push(row)
  }
  return rows
}

export class ExcelParser {
  parse(buffer: ArrayBuffer, importType: ImportType): ParseResult {
    const errors: ParseError[] = []
    const workbook: XLSX.WorkBook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName!]

    if (!sheet) {
      return { rows: [], errors: [{ rowIndex: 0, field: 'sheet', message: 'Worksheet not found' }], totalRows: 0 }
    }
    const ref = sheet['!ref']
    if (!ref) {
      return { rows: [], errors: [{ rowIndex: 0, field: 'sheet', message: 'Empty spreadsheet' }], totalRows: 0 }
    }

    const range = XLSX.utils.decode_range(ref)
    const headerRow = range.s.r
    const headers: Map<number, string> = new Map()

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c })
      const cell = sheet[addr]
      if (cell?.v !== undefined && cell.v !== null) {
        const header = String(cell.v).trim()
        const normalized = normalizeHeader(header)
        if (normalized) {
          headers.set(c, normalized)
        }
      }
    }

    const hasProductName = Array.from(headers.values()).includes('productName')
    if (!hasProductName) {
      errors.push({ rowIndex: 0, field: 'productName', message: 'Missing required column: Product Name (or equivalent)' })
    }

    const rawRows = extractRows(sheet, headerRow)
    const totalRows = rawRows.length
    const parsedRows: ParsedRow[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i]
      if (!raw) continue
      const rowIndex = i + 2

      let productName = ''
      let quantity: number | null = null
      let unit: string | null = null
      let supplierSku: string | null = null
      let unitCost: number | null = null
      let bottleSizeMl: number | null = null
      let fullBottles: number | null = null
      let tots: number | null = null
      let notes: string | null = null
      let categoryName: string | null = null

      for (const [colIndex, field] of headers.entries()) {
        const key = XLSX.utils.encode_cell({ r: headerRow, c: colIndex })
        const rawHeader = sheet[key]?.v
        if (rawHeader === undefined) continue
        const rawValue = raw[String(rawHeader)]
        const strVal = rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : ''

        switch (field) {
          case 'productName':
            productName = strVal
            break
          case 'quantity':
            quantity = parseNumeric(rawValue)
            break
          case 'unit':
            unit = strVal || null
            break
          case 'supplierSku':
            supplierSku = strVal || null
            break
          case 'unitCost':
            unitCost = parseNumeric(rawValue)
            break
          case 'bottleSizeMl':
            bottleSizeMl = parseNumeric(rawValue)
            break
          case 'fullBottles':
            fullBottles = parseNumeric(rawValue)
            break
          case 'tots':
            tots = parseNumeric(rawValue)
            break
          case 'notes':
            notes = strVal || null
            break
          case 'categoryName':
            categoryName = strVal || null
            break
        }
      }

      if (!productName) {
        errors.push({ rowIndex, field: 'productName', message: 'Product name is required' })
      }

      if (quantity !== null && quantity <= 0) {
        errors.push({ rowIndex, field: 'quantity', message: 'Quantity must be a positive number' })
      }

      if (importType === 'supplier_delivery') {
        if (unitCost !== null && unitCost <= 0) {
          errors.push({ rowIndex, field: 'unitCost', message: 'Unit cost must be a positive number' })
        }
      }

      parsedRows.push({
        rowIndex,
        productName,
        quantity,
        unit,
        supplierSku,
        unitCost,
        bottleSizeMl,
        fullBottles,
        tots,
        notes,
        categoryName,
      })
    }

    return { rows: parsedRows, errors, totalRows }
  }
}
