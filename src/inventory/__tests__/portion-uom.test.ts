import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '../api/products/[id]/route'
import { getDailySheet, saveDailyCell } from '../engine/daily-entry'

const mockClient = {
  from: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

// Ship 3 added a route-level permission gate (inventory.config.write);
// act as an owner so the gate passes and the PATCH flow is exercised.
vi.mock('@/lib/admin/context', () => ({
  getAdminContext: vi.fn(async () => ({
    adminId: 'admin-1',
    username: 'tester',
    displayName: 'Tester',
    role: 'owner',
    legacy: false,
    sessionId: 's1',
  })),
}))

vi.mock('../engine/stock-counts', () => ({
  createStockCount: vi.fn().mockResolvedValue({ stockCount: { id: 'sc-1', status: 'in_progress' }, productCount: 0 }),
  saveCountItem: vi.fn().mockResolvedValue({ id: 'item-1' }),
  submitStockCount: vi.fn().mockResolvedValue({}),
  approveStockCount: vi.fn().mockResolvedValue({}),
}))

vi.mock('../lib/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
}))

vi.mock('../lib/location', () => ({
  resolveLocationId: vi.fn().mockResolvedValue('loc-main'),
}))

import { resolveLocationId } from '../lib/location'
import { saveCountItem } from '../engine/stock-counts'

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

/** Chainable query-builder mock: select(...).eq(...).lte(...).in(...).maybeSingle().
 * Thenable so queries that end in a non-terminal method (eq/order/in/lte)
 * still resolve to { data, error } when awaited. */
function chain(data: unknown) {
  const builder: {
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    limit: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => Promise<unknown>
  } = {
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(res(data))),
    single: vi.fn(() => Promise.resolve(res(data))),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(res(data)).then(onFulfilled, onRejected),
  }
  return builder
}

/** from(table) -> select(...) -> chain. Queued per call via mockReturnValueOnce. */
function fromSelect(table: string, data: unknown) {
  mockClient.from.mockReturnValueOnce({
    select: vi.fn(() => chain(data)),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => res({ error: null })) })) })),
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => res({ id: 'x' })) })) })),
    update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => res({ id: 'x' })) })) })) })),
  })
}

function insertOk() {
  mockClient.from.mockReturnValueOnce({
    insert: vi.fn(() => res({ error: null })),
  })
}

function deleteOk() {
  mockClient.from.mockReturnValueOnce({
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => res({ error: null })) })) })),
  })
}

