import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { exportRowsToXlsx } from '../lib/export-xlsx'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

type Cell = string | number

function readSheet(file: string, defval: string = ''): Cell[][] {
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0] ?? '']
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval }) as Cell[][]
}

describe('exportRowsToXlsx', () => {
  it('writes a readable workbook with headers and values', async () => {
    const file = path.join(tmpDir, 'out.xlsx')
    const count = await exportRowsToXlsx({
      filename: file,
      sheetName: 'Daily Report',
      columns: [
        { header: 'Product', value: r => r.productName, width: 28 },
        { header: 'Opening', value: r => r.openingBalance },
        { header: 'Sales', value: r => r.sales },
      ],
      rows: [
        { productName: 'Chicken', openingBalance: 10, sales: 3 },
        { productName: 'Vodka 1L', openingBalance: 5, sales: 1.5 },
      ],
    })
    expect(count).toBe(2)

    const aoa = readSheet(file)
    expect(aoa[0]).toEqual(['Product', 'Opening', 'Sales'])
    expect(aoa[1]?.[0]).toBe('Chicken')
    expect(aoa[1]?.[1]).toBe(10)
    expect(aoa[1]?.[2]).toBe(3)
    expect(aoa[2]?.[0]).toBe('Vodka 1L')
    expect(aoa[2]?.[1]).toBe(5)
    expect(aoa[2]?.[2]).toBe(1.5)
  })

  it('preserves numbers as numbers and strings as strings', async () => {
    const file = path.join(tmpDir, 'types.xlsx')
    await exportRowsToXlsx({
      filename: file,
      sheetName: 'Types',
      columns: [
        { header: 'Name', value: r => r.name },
        { header: 'Qty', value: r => r.qty },
        { header: 'Cost', value: r => r.cost },
      ],
      rows: [{ name: 'TEST', qty: 50, cost: 149.5 }],
    })
    const aoa = readSheet(file)
    expect(typeof aoa[1]?.[0]).toBe('string')
    expect(typeof aoa[1]?.[1]).toBe('number')
    expect(aoa[1]?.[2]).toBe(149.5)
  })

  it('renders null values as empty cells', async () => {
    const file = path.join(tmpDir, 'nulls.xlsx')
    await exportRowsToXlsx({
      filename: file,
      sheetName: 'Nulls',
      columns: [
        { header: 'Product', value: r => r.name },
        { header: 'Unit Cost', value: r => r.cost },
        { header: 'Notes', value: r => r.notes },
      ],
      rows: [{ name: 'Beer', cost: null, notes: 'none' }],
    })
    const aoa = readSheet(file, 'EMPTY')
    expect(aoa[1]?.[0]).toBe('Beer')
    expect(aoa[1]?.[1]).toBe('')
    expect(aoa[1]?.[2]).toBe('none')
  })

  it('handles a large dataset without corruption', async () => {
    const file = path.join(tmpDir, 'large.xlsx')
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      productName: `Product ${i}`,
      openingBalance: i,
      sales: i % 7,
      notes: `note with, comma and "quote" ${i}`,
    }))
    const count = await exportRowsToXlsx({
      filename: file,
      sheetName: 'Large Export',
      columns: [
        { header: 'Product', value: r => r.productName },
        { header: 'Opening', value: r => r.openingBalance },
        { header: 'Sales', value: r => r.sales },
        { header: 'Notes', value: r => r.notes },
      ],
      rows,
    })
    expect(count).toBe(10000)

    const aoa = readSheet(file)
    expect(aoa.length).toBe(10001)
    expect(aoa[1]?.[0]).toBe('Product 0')
    expect(aoa[10000]?.[0]).toBe('Product 9999')
    expect(aoa[10000]?.[3]).toBe('note with, comma and "quote" 9999')
  })

  it('writes an empty sheet with only headers when no rows', async () => {
    const file = path.join(tmpDir, 'empty.xlsx')
    const count = await exportRowsToXlsx({
      filename: file,
      sheetName: 'Empty',
      columns: [{ header: 'Product', value: r => r.name }],
      rows: [] as Array<{ name: string }>,
    })
    expect(count).toBe(0)
    const aoa = readSheet(file)
    expect(aoa).toEqual([['Product']])
  })

  it('truncates sheet names to 31 characters', async () => {
    const file = path.join(tmpDir, 'name.xlsx')
    const longName = 'A very long report title that certainly exceeds the excel limit'
    await exportRowsToXlsx({
      filename: file,
      sheetName: longName,
      columns: [{ header: 'X', value: () => 1 }],
      rows: [{ v: 1 }],
    })
    const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' })
    const sheetName = wb.SheetNames[0] ?? ''
    expect(sheetName.length).toBeLessThanOrEqual(31)
    expect(sheetName).toBe(longName.slice(0, 31))
  })

  it('strips Excel-forbidden characters from sheet names', async () => {
    const file = path.join(tmpDir, 'forbidden.xlsx')
    await exportRowsToXlsx({
      filename: file,
      sheetName: 'What did we use? [daily] *top* /2026',
      columns: [{ header: 'X', value: () => 1 }],
      rows: [{ v: 1 }],
    })
    const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' })
    const sheetName = wb.SheetNames[0] ?? ''
    expect(sheetName).not.toMatch(/[\\[\]\\:*?/]/)
    expect(sheetName).toBe('What did we use daily top 2026')
  })
})