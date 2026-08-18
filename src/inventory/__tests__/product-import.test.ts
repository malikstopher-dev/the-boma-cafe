import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ParsedProductRow } from '../import/product-parser'

const mockClient = { from: vi.fn() }

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

import {
  previewProductImport,
  applyProductImport,
  undoProductImport,
} from '../engine/product-import'

interface StoredProduct {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  inventory_type: string
  category_id: string | null
  preferred_supplier_id: string | null
  unit_cost: number | null
  reorder_threshold: number | null
  reorder_quantity: number | null
  is_active: boolean
  deleted_at: string | null
}

const state: {
  suppliers: { id: string; name: string; is_active: boolean }[]
  categories: { id: string; name: string; is_active: boolean }[]
  uoms: { id: string; name: string; symbol: string | null }[]
  products: StoredProduct[]
  uomLinks: { product_id: string; uom_id: string; is_base: boolean; is_display: boolean; conversion_factor: number }[]
  audit: { table_name: string; record_id: string; action: string; changes?: unknown }[]
  imports: { id: string; status: string; created_ids: string[]; updated_ids: string[]; updated_snapshots: { product_id: string; before: Record<string, unknown> }[]; filename: string; created_at: string }[]
  txnCounts: Record<string, number>
  counter: number
} = {
  suppliers: [{ id: 'sup-1', name: 'United Butchery', is_active: true }],
  categories: [{ id: 'cat-1', name: 'WHISKEY', is_active: true }],
  uoms: [
    { id: 'uom-1', name: 'Tot', symbol: 'tot' },
    { id: 'uom-2', name: 'Kg', symbol: 'kg' },
  ],
  products: [],
  uomLinks: [],
  audit: [],
  imports: [],
  txnCounts: {},
  counter: 1,
}

function resetState() {
  state.suppliers = [{ id: 'sup-1', name: 'United Butchery', is_active: true }]
  state.categories = [{ id: 'cat-1', name: 'WHISKEY', is_active: true }]
  state.uoms = [
    { id: 'uom-1', name: 'Tot', symbol: 'tot' },
    { id: 'uom-2', name: 'Kg', symbol: 'kg' },
  ]
  state.products = []
  state.uomLinks = []
  state.audit = []
  state.imports = []
  state.txnCounts = {}
  state.counter = 1
}

type Op = { kind: 'select' | 'insert' | 'update' | 'delete'; sel?: string; opts?: { head?: boolean }; payload?: Record<string, unknown> }

interface Chain {
  result?: unknown
  filters: Record<string, unknown>
  table?: string
  inserted?: unknown
  ops: Op[]
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown
  eq: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function makeChain(): Chain {
  const chain = {
    filters: {},
    ops: [],
    then: (resolve: (v: unknown) => unknown) => resolve(execOps(chain)),
  } as unknown as Chain
  for (const m of ['eq', 'is', 'limit', 'order']) {
    ;(chain as unknown as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn((col: string, val?: unknown) => {
      if (val !== undefined) chain.filters[col] = val
      return chain
    })
  }
  chain.maybeSingle = vi.fn(() => chain)
  chain.single = vi.fn(() => chain)
  chain.select = vi.fn((sel?: unknown, opts?: { head?: boolean }) => {
    chain.ops.push({ kind: 'select', sel: sel as string, opts })
    return chain
  })
  chain.insert = vi.fn((payload: unknown) => {
    chain.ops.push({ kind: 'insert', payload: payload as Record<string, unknown> })
    return chain
  })
  chain.update = vi.fn((payload: unknown) => {
    chain.ops.push({ kind: 'update', payload: payload as Record<string, unknown> })
    return chain
  })
  chain.delete = vi.fn(() => {
    chain.ops.push({ kind: 'delete' })
    return chain
  })
  return chain
}

function execOps(chain: Chain): unknown {
  let res: unknown = chain.result ?? { data: null, error: null }
  for (const op of chain.ops) {
    if (op.kind === 'select') {
      res = chain.inserted ? chain.inserted : selectResult(chain, op.sel, op.opts)
    } else if (op.kind === 'insert') {
      res = insertResult(chain, op.payload ?? {})
      chain.inserted = res
    } else if (op.kind === 'update') {
      res = updateResult(chain, op.payload ?? {})
    } else {
      res = deleteResult(chain)
    }
    chain.result = res
  }
  chain.ops = []
  return res
}

function selectResult(chain: Chain, sel: string | undefined, opts?: { head?: boolean }): unknown {
  const table = chain.table
  if (table === 'inventory_suppliers') return { data: state.suppliers.filter(s => s.is_active), error: null }
  if (table === 'inventory_categories') return { data: state.categories.filter(c => c.is_active), error: null }
  if (table === 'inventory_uoms') return { data: state.uoms, error: null }
  if (table === 'inventory_products') {
    if (sel?.includes('id, name, sku, barcode') && !opts?.head) {
      return { data: state.products.filter(p => p.is_active && !p.deleted_at).map(p => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode })), error: null }
    }
    if (sel?.includes('name, sku, barcode, category_id')) {
      const id = chain.filters?.id as string | undefined
      const found = state.products.find(p => p.id === id)
      return { data: found ? { ...found } : null, error: null }
    }
    if (opts?.head) {
      const pid = chain.filters?.product_id as string | undefined
      return { count: pid ? state.txnCounts[pid] ?? 0 : 0, error: null }
    }
    return { data: [], error: null }
  }
  if (table === 'inventory_transactions') {
    const pid = chain.filters?.product_id as string | undefined
    return { count: pid ? state.txnCounts[pid] ?? 0 : 0, error: null }
  }
  if (table === 'inventory_product_imports') {
    const id = chain.filters?.id as string | undefined
    const found = state.imports.find(i => i.id === id)
    return { data: found ?? null, error: null }
  }
  return { data: [], error: null }
}

