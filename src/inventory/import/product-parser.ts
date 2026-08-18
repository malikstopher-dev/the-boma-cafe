// E1A: Smart Product Import — pure parser (best-effort).
//
// "Import first. Enrich later." Every row imports whatever is actually
// present: a bare product name is enough. Missing fields are highlighted in
// the preview (needsDetails) but never block the import. No data is ever
// fabricated — a value that cannot be confidently read stays null and the
// operator fills it in afterwards via the normal product editors.
//
// Supported layouts (auto-detected per sheet):
//   a) Tabular   — a header row with known column keywords (product/supplier/
//                  code/price/unit/…); columns mapped by keyword.
//   b) Category  — a bare uppercase heading row (e.g. "WHISKEY") followed by
//                  item rows; the heading becomes every following row's
//                  category (the Bar Template workbook layout).
//   c) Plain     — no header found: every non-empty first cell is a product
//                  name (name-only lists).
//
// Price sources: every recognized price column is a candidate. Columns are
// scanned in a fixed priority (bottle/shot prices first, then unit/generic,
// then old/makro/solly/ultra) and the first column with a real value for the
// row wins — the sheet decides which price is imported, never a global rule.

export type ImportConfidence = 'high' | 'medium' | 'low'

export interface ParsedField<T> {
  value: T | null
  confidence: ImportConfidence
}

export interface ParsedProductRow {
  rowNumber: number
  rawName: string | null
  name: ParsedField<string>
  sku: ParsedField<string>
  barcode: ParsedField<string>
  unitCost: ParsedField<number>
  unitText: ParsedField<string>
  supplierName: ParsedField<string>
  categoryName: ParsedField<string>
  needsDetails: boolean
}

const NAME_KEYWORDS = ['stock item', 'product', 'item name', 'product name', 'description']
const SUPPLIER_KEYWORDS = ['supplier']
const SKU_KEYWORDS = ['sku', 'code', 'item code', 'product code']
const PRICE_KEYWORDS = ['price per unit', 'unit price', 'makro price', 'price', 'cost price', 'unit cost']
const UNIT_KEYWORDS = ['unit of measure bar', 'unit of measure', 'units of measure', 'stock take unit', 'stock taking unit', 'count unit', 'unit']
const BARCODE_KEYWORDS = ['barcode', 'bar code', 'ean']

// Best-effort price sources, most meaningful first. For every row we scan
// these in order and take the first column that actually has a value — the
// sheet decides which price we import, never a hard-coded single column.
// "Per case" columns are excluded: they are case pricing, not unit costs.
const PRICE_COLUMN_PRIORITY: RegExp[] = [
  /^(bottle price|price per bottle)$/i,
  /^(shot price|price per shot)$/i,
  /^price per unit/i,
  /^(price|unit price|cost price|unit cost)$/i,
  /^old bottle price/i,
  /^old shot price/i,
  /^short price/i,
  /^makro price/i,
  /^solly/i,
  /^ultra/i,
]

const HEADER_MATCH_THRESHOLD = 2

interface SheetGrid {
  rows: (string | null)[][]
  sheetName: string
}

function cellText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : String(v)
  }
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

function looksLikeHeading(cells: (string | null)[], minLength: number): boolean {
  const nonEmpty = cells.filter(Boolean)
  if (nonEmpty.length !== 1) return false
  const text = nonEmpty[0] as string
  if (text.length < minLength || text.length > 60) return false
  // A heading is a single cell with no numeric content and no quantity-ish
  // suffix (kg/l/ml/g/portions/box/…).
  if (/\d/.test(text)) return false
  if (/^(kg|g|ml|l|litre|liters?|tots?|portions?|boxes?|packs?|tubs?|pieces?|units?)$/i.test(text)) return false
  const upper = text.toUpperCase()
  const upperCount = (text.match(/[A-Z]/g) || []).length
  // Mostly-uppercase (or all-caps) reads as a section heading. In tabular
  // mode a minimum length of 5 keeps short single-cell products (e.g. "JAM")
  // from being misread as headings; plain lists (no header at all) treat
  // even short single-cell lines as headings because that layout is how the
  // category-heading workbooks (WHISKEY / BRANDY/COGNAC) are structured.
  return upper === text || (text.length <= 40 && upperCount / Math.max(text.length, 1) >= 0.6)
}

