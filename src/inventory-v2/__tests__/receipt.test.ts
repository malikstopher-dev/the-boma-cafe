import { describe, it, expect, vi } from 'vitest'
import {
  linePreview,
  lineTotal,
  receiptTotal,
  newReceiptLine,
  validateReceiptDraft,
  postReceipt,
  quickCreateProduct,
  loadReceiptReferences,
} from '../lib/receipt'
import type { InventoryProduct } from '@/inventory/engine/types'

function product(overrides: Partial<InventoryProduct> = {}): InventoryProduct {
  return {
    id: 'p1',
    name: 'Test Item',
    sku: 'TST-001',
    is_active: true,
    deleted_at: null,
    current_balance: 10,
    inventory_product_uoms: [
      {
        id: 'l1',
        product_id: 'p1',
        uom_id: 'uom-base',
        is_base: true,
        is_display: false,
        conversion_factor: 1,
        created_at: '2026-01-01',
        inventory_uoms: { id: 'uom-base', name: 'Bottle', symbol: 'btl' },
      } as never,
      {
        id: 'l2',
        product_id: 'p1',
        uom_id: 'uom-case',
        is_base: false,
        is_display: false,
        conversion_factor: 12,
        created_at: '2026-01-01',
        inventory_uoms: { id: 'uom-case', name: 'Case', symbol: 'case' },
      } as never,
    ],
    ...overrides,
  } as InventoryProduct
}