function insertResult(chain: Chain, payload: Record<string, unknown>): unknown {
  const table = chain.table
  if (table === 'inventory_suppliers') {
    const existing = state.suppliers.find(s => s.name === payload.name)
    if (existing) return { data: existing, error: null }
    const id = `sup-${state.counter++}`
    state.suppliers.push({ id, name: String(payload.name), is_active: true })
    return { data: { id }, error: null }
  }
  if (table === 'inventory_categories') {
    const existing = state.categories.find(c => c.name === payload.name)
    if (existing) return { data: existing, error: null }
    const id = `cat-${state.counter++}`
    state.categories.push({ id, name: String(payload.name), is_active: true })
    return { data: { id }, error: null }
  }
  if (table === 'inventory_products') {
    const id = `prod-${state.counter++}`
    state.products.push({
      id,
      name: String(payload.name),
      sku: (payload.sku as string | null) ?? null,
      barcode: (payload.barcode as string | null) ?? null,
      inventory_type: (payload.inventory_type as string) ?? 'GENERAL',
      category_id: (payload.category_id as string | null) ?? null,
      preferred_supplier_id: (payload.preferred_supplier_id as string | null) ?? null,
      unit_cost: (payload.unit_cost as number | null) ?? null,
      reorder_threshold: (payload.reorder_threshold as number | null) ?? null,
      reorder_quantity: (payload.reorder_quantity as number | null) ?? null,
      is_active: true,
      deleted_at: null,
    })
    return { data: { id }, error: null }
  }
  if (table === 'inventory_product_uoms') {
    state.uomLinks.push(payload as typeof state.uomLinks[number])
    return { data: null, error: null }
  }
  if (table === 'inventory_audit_log') {
    state.audit.push(payload as { table_name: string; record_id: string; action: string; changes?: unknown })
    return { data: null, error: null }
  }
  if (table === 'inventory_product_imports') {
    const id = `imp-${state.counter++}`
    state.imports.push({
      id,
      status: 'applied',
      filename: String(payload.filename),
      created_ids: (payload.created_ids as string[]) ?? [],
      updated_ids: (payload.updated_ids as string[]) ?? [],
      updated_snapshots: (payload.updated_snapshots as { product_id: string; before: Record<string, unknown> }[]) ?? [],
      created_at: new Date().toISOString(),
    })
    return { data: { id }, error: null }
  }
  return { data: null, error: null }
}

function updateResult(chain: Chain, payload: Record<string, unknown>): unknown {
  const table = chain.table
  if (table === 'inventory_products') {
    const id = chain.filters?.id as string | undefined
    const found = state.products.find(p => p.id === id)
    if (found) Object.assign(found, payload)
    return { data: found ?? null, error: null }
  }
  if (table === 'inventory_product_imports') {
    const id = chain.filters?.id as string | undefined
    const found = state.imports.find(i => i.id === id)
    if (found) Object.assign(found, payload)
    return { data: found ?? null, error: null }
  }
  return { data: null, error: null }
}