describe('products [id] PATCH — display UOM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from.mockReset()
  })

  it('sets a display UOM with factor, deletes prior display rows, and audits', async () => {
    fromSelect('inventory_uoms', { id: 'uom-portion' })
    fromSelect('inventory_product_uoms', { uom_id: 'uom-kg' })
    deleteOk()
    insertOk()
    insertOk()
    fromSelect('inventory_products', { id: 'prod-1', name: 'Chicken' })

    const request = new NextRequest('http://localhost/api/inventory/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ display_uom_id: 'uom-portion', display_factor: 0.25 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'prod-1' }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.id).toBe('prod-1')
  })

  it('rejects a non-positive display factor', async () => {
    const request = new NextRequest('http://localhost/api/inventory/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ display_uom_id: 'uom-portion', display_factor: -1 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'prod-1' }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.message).toContain('positive number')
  })

  it('rejects an unknown display UOM', async () => {
    fromSelect('inventory_uoms', null)
    fromSelect('inventory_product_uoms', { uom_id: 'uom-kg' })

    const request = new NextRequest('http://localhost/api/inventory/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ display_uom_id: 'uom-missing' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'prod-1' }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.message).toContain('not found')
  })

  it('rejects a display UOM equal to the base UOM', async () => {
    fromSelect('inventory_uoms', { id: 'uom-kg' })
    fromSelect('inventory_product_uoms', { uom_id: 'uom-kg' })

    const request = new NextRequest('http://localhost/api/inventory/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ display_uom_id: 'uom-kg', display_factor: 1 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'prod-1' }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.message).toContain('same as the base')
  })

  it('clears the display UOM when display_uom_id is null', async () => {
    deleteOk()
    insertOk()
    fromSelect('inventory_products', { id: 'prod-1', name: 'Chicken' })

    const request = new NextRequest('http://localhost/api/inventory/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ display_uom_id: null }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'prod-1' }) })
    expect(response.status).toBe(200)
  })
})

describe('daily-entry display UOM resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.from.mockReset()
  })

  it('getDailySheet fallback counts in the product display UOM with its factor', async () => {
    vi.mocked(resolveLocationId).mockResolvedValue('loc-main')
    // getOrCreateDailySession: no existing session (createStockCount is mocked)
    fromSelect('inventory_stock_counts', null)
    // profiles (empty -> fallback)
    fromSelect('inventory_count_profiles', [])
    // fallback products
    fromSelect('inventory_products', [{ id: 'prod-1', name: 'Chicken', sku: 'C-1' }])
    // batched display-UOM lookup: 1 Portion = 0.2 base units
    fromSelect('inventory_product_uoms', [{ product_id: 'prod-1', uom_id: 'uom-portion', conversion_factor: 0.2, inventory_uoms: { name: 'Portion' } }])
    // transactions for expected balance: 5 base units
    fromSelect('inventory_transactions', [{ product_id: 'prod-1', quantity: 5, unit_cost: 40 }])
    // saved count items
    fromSelect('inventory_stock_count_items', [])
    // location name
    fromSelect('inventory_locations', { name: 'Main Bar' })

    const sheet = await getDailySheet('main', '2026-08-18')
    expect(sheet.sections.length).toBe(1)
    const item = sheet.sections[0]!.items[0]!
    expect(item.countUomId).toBe('uom-portion')
    expect(item.countUomName).toBe('Portion')
    expect(item.factor).toBeCloseTo(0.2)
    expect(item.expectedUnits).toBeCloseTo(25)
    expect(item.baseExpected).toBe(5)
  })

  it('getDailySheet fallback stays in base units when no display UOM', async () => {
    vi.mocked(resolveLocationId).mockResolvedValue('loc-main')
    fromSelect('inventory_stock_counts', null)
    fromSelect('inventory_count_profiles', [])
    fromSelect('inventory_products', [{ id: 'prod-2', name: 'Beef', sku: 'B-1' }])
    fromSelect('inventory_product_uoms', [])
    fromSelect('inventory_transactions', [{ product_id: 'prod-2', quantity: 3, unit_cost: 50 }])
    fromSelect('inventory_stock_count_items', [])
    fromSelect('inventory_locations', { name: 'Main Bar' })

    const sheet = await getDailySheet('main', '2026-08-18')
    const item = sheet.sections[0]!.items[0]!
    expect(item.countUomId).toBe(null)
    expect(item.countUomName).toBe(null)
    expect(item.factor).toBe(1)
    expect(item.expectedUnits).toBeCloseTo(3)
  })

  it('saveDailyCell converts counted portions via the display UOM factor', async () => {
    // session lookup
    fromSelect('inventory_stock_counts', { id: 'sc-1', status: 'in_progress', location_id: 'loc-main', snapshot_tx_before: null })
    // profile item lookup (none)
    fromSelect('inventory_count_profile_items', null)
    // display UOM lookup: 1 Portion = 0.2 base
    fromSelect('inventory_product_uoms', { conversion_factor: 0.2 })

    await saveDailyCell('sc-1', 'prod-1', 10)

    expect(saveCountItem).toHaveBeenCalledWith('sc-1', 'prod-1', 2)
  })

  it('saveDailyCell prefers a configured count profile UOM over display UOM', async () => {
    fromSelect('inventory_stock_counts', { id: 'sc-1', status: 'in_progress', location_id: 'loc-main', snapshot_tx_before: null })
    // profile item: count in tots
    fromSelect('inventory_count_profile_items', { count_uom_id: 'uom-tot' })
    // getProductConversion('prod-1', 'uom-tot'): base lookup + product factor
    fromSelect('inventory_product_uoms', { uom_id: 'uom-kg', conversion_factor: 1 })
    fromSelect('inventory_product_uoms', { conversion_factor: 1 })

    await saveDailyCell('sc-1', 'prod-1', 10)

    expect(saveCountItem).toHaveBeenCalledWith('sc-1', 'prod-1', 10)
  })
})
