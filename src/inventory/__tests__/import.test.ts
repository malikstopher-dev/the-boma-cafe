import { describe, it, expect } from 'vitest'
import { ImportValidator } from '../import/ImportValidator'
import { ExcelParser } from '../import/ExcelParser'
import { ColumnMapper } from '../import/ColumnMapper'
import type { ParsedRow } from '../import/ImportTypes'

describe('ImportValidator', () => {
  const validator = new ImportValidator()

  it('should validate valid rows', () => {
    const rows: ParsedRow[] = [
      { rowIndex: 2, productName: 'Whiskey', quantity: 10, unit: 'bottle', supplierSku: 'WHISKY-001', unitCost: 250, bottleSizeMl: 750, fullBottles: null, tots: null, notes: null, categoryName: null },
      { rowIndex: 3, productName: 'Vodka', quantity: 5, unit: 'bottle', supplierSku: null, unitCost: 180, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
    ]
    const result = validator.validate(rows, 'supplier_delivery')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject missing product name', () => {
    const rows: ParsedRow[] = [
      { rowIndex: 2, productName: '', quantity: 10, unit: null, supplierSku: null, unitCost: null, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
    ]
    const result = validator.validate(rows, 'supplier_delivery')
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.field).toBe('productName')
  })

  it('should reject zero quantity', () => {
    const rows: ParsedRow[] = [
      { rowIndex: 2, productName: 'Whiskey', quantity: 0, unit: null, supplierSku: null, unitCost: null, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
    ]
    const result = validator.validate(rows, 'supplier_delivery')
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.field).toBe('quantity')
  })

  it('should warn on missing unit cost for supplier delivery', () => {
    const rows: ParsedRow[] = [
      { rowIndex: 2, productName: 'Whiskey', quantity: 10, unit: null, supplierSku: null, unitCost: null, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
    ]
    const result = validator.validate(rows, 'supplier_delivery')
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('unit cost')
  })

  it('should warn on duplicate product names', () => {
    const rows: ParsedRow[] = [
      { rowIndex: 2, productName: 'Whiskey', quantity: 10, unit: null, supplierSku: null, unitCost: null, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
      { rowIndex: 3, productName: 'whiskey', quantity: 5, unit: null, supplierSku: null, unitCost: null, bottleSizeMl: null, fullBottles: null, tots: null, notes: null, categoryName: null },
    ]
    const result = validator.validate(rows, 'supplier_delivery')
    expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true)
  })

  it('should reject empty row list', () => {
    const result = validator.validate([], 'supplier_delivery')
    expect(result.isValid).toBe(false)
    expect(result.errors[0]?.field).toBe('file')
  })
})

describe('ColumnMapper', () => {
  const mapper = new ColumnMapper()

  it('should detect standard columns', () => {
    const headers = ['Product Name', 'Quantity', 'Unit', 'Unit Cost']
    const map = mapper.detectColumns(headers)
    expect(map.productName).toBeDefined()
    expect(map.quantity).toBeDefined()
    expect(map.unit).toBeDefined()
    expect(map.unitCost).toBeDefined()
  })

  it('should detect columns with different casing', () => {
    const headers = ['product', 'QTY', 'uom']
    const map = mapper.detectColumns(headers)
    expect(map.productName).toBeDefined()
    expect(map.quantity).toBeDefined()
    expect(map.unit).toBeDefined()
  })

  it('should return empty map for unknown headers', () => {
    const headers = ['Foo', 'Bar', 'Baz']
    const map = mapper.detectColumns(headers)
    expect(Object.keys(map)).toHaveLength(0)
  })
})