function deleteResult(chain: Chain): unknown {
  const table = chain.table
  if (table === 'inventory_products') {
    const id = chain.filters?.id as string | undefined
    state.products = state.products.filter(p => p.id !== id)
    return { data: null, error: null }
  }
  if (table === 'inventory_product_uoms') {
    const pid = chain.filters?.product_id as string | undefined
    state.uomLinks = state.uomLinks.filter(l => l.product_id !== pid)
    return { data: null, error: null }
  }
  return { data: null, error: null }
}

function row(over: Partial<ParsedProductRow> & { rowNumber: number; nameValue: string }): ParsedProductRow {
  const f = <T>(value: T | null, confidence: 'high' | 'medium' | 'low' = value === null ? 'low' : 'high') => ({ value, confidence })
  return {
    rowNumber: over.rowNumber,
    rawName: over.nameValue,
    name: f(over.nameValue),
    sku: f(over.sku?.value ?? null),
    barcode: f(over.barcode?.value ?? null),
    unitCost: f(over.unitCost?.value ?? null),
    unitText: f(over.unitText?.value ?? null),
    supplierName: f(over.supplierName?.value ?? null),
    categoryName: f(over.categoryName?.value ?? null),
    needsDetails: false,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.from.mockImplementation((table: string) => {
    const c = makeChain()
    c.table = table
    return c
  })
  resetState()
})

describe('previewProductImport', () => {
  it('matches existing products by sku, barcode, then name', async () => {
    state.products.push({
      id: 'prod-1', name: 'Jack Daniels', sku: 'JD-1', barcode: '6001234567890',
      category_id: null, preferred_supplier_id: null, unit_cost: null,
      reorder_threshold: null, reorder_quantity: null, inventory_type: 'GENERAL', is_active: true, deleted_at: null,
    })
    const rows = [
      row({ rowNumber: 2, nameValue: 'Jack Daniels', sku: { value: 'JD-1', confidence: 'high' } }),
      row({ rowNumber: 3, nameValue: 'Something Else', barcode: { value: '6001234567890', confidence: 'high' } }),
      row({ rowNumber: 4, nameValue: 'Jack Daniels' }),
      row({ rowNumber: 5, nameValue: 'New Product' }),
    ]
    const preview = await previewProductImport(rows)
    expect(preview[0]!.existing?.id).toBe('prod-1')
    expect(preview[1]!.existing?.id).toBe('prod-1')
    expect(preview[2]!.existing?.id).toBe('prod-1')
    expect(preview[3]!.existing).toBeNull()
  })
})

