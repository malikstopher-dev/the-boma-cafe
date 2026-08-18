import { describe, it, expect } from 'vitest'
import {
  parseNumber,
  parseProductImportWorkbook,
  listProductImportSheets,
} from '../import/product-parser'

function makeWorkbook(sheets: Record<string, (string | number | null)[][]>): ArrayBuffer {
  const XLSX = require('xlsx') as typeof import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const [name, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as ArrayBuffer
}

describe('parseNumber', () => {
  it('parses plain decimals', () => {
    expect(parseNumber('45.50')).toBe(45.5)
    expect(parseNumber('75')).toBe(75)
    expect(parseNumber('0')).toBe(0)
  })

  it('parses R-prefixed prices', () => {
    expect(parseNumber('R 450.00')).toBe(450)
    expect(parseNumber('R2.50')).toBe(2.5)
    expect(parseNumber('R 1 234.56')).toBe(1234.56)
  })

  it('parses European decimals and thousands', () => {
    expect(parseNumber('1,50')).toBe(1.5)
    expect(parseNumber('1.234,56')).toBe(1234.56)
    expect(parseNumber('1,234.56')).toBe(1234.56)
  })

  it('returns null for junk', () => {
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('')).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('--')).toBeNull()
  })
})

describe('tabular layout (Bar Template style)', () => {
  it('maps header keywords to columns and extracts rows', async () => {
    const buf = makeWorkbook({
      'Template ': [
        ['STOCK ITEM', 'UNITS OF MEASURE BAR', 'MAKRO PRICE', 'SOLLY KRAMERS PRICE', 'ULTRA LIQUOR PRICE'],
        ['WHISKEY'],
        ['Jack Daniels', 'TOTS', 450.0, 470.0, 460.0],
        ['Jameson', 'TOTS', 380.0, 390.0, 385.0],
        ['BRANDY/COGNAC'],
        ['Van Ryn 10yr', 'TOTS', 520.0, 0, 0],
      ],
    })

    const { rows, sheetName } = await parseProductImportWorkbook(buf, 0)
    expect(sheetName).toBe('Template ')
    expect(rows.length).toBe(3)

    expect(rows[0]!.name.value).toBe('Jack Daniels')
    expect(rows[0]!.unitText.value).toBe('TOTS')
    expect(rows[0]!.unitCost.value).toBe(450)
    expect(rows[0]!.categoryName.value).toBe('WHISKEY')
    expect(rows[0]!.categoryName.confidence).toBe('high')

    expect(rows[1]!.name.value).toBe('Jameson')
    expect(rows[1]!.categoryName.value).toBe('WHISKEY')

    expect(rows[2]!.name.value).toBe('Van Ryn 10yr')
    expect(rows[2]!.categoryName.value).toBe('BRANDY/COGNAC')
  })

  it('does not treat short single-cell products as headings in tabular mode', async () => {
    const buf = makeWorkbook({
      S1: [
        ['STOCK ITEM', 'PRICE'],
        ['JAM', 25],
        ['TEA', 12],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows.length).toBe(2)
    expect(rows[0]!.name.value).toBe('JAM')
    expect(rows[1]!.name.value).toBe('TEA')
    expect(rows[0]!.categoryName.value).toBeNull()
  })

  it('prefers BOTTLE PRICE over OLD BOTTLE PRICE when both are filled', async () => {
    const buf = makeWorkbook({
      S1: [
        ['STOCK ITEM', 'MAKRO PRICE', 'OLD BOTTLE PRICE', 'BOTTLE PRICE', '20% ADDED'],
        ['Jack Daniels', 100, 250, 300, 60],
        ['Jameson', null, 200, null, 40],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows[0]!.unitCost.value).toBe(300)
    expect(rows[1]!.unitCost.value).toBe(200)
  })

  it('never uses per-case price columns as unit costs', async () => {
    const buf = makeWorkbook({
      S1: [
        ['STOCK ITEM', 'ULTRA LIQUOR PRICE PER CASE', 'PRICE PER UNIT & PER SHOT'],
        ['Heineken', 480, 45],
        ['Savanna', 480, null],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows[0]!.unitCost.value).toBe(45)
    expect(rows[1]!.unitCost.value).toBeNull()
  })

  it('imports a bare name row with every other field null (best-effort)', async () => {
    const buf = makeWorkbook({
      S1: [
        ['STOCK ITEM', 'SUPPLIER', 'CODE', 'PRICE'],
        ['Heineken', null, null, null],
        ['Savanna', 'Distell', 'SV1', null],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows[0]!.name.value).toBe('Heineken')
    expect(rows[0]!.supplierName.value).toBeNull()
    expect(rows[0]!.sku.value).toBeNull()
    expect(rows[0]!.unitCost.value).toBeNull()
    expect(rows[0]!.needsDetails).toBe(true)
    expect(rows[1]!.supplierName.value).toBe('Distell')
    expect(rows[1]!.sku.value).toBe('SV1')
    expect(rows[1]!.unitCost.value).toBeNull()
  })
})

describe('plain list layout (no header)', () => {
  it('treats short all-caps lines as category headings', async () => {
    const buf = makeWorkbook({
      S1: [
        ['SOFT DRINKS'],
        ['Coca Cola'],
        ['Fanta'],
        ['WATER'],
        ['Bonaqua'],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows.length).toBe(3)
    expect(rows[0]!.name.value).toBe('Coca Cola')
    expect(rows[0]!.categoryName.value).toBe('SOFT DRINKS')
    expect(rows[2]!.name.value).toBe('Bonaqua')
    expect(rows[2]!.categoryName.value).toBe('WATER')
  })
})

describe('kitchen weekly sheet layout', () => {
  it('finds a header row below title rows and maps supplier/code/price columns', async () => {
    const buf = makeWorkbook({
      'WEEK 31': [
        ['THE BOMA CAFE - KITCHEN STOCK'],
        ['Week 31'],
        [],
        ['', 'Supplier Name', 'Opening', 'Closing', 'Code', 'Price', 'Order', '', 'Recieved stock', 'kg waste stock'],
        ['Chicken', 'United Butchery', 10, 5, 'CH1', 75, 5, '', 5, 0.5],
        ['Beef Fillet', 'Elands Butchery', 20, 8, 'BF2', 320, 12, '', 12, 1.2],
      ],
    })
    const { rows } = await parseProductImportWorkbook(buf, 0)
    expect(rows.length).toBe(2)
    expect(rows[0]!.name.value).toBe('Chicken')
    expect(rows[0]!.supplierName.value).toBe('United Butchery')
    expect(rows[0]!.sku.value).toBe('CH1')
    expect(rows[0]!.unitCost.value).toBe(75)
    expect(rows[1]!.name.value).toBe('Beef Fillet')
    expect(rows[1]!.supplierName.value).toBe('Elands Butchery')
    expect(rows[1]!.sku.value).toBe('BF2')
    expect(rows[1]!.unitCost.value).toBe(320)
  })
})

describe('listProductImportSheets', () => {
  it('returns every sheet with index and row count', async () => {
    const buf = makeWorkbook({
      'Template ': [[1, 2], [3, 4]],
      'Price ': [['a']],
    })
    const sheets = await listProductImportSheets(buf)
    expect(sheets).toEqual([
      { name: 'Template ', sheetIndex: 0, rowCount: 2 },
      { name: 'Price ', sheetIndex: 1, rowCount: 1 },
    ])
  })
})