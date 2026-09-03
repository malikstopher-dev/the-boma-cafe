import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  ADD_STOCK_REALTIME_EVENTS,
  calculateAddStockPreview,
  isLegacyAddStockRollback,
  linkedUoms,
  loadAddStockProduct,
  loadAddStockReferences,
  parseOptionalCost,
  submitAddStock,
  uomLabel,
  validateAddStockRequest,
} from '@/inventory-v2/lib/add-stock'
import type { InventoryProduct } from '../engine/types'

const product = {
  id: 'product-1',
  name: 'Sparkling Water',
  sku: 'BEV-001',
  is_active: true,
  deleted_at: null,
  inventory_product_uoms: [
    {
      id: 'link-case',
      product_id: 'product-1',
      uom_id: 'uom-case',
      is_base: false,
      is_display: true,
      conversion_factor: 12,
      created_at: '2026-09-02T00:00:00.000Z',
      inventory_uoms: { name: 'Case', symbol: 'cs' },
    },
    {
      id: 'link-each',
      product_id: 'product-1',
      uom_id: 'uom-each',
      is_base: true,
      is_display: false,
      conversion_factor: 1,
      created_at: '2026-09-02T00:00:00.000Z',
      inventory_uoms: { name: 'Each', symbol: 'ea' },
    },
  ],
} as InventoryProduct

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('INV-4B Add Stock workflow helpers', () => {
  it('calculates source-UOM, base-unit, projected-balance, and cost values', () => {
    const preview = calculateAddStockPreview(24, 3, 12, 240)
    expect(preview).toEqual({
      sourceQuantity: 3,
      sourceUnitCost: 240,
      conversionFactor: 12,
      baseQuantity: 36,
      baseUnitCost: 20,
      currentBaseBalance: 24,
      projectedBaseBalance: 60,
      currentSourceBalance: 2,
      projectedSourceBalance: 5,
      receiptValue: 720,
    })
  })

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])('rejects invalid quantity %s', quantity => {
    expect(() => calculateAddStockPreview(10, quantity, 1, null)).toThrow('quantity greater than zero')
  })

  it('rejects an invalid UOM conversion and cost', () => {
    expect(() => calculateAddStockPreview(10, 1, 0, null)).toThrow('invalid conversion')
    expect(() => calculateAddStockPreview(10, 1, 1, -1)).toThrow('non-negative unit cost')
  })

  it('requires the item, location, UOM, and positive finite quantity', () => {
    expect(validateAddStockRequest({ quantity: Number.NaN, unitCost: null })).toEqual({
      productId: 'Select an existing item',
      locationId: 'Select a receiving location',
      uomId: 'Select a valid item UOM',
      quantity: 'Enter a quantity greater than zero',
    })
  })

  it('sorts the base UOM first and presents a business label', () => {
    const links = linkedUoms(product)
    expect(links.map(link => link.uom_id)).toEqual(['uom-each', 'uom-case'])
    expect(uomLabel(links[1])).toBe('Case (cs)')
  })

  it('parses an optional non-negative cost without inventing a value', () => {
    expect(parseOptionalCost('')).toBeNull()
    expect(parseOptionalCost('125.50')).toBe(125.5)
    expect(parseOptionalCost('-1')).toBeNaN()
    expect(parseOptionalCost('not-a-number')).toBeNaN()
  })

  it('loads only active item and location references without balance fan-out', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.startsWith('/api/inventory/products?')) {
        expect(url).toContain('include_balance=false')
        return response({ data: [product, { ...product, id: 'archived', is_active: false }], meta: { hasMore: false } })
      }
      return response({
        data: [
          { id: 'loc-1', name: 'Main Bar', code: 'MAIN', is_active: true, deleted_at: null },
          { id: 'loc-2', name: 'Old Bar', code: 'OLD', is_active: false, deleted_at: '2026-01-01' },
        ],
      })
    })

    const result = await loadAddStockReferences(fetcher)
    expect(result.products.map(item => item.id)).toEqual(['product-1'])
    expect(result.locations.map(item => item.id)).toEqual(['loc-1'])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('loads the authoritative item balance for the selected location', async () => {
    const fetcher = vi.fn(async () => response({ data: { ...product, current_balance: 42 } }))
    const result = await loadAddStockProduct('product-1', 'loc-1', fetcher)
    expect(result.current_balance).toBe(42)
    expect(fetcher).toHaveBeenCalledWith('/api/inventory/products/product-1?location_id=loc-1')
  })

  it.each([
    { data: product },
    { data: { ...product, current_balance: null } },
    { data: { ...product, current_balance: 'not-a-number' } },
  ])('rejects a product response without an authoritative balance', async body => {
    const fetcher = vi.fn(async () => response(body))
    await expect(loadAddStockProduct('product-1', 'loc-1', fetcher)).rejects.toThrow('current balance is unavailable')
  })

  it('posts exactly one purchase movement and never creates a product', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body).toEqual({
        product_id: 'product-1',
        location_id: 'loc-1',
        transaction_type: 'purchase',
        reason_type: 'DELIVERY',
        quantity: 3,
        uom_id: 'uom-case',
        unit_cost: 240,
        reason_notes: 'Invoice 42',
        notes: 'Invoice 42',
        reference_type: 'manual',
      })
      return response({ data: { id: 'tx-1', quantity: 36 } }, 201)
    })

    const result = await submitAddStock({
      productId: 'product-1',
      locationId: 'loc-1',
      uomId: 'uom-case',
      quantity: 3,
      unitCost: 240,
      notes: 'Invoice 42',
    }, fetcher)

    expect(result.id).toBe('tx-1')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/inventory/transactions')
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('surfaces an API/network failure without a false success', async () => {
    const fetcher = vi.fn(async () => response({ error: { message: 'Database unavailable' } }, 503))
    await expect(submitAddStock({
      productId: 'product-1',
      locationId: 'loc-1',
      uomId: 'uom-each',
      quantity: 1,
      unitCost: null,
      notes: null,
    }, fetcher)).rejects.toThrow('Database unavailable')
  })

  it('keeps the spreadsheet row workflow behind an explicit rollback query', () => {
    expect(isLegacyAddStockRollback('')).toBe(false)
    expect(isLegacyAddStockRollback('?add-stock=guided')).toBe(false)
    expect(isLegacyAddStockRollback('?week=36&add-stock=legacy')).toBe(true)
  })

  it('uses the established stock-movement invalidation contract', () => {
    expect(ADD_STOCK_REALTIME_EVENTS).toEqual(['stock.moved'])
  })

  it('keeps the modal above fixed site chrome with explicit dark-surface heading contrast', () => {
    const css = readFileSync(
      new URL('../../inventory-v2/components/AddStockWorkspace.module.css', import.meta.url),
      'utf8',
    )
    expect(css).toMatch(/\.overlay\s*{[^}]*z-index:\s*20000/s)
    expect(css).toMatch(/\.title\s*{[^}]*color:\s*#f8fafc/s)
    expect(css).toMatch(/\.sectionTitle\s*{[^}]*color:\s*#f8fafc/s)
    expect(css).toMatch(/\.success h3\s*{[^}]*color:\s*#f8fafc/s)
  })
})