describe('applyProductImport', () => {
  it('creates products, auto-creates suppliers/categories/uom links, records the import', async () => {
    const result = await applyProductImport({
      rows: [
        {
          rowNumber: 2, action: 'create', name: 'Jack Daniels', sku: 'JD-1', barcode: null,
          unitCost: 450, unitText: 'TOTS', supplierName: 'New Butcher', categoryName: 'WHISKEY',
        },
        {
          rowNumber: 3, action: 'create', name: 'Chicken', sku: null, barcode: null,
          unitCost: 75, unitText: null, supplierName: 'United Butchery', categoryName: 'NEW CAT',
        },
      ],
      inventoryType: 'BEVERAGE',
      filename: 'bar.xlsx',
      sheetName: 'Template ',
      createdByAdminId: 'admin-1',
    })

    expect(result.created).toBe(2)
    expect(result.createdSuppliers).toEqual(['New Butcher'])
    expect(result.createdCategories).toEqual(['NEW CAT'])
    expect(state.products).toHaveLength(2)
    expect(state.products[0]!.sku).toBe('JD-1')
    expect(state.products[0]!.unit_cost).toBe(450)
    expect(state.products[0]!.inventory_type).toBe('BEVERAGE')
    expect(state.uomLinks).toHaveLength(1)
    expect(state.uomLinks[0]).toMatchObject({ uom_id: 'uom-1', is_base: true, is_display: false, conversion_factor: 1 })
    expect(state.audit.some(a => a.action === 'created')).toBe(true)
    expect(state.imports).toHaveLength(1)
    expect(state.imports[0]!.created_ids).toHaveLength(2)
    expect(state.imports[0]!.status).toBe('applied')
  })

  it('updates existing products and snapshots the before state', async () => {
    state.products.push({
      id: 'prod-1', name: 'Chicken', sku: null, barcode: null,
      category_id: null, preferred_supplier_id: null, unit_cost: 60,
      reorder_threshold: null, reorder_quantity: null, inventory_type: 'GENERAL', is_active: true, deleted_at: null,
    })
    const result = await applyProductImport({
      rows: [
        {
          rowNumber: 4, action: 'update', name: 'Chicken', sku: null, barcode: null,
          unitCost: 75, unitText: null, supplierName: null, categoryName: null,
        },
      ],
      inventoryType: 'FOOD',
      filename: 'kitchen.xlsx',
      sheetName: null,
      createdByAdminId: null,
    })

    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)
    expect(state.products[0]!.unit_cost).toBe(75)
    expect(state.imports[0]!.updated_snapshots).toEqual([
      { product_id: 'prod-1', before: expect.objectContaining({ unit_cost: 60 }) },
    ])
    expect(state.audit.some(a => a.action === 'updated')).toBe(true)
  })

  it('honours explicit create for a matching name (separate product)', async () => {
    state.products.push({
      id: 'prod-1', name: 'Jack Daniels', sku: null, barcode: null,
      category_id: null, preferred_supplier_id: null, unit_cost: null,
      reorder_threshold: null, reorder_quantity: null, inventory_type: 'GENERAL', is_active: true, deleted_at: null,
    })
    const result = await applyProductImport({
      rows: [
        {
          rowNumber: 2, action: 'create', name: 'Jack Daniels', sku: null, barcode: null,
          unitCost: null, unitText: null, supplierName: null, categoryName: null,
        },
      ],
      inventoryType: 'GENERAL',
      filename: 'dup.xlsx',
      sheetName: null,
      createdByAdminId: null,
    })
    expect(result.created).toBe(1)
    expect(state.products).toHaveLength(2)
  })

  it('skips rows without a name', async () => {
    const result = await applyProductImport({
      rows: [{ rowNumber: 5, action: 'create', name: null, sku: null, barcode: null, unitCost: null, unitText: null, supplierName: null, categoryName: null }],
      inventoryType: 'GENERAL',
      filename: 'x.xlsx',
      sheetName: null,
      createdByAdminId: null,
    })
    expect(result.created).toBe(0)
    expect(result.skipped).toBe(1)
    expect(state.products).toHaveLength(0)
  })
})

describe('undoProductImport', () => {
  it('deletes created products without transactions, archives those with history', async () => {
    const result = await applyProductImport({
      rows: [
        { rowNumber: 2, action: 'create', name: 'No History', sku: null, barcode: null, unitCost: null, unitText: null, supplierName: null, categoryName: null },
        { rowNumber: 3, action: 'create', name: 'Has History', sku: null, barcode: null, unitCost: null, unitText: null, supplierName: null, categoryName: null },
      ],
      inventoryType: 'GENERAL',
      filename: 'undo.xlsx',
      sheetName: null,
      createdByAdminId: null,
    })
    const withHistory = state.products.find(p => p.name === 'Has History')!.id
    state.txnCounts[withHistory] = 3

    const undone = await undoProductImport(result.importId)
    expect(undone).toEqual({ removed: 1, archived: 1, restored: 0 })
    expect(state.products.find(p => p.name === 'No History')).toBeUndefined()
    const archived = state.products.find(p => p.name === 'Has History')!
    expect(archived.is_active).toBe(false)
    expect(archived.deleted_at).not.toBeNull()
    expect(state.imports[0]!.status).toBe('rolled_back')
  })

  it('restores updated products from their before snapshots', async () => {
    state.products.push({
      id: 'prod-1', name: 'Chicken', sku: null, barcode: null,
      category_id: null, preferred_supplier_id: null, unit_cost: 60,
      reorder_threshold: null, reorder_quantity: null, inventory_type: 'GENERAL', is_active: true, deleted_at: null,
    })
    await applyProductImport({
      rows: [
        { rowNumber: 4, action: 'update', name: 'Chicken', sku: null, barcode: null, unitCost: 75, unitText: null, supplierName: null, categoryName: null },
      ],
      inventoryType: 'FOOD',
      filename: 'kitchen.xlsx',
      sheetName: null,
      createdByAdminId: null,
    })
    expect(state.products[0]!.unit_cost).toBe(75)

    const undone = await undoProductImport(state.imports[0]!.id)
    expect(undone.restored).toBe(1)
    expect(state.products[0]!.unit_cost).toBe(60)
  })

  it('rejects when the import is not applied', async () => {
    await expect(undoProductImport('imp-999')).rejects.toThrow('Import not found')
  })
})