describe('receipt lib', () => {
  it('newReceiptLine generates unique keys', () => {
    const a = newReceiptLine()
    const b = newReceiptLine()
    expect(a.key).not.toBe(b.key)
    expect(a.productId).toBe('')
  })

  describe('linePreview', () => {
    it('computes base conversion for a case receipt', () => {
      const line = { key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '120' }
      const preview = linePreview(line, product())
      expect(preview).not.toBeNull()
      expect(preview!.baseQuantity).toBe(24)
      expect(preview!.baseUnitCost).toBe(10)
      expect(preview!.receiptValue).toBe(240)
    })

    it('returns null for an unlinked UOM', () => {
      const line = { key: 'k', productId: 'p1', uomId: 'unknown', quantity: '2', unitCost: '10' }
      expect(linePreview(line, product())).toBeNull()
    })

    it('returns null for an invalid quantity', () => {
      const line = { key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '-1', unitCost: '10' }
      expect(linePreview(line, product())).toBeNull()
    })

    it('returns null when the product balance is unavailable', () => {
      const line = { key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '10' }
      const noBalance = product({ current_balance: null })
      expect(linePreview(line, noBalance)).toBeNull()
    })
  })

  describe('lineTotal / receiptTotal', () => {
    it('computes line value from quantity × cost', () => {
      expect(lineTotal({ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '3', unitCost: '25' })).toBe(75)
    })

    it('returns null when cost is omitted', () => {
      expect(lineTotal({ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '3', unitCost: '' })).toBeNull()
    })

    it('sums only priced lines for the receipt total', () => {
      const lines = [
        { key: 'a', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '50' },
        { key: 'b', productId: 'p1', uomId: 'uom-case', quantity: '5', unitCost: '' },
      ]
      expect(receiptTotal(lines)).toBe(100)
    })
  })

  describe('validateReceiptDraft', () => {
    const base = {
      locationId: 'loc-1',
      deliveryReference: '',
      notes: '',
      productsById: { p1: product() },
    }

    it('passes a valid draft', () => {
      const result = validateReceiptDraft({
        ...base,
        lines: [{ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '10' }],
      })
      expect(Object.keys(result.headerErrors)).toHaveLength(0)
      expect(Object.keys(result.lineErrors)).toHaveLength(0)
    })

    it('requires a location', () => {
      const result = validateReceiptDraft({
        ...base,
        locationId: '',
        lines: [{ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '10' }],
      })
      expect(result.headerErrors.locationId).toBeDefined()
    })

    it('rejects a line with an unlinked UOM', () => {
      const result = validateReceiptDraft({
        ...base,
        lines: [{ key: 'k', productId: 'p1', uomId: 'nope', quantity: '2', unitCost: '10' }],
      })
      expect(result.lineErrors.k?.uomId).toBeDefined()
    })

    it('rejects an inactive product', () => {
      const result = validateReceiptDraft({
        ...base,
        productsById: { p1: product({ is_active: false }) },
        lines: [{ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '2', unitCost: '10' }],
      })
      expect(result.lineErrors.k?.productId).toBeDefined()
    })

    it('rejects zero quantity', () => {
      const result = validateReceiptDraft({
        ...base,
        lines: [{ key: 'k', productId: 'p1', uomId: 'uom-case', quantity: '0', unitCost: '10' }],
      })
      expect(result.lineErrors.k?.quantity).toBeDefined()
    })

    it('requires at least one line', () => {
      const result = validateReceiptDraft({ ...base, lines: [] })
      expect(result.headerErrors.lines).toBeDefined()
    })
  })

  describe('postReceipt', () => {
    it('sends the canonical payload and unwraps the receipt', async () => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({
        data: { receipt_id: 'r1', outcome: 'posted', transactions: [{ id: 't1' }], posted_count: 1 },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      const result = await postReceipt({
        locationId: 'loc-1',
        supplierId: null,
        deliveryReference: 'INV-1',
        receiptDate: '2026-09-03',
        notes: 'note',
        idempotencyKey: '44444444-4444-4444-4444-444444444444',
        lines: [{ productId: 'p1', uomId: 'uom-case', quantity: 2, unitCost: 120, lineValue: 240 }],
      }, fetcher as unknown as typeof fetch)
      expect(result.receipt_id).toBe('r1')

      const call = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.location_id).toBe('loc-1')
      expect(body.idempotency_key).toBe('44444444-4444-4444-4444-444444444444')
      expect(body.lines[0].product_id).toBe('p1')
      expect(body.lines[0].quantity).toBe(2)
    })

    it('throws the server message on failure', async () => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({
        error: { message: 'Line 2: quantity must be greater than zero' },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }))
      await expect(postReceipt({
        locationId: 'loc-1',
        supplierId: null,
        deliveryReference: '',
        receiptDate: '',
        notes: '',
        idempotencyKey: '44444444-4444-4444-4444-444444444444',
        lines: [{ productId: 'p1', uomId: 'uom-base', quantity: 1, unitCost: null, lineValue: null }],
      }, fetcher as unknown as typeof fetch)).rejects.toThrow('quantity must be greater than zero')
    })
  })

  describe('quickCreateProduct', () => {
    it('posts the quick-create payload', async () => {
      const fetcher = vi.fn(async () => new Response(JSON.stringify({
        data: { id: 'p2', name: 'New Item' },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      const result = await quickCreateProduct({
        name: 'New Item',
        sku: '',
        barcode: '',
        categoryId: '',
        inventoryType: 'BEVERAGE',
        supplierId: '',
        unitCost: '45',
        baseUomId: 'uom-base',
      }, fetcher as unknown as typeof fetch)
      expect(result.id).toBe('p2')

      const call = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.base_uom_id).toBe('uom-base')
      expect(body.unit_cost).toBe(45)
    })
  })

  describe('loadReceiptReferences', () => {
    it('flattens category trees and filters inactive entities', async () => {
      const json = (data: unknown) => new Response(JSON.stringify({ data }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
      const fetcher = vi.fn(async (url: string) => {
        if (url.includes('/products?')) return json([{ id: 'p1', is_active: true, deleted_at: null }, { id: 'p2', is_active: false, deleted_at: null }])
        if (url.includes('/locations')) return json([{ id: 'l1', is_active: true, deleted_at: null }, { id: 'l2', is_active: false, deleted_at: null }])
        if (url.includes('/categories')) return json([{ id: 'c1', name: 'Parent', children: [{ id: 'c2', name: 'Child' }] }])
        if (url.includes('/suppliers')) return json([{ id: 's1', name: 'Sup', is_active: true }, { id: 's2', name: 'Dead', is_active: false }])
        if (url.includes('/uoms')) return json([{ id: 'u1', name: 'Bottle', symbol: 'btl' }])
        throw new Error(`unexpected url ${url}`)
      })
      const refs = await loadReceiptReferences(fetcher as unknown as typeof fetch)
      expect(refs.products).toHaveLength(1)
      expect(refs.locations).toHaveLength(1)
      expect(refs.categories).toEqual([{ id: 'c1', name: 'Parent' }, { id: 'c2', name: 'Child' }])
      expect(refs.suppliers).toEqual([{ id: 's1', name: 'Sup', is_active: true }])
      expect(refs.uoms).toEqual([{ id: 'u1', name: 'Bottle', symbol: 'btl' }])
    })
  })
})