export function parseNumber(text: string | null): number | null {
  if (!text) return null
  let s = text.trim().replace(/\s+/g, '')
  if (!s) return null
  if (/^[Rr]\s*\d/.test(s)) s = s.replace(/^[Rr]\s*/, '')
  s = s.replace(/[Rr\s€$]/g, '')
  // 1.234,56 (European) vs 1,234.56 (English) — comma is a decimal separator
  // when it is the LAST separator; otherwise thousands.
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma > -1) {
    const commaGroups = s.split(',').length
    if (commaGroups === 2 && /^\d+$/.test(s.split(',')[1] || '') && (s.split(',')[1] || '').length <= 2) {
      s = s.replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function confidenceForText(text: string | null): ImportConfidence {
  if (!text) return 'low'
  if (/^[\w./\- ]+$/.test(text) && text.length >= 2) return 'high'
  return 'medium'
}

function confidenceForNumber(text: string | null): ImportConfidence {
  if (!text) return 'low'
  return /^-?\d+(\.\d+)?$/.test(text.replace(/[Rr\s,€$]/g, '')) ? 'high' : 'medium'
}

function findHeaderRow(grid: (string | null)[][]): { headerIndex: number; columnMap: Record<string, number> } | null {
  const scanLimit = Math.min(grid.length, 15)
  for (let i = 0; i < scanLimit; i++) {
    const row = grid[i]
    if (!row) continue
    const lower = row.map(c => (c ?? '').toLowerCase())
    const matches: Record<string, number> = {}
    let matched = 0
    if (lower.some(c => NAME_KEYWORDS.some(k => c.includes(k)))) {
      matched++
      matches.name = lower.findIndex(c => NAME_KEYWORDS.some(k => c.includes(k)))
    }
    for (const [key, keywords] of [
      ['supplier', SUPPLIER_KEYWORDS],
      ['sku', SKU_KEYWORDS],
      ['price', PRICE_KEYWORDS],
      ['unit', UNIT_KEYWORDS],
      ['barcode', BARCODE_KEYWORDS],
    ] as const) {
      const idx = lower.findIndex(c => keywords.some(k => c.includes(k)))
      if (idx > -1) {
        matched++
        matches[key] = idx
      }
    }
    if (matched >= HEADER_MATCH_THRESHOLD) {
      return { headerIndex: i, columnMap: matches }
    }
  }
  return null
}

function buildRows(grid: (string | null)[][], headerInfo: { headerIndex: number; columnMap: Record<string, number> } | null): ParsedProductRow[] {
  const rows: ParsedProductRow[] = []
  let currentCategory: string | null = null

  const startAt = headerInfo ? headerInfo.headerIndex + 1 : 0
  const columnMap = headerInfo?.columnMap ?? {}
  const nameCol = columnMap.name ?? 0
  const headingMinLength = headerInfo ? 5 : 2

  for (let i = startAt; i < grid.length; i++) {
    const row = grid[i]
    if (!row) continue
    const nonEmpty = row.filter(c => c !== null && c !== '')
    if (nonEmpty.length === 0) continue

    // Category heading (uppercase single-cell) — applies to the rows below.
    if (looksLikeHeading(row, headingMinLength)) {
      currentCategory = (row.find(Boolean) as string).trim()
      continue
    }

    const nameText = row[nameCol] ?? null
    if (!nameText) continue

    const nameConfidence: ImportConfidence = confidenceForText(nameText)
    const category = currentCategory
      ? { value: currentCategory, confidence: 'high' as ImportConfidence }
      : { value: null, confidence: 'low' as ImportConfidence }

    // Price: best-effort — scan the priority price columns left-to-right by
    // priority and take the first column that has a parseable value for this
    // row. Multiple price columns in the sheet never block the import.
    let priceValue: number | null = null
    let priceConfidence: ImportConfidence = 'low'
    if (headerInfo) {
      const headerRow = grid[headerInfo.headerIndex]
      if (headerRow) {
        const headerLower = headerRow.map(c => (c ?? '').toLowerCase())
        for (const pattern of PRICE_COLUMN_PRIORITY) {
          const cols = headerLower
            .map((h, idx) => ({ h, idx }))
            .filter(c => pattern.test(c.h) && !c.h.includes('per case'))
            .map(c => c.idx)
            .sort((a, b) => a - b)
          for (const col of cols) {
            const priceText = row[col]
            if (!priceText) continue
            const parsed = parseNumber(priceText)
            if (parsed !== null) {
              priceValue = parsed
              priceConfidence = confidenceForNumber(priceText)
              break
            }
          }
          if (priceValue !== null) break
        }
      }
    }

    const skuCol = columnMap.sku ?? -1
    const skuText = skuCol > -1 ? (row[skuCol] ?? null) : null
    const skuConfidence: ImportConfidence = skuText ? (skuText.length <= 40 ? 'high' : 'medium') : 'low'

    const barcodeCol = columnMap.barcode ?? -1
    const barcodeText = barcodeCol > -1 ? (row[barcodeCol] ?? null) : null

    const supplierCol = columnMap.supplier ?? -1
    const supplierText = supplierCol > -1 ? (row[supplierCol] ?? null) : null
    const supplierConfidence: ImportConfidence = confidenceForText(supplierText)

    const unitCol = columnMap.unit ?? -1
    const unitText = unitCol > -1 ? (row[unitCol] ?? null) : null
    const unitConfidence: ImportConfidence = unitText ? (unitText.length <= 30 ? 'high' : 'medium') : 'low'

    const emptyFields = [
      nameConfidence === 'low',
      skuConfidence === 'low',
      priceConfidence === 'low',
      supplierConfidence === 'low',
      unitConfidence === 'low',
    ].filter(Boolean).length
    const needsDetails = nameConfidence === 'low' || emptyFields >= 4

    rows.push({
      rowNumber: i + 1,
      rawName: nameText,
      name: { value: nameText, confidence: nameConfidence },
      sku: { value: skuText, confidence: skuConfidence },
      barcode: { value: barcodeText, confidence: barcodeText ? 'high' : 'low' },
      unitCost: { value: priceValue, confidence: priceConfidence },
      unitText: { value: unitText, confidence: unitConfidence },
      supplierName: { value: supplierText, confidence: supplierConfidence },
      categoryName: category,
      needsDetails,
    })
  }

  return rows
}

export async function listProductImportSheets(buffer: ArrayBuffer): Promise<{ name: string; sheetIndex: number; rowCount: number }[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames.map((name, idx) => {
    const ws = wb.Sheets[name]
    if (!ws) return { name, sheetIndex: idx, rowCount: 0 }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
    return { name, sheetIndex: idx, rowCount: rows.length }
  })
}

// Parse a workbook/CSV buffer into candidate products. sheetIndex defaults to
// the first sheet; the caller can re-parse with another index.
export async function parseProductImportWorkbook(
  buffer: ArrayBuffer,
  sheetIndex = 0,
): Promise<{ rows: ParsedProductRow[]; sheetName: string }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const name = wb.SheetNames[sheetIndex] ?? wb.SheetNames[0] ?? 'Sheet1'
  const ws = wb.Sheets[name]
  if (!ws) return { rows: [], sheetName: name }
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
  const grid: (string | null)[][] = raw.map(r => (Array.isArray(r) ? r.map(cellText) : []))
  const headerInfo = findHeaderRow(grid)
  const rows = buildRows(grid, headerInfo)
  return { rows, sheetName: name }
}
