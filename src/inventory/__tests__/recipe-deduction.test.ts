import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncOrderItems, deductOrderItems, autoDeductCompletedOrder } from '../engine/order-items'

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

const { mockCreateTransaction } = vi.hoisted(() => ({
  mockCreateTransaction: vi.fn(),
}))

vi.mock('../engine/ledger', () => ({
  createTransaction: mockCreateTransaction,
}))

vi.mock('../lib/audit', () => ({
  writeAuditLog: vi.fn(() => Promise.resolve()),
}))

type Fixtures = Record<string, unknown>
let fixtures: Fixtures = {}
let mockInserts: Array<{ table: string; payload: Record<string, unknown> }> = []
let mockUpdates: Array<{ table: string; payload: Record<string, unknown> }> = []

function chainFor(table: string) {
  const c: Record<string, unknown> = {}
  let insertPayload: unknown = null
  let usedIn = false
  let mode: 'select' | 'insert' | 'update' = 'select'
  c.insert = (p: unknown) => { mode = 'insert'; insertPayload = p; return c }
  c.update = (p: unknown) => { mode = 'update'; insertPayload = p; return c }
  c.select = () => c
  c.order = () => c
  c.eq = () => c
  c.is = () => c
  c.ilike = () => c
  c.limit = () => c
  c.in = () => { usedIn = true; return c }
  const getResult = () => {
    if (mode === 'insert') {
      mockInserts.push({ table, payload: (insertPayload as Record<string, unknown>) ?? {} })
      return Promise.resolve({ data: { id: 'new-id' }, error: null })
    }
    if (mode === 'update') {
      mockUpdates.push({ table, payload: (insertPayload as Record<string, unknown>) ?? {} })
      return Promise.resolve({ data: null, error: null })
    }
    if (usedIn && table === 'inventory_products') {
      return Promise.resolve({ data: fixtures.inventory_products_names ?? null, error: null })
    }
    return Promise.resolve({ data: fixtures[table] ?? null, error: null })
  }
  c.single = () => getResult()
  c.maybeSingle = () =>
    getResult().then((r: { data: unknown; error: null }) => {
      if (Array.isArray(r.data)) return { data: r.data[0] ?? null, error: null }
      return r
    })
  c.then = (onF: (v: unknown) => unknown) => getResult().then(onF)
  return c
}

const ingredientsFixture = [
  { product_id: 'ing-a', quantity: 0.5, wastage_pct: 10 },
  { product_id: 'ing-b', quantity: 0.3, wastage_pct: 0 },
]

function recipeLine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'oi-1',
    product_id: 'prod-1',
    base_quantity: null,
    item_name: 'Margarita',
    quantity: 2,
    recipe_id: 'rec-1',
    transaction_id: null,
    deducted_at: null,
    ...overrides,
  }
}

function directLine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'oi-2',
    product_id: 'prod-2',
    base_quantity: 0.33,
    item_name: 'Beer',
    quantity: 1,
    recipe_id: null,
    transaction_id: null,
    deducted_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInserts = []
  mockUpdates = []
  fixtures = {
    orders: { id: 'order-1', items_json: JSON.stringify([{ name: 'Margarita', quantity: 2, price: 95 }]), status: 'completed' },
    inventory_locations: { id: 'loc-1' },
    bar_items: null,
    inventory_products: { id: 'prod-1' },
    inventory_recipe_outputs: { recipe_id: 'rec-1', inventory_recipes: { created_at: '2026-01-01T00:00:00Z' } },
    inventory_recipes: { id: 'rec-1', yield_quantity: 1 },
    inventory_recipe_ingredients: ingredientsFixture,
    inventory_products_names: [
      { id: 'ing-a', name: 'Tequila' },
      { id: 'ing-b', name: 'Lime Juice' },
    ],
    inventory_transactions: [],
    order_items: [],
  }
  mockClient.from.mockImplementation((table: string) => chainFor(table))
  mockClient.rpc.mockResolvedValue({ data: { deducted: 1, skipped: 0, already_deducted: false }, error: null })
  mockCreateTransaction.mockResolvedValue({ id: 'txn-1' })
})

describe('syncOrderItems recipe resolution (F2)', () => {
  it('writes recipe_id matched via recipe output name', async () => {
    await syncOrderItems('order-1')
    const ins = mockInserts.find(i => i.table === 'order_items')!
    expect(ins.payload.recipe_id).toBe('rec-1')
    expect(ins.payload.product_id).toBe('prod-1')
    expect(ins.payload.base_quantity).toBe(2)
  })

  it('falls back to matching the recipe name itself', async () => {
    fixtures = { ...fixtures, inventory_recipe_outputs: null }
    await syncOrderItems('order-1')
    const ins = mockInserts.find(i => i.table === 'order_items')!
    expect(ins.payload.recipe_id).toBe('rec-1')
  })

  it('leaves recipe_id null when no recipe matches (direct deduction)', async () => {
    fixtures = { ...fixtures, inventory_recipe_outputs: null, inventory_recipes: null }
    await syncOrderItems('order-1')
    const ins = mockInserts.find(i => i.table === 'order_items')!
    expect(ins.payload.recipe_id).toBeNull()
    expect(ins.payload.product_id).toBe('prod-1')
  })

  it('updates an existing line with the resolved recipe_id', async () => {
    fixtures = { ...fixtures, order_items: [{ id: 'oi-0', transaction_id: null }] }
    await syncOrderItems('order-1')
    const upd = mockUpdates.find(u => u.table === 'order_items')!
    expect(upd.payload.recipe_id).toBe('rec-1')
    expect(mockInserts).toHaveLength(0)
  })
})

describe('deductOrderItems — atomic RPC first (F2)', () => {
  it('returns the RPC result without touching the ledger engine', async () => {
    mockClient.rpc.mockResolvedValue({ data: { deducted: 3, skipped: 1, already_deducted: false }, error: null })
    const res = await deductOrderItems('order-1', 'loc-1')
    expect(res).toEqual({ deducted: 3, skipped: 1 })
    expect(mockClient.rpc).toHaveBeenCalledWith('deduct_order_items', { p_order_id: 'order-1', p_location_id: 'loc-1' })
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('maps an idempotent already_deducted result to zero deductions', async () => {
    mockClient.rpc.mockResolvedValue({ data: { deducted: 0, skipped: 2, already_deducted: true }, error: null })
    const res = await deductOrderItems('order-1', 'loc-1')
    expect(res).toEqual({ deducted: 0, skipped: 2 })
  })

  it('refuses orders that are not completed before calling the RPC', async () => {
    fixtures = { ...fixtures, orders: { id: 'order-1', items_json: null, status: 'ready' } }
    await expect(deductOrderItems('order-1', 'loc-1')).rejects.toThrow('Only completed orders can be deducted (status: ready)')
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('falls back to the engine loop when the RPC is unavailable', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'function not found' } })
    fixtures = { ...fixtures, order_items: [recipeLine(), directLine()] }
    const res = await deductOrderItems('order-1', 'loc-1')
    expect(res).toEqual({ deducted: 2, skipped: 0 })
  })
})

describe('deductOrderItems engine fallback (recipe + direct lines)', () => {
  beforeEach(() => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'function not found' } })
  })

  it('deducts one SALE ledger row per recipe ingredient, scaled by servings', async () => {
    fixtures = { ...fixtures, order_items: [recipeLine(), directLine()] }
    await deductOrderItems('order-1', 'loc-1')

    expect(mockCreateTransaction).toHaveBeenCalledTimes(3)
    const calls = mockCreateTransaction.mock.calls.map((c: unknown[]) => c[0] as Record<string, unknown>)

    // Margarita x2, yield 1, wastage 10% on Tequila: 0.5*2*1.1 = 1.1 ; 0.3*2 = 0.6
    // (positive quantities; createTransaction negates + checks stock)
    expect(calls[0]).toMatchObject({
      product_id: 'ing-a',
      transaction_type: 'sale',
      quantity: 1.1,
      reason_type: 'SALE',
      reference_type: 'pos_order',
      reference_id: 'oi-1',
      order_id: 'order-1',
      order_line_id: 'oi-1',
      recipe_id: 'rec-1',
    })
    expect(calls[0]?.notes).toContain('Tequila')
    expect(calls[1]).toMatchObject({
      product_id: 'ing-b',
      quantity: 0.6,
      reference_id: 'oi-1',
      order_id: 'order-1',
      order_line_id: 'oi-1',
      recipe_id: 'rec-1',
    })
    // Direct line keeps the existing behaviour: order-id reference
    expect(calls[2]).toMatchObject({
      product_id: 'prod-2',
      quantity: 0.33,
      reference_id: 'order-1',
      order_id: 'order-1',
      order_line_id: 'oi-2',
      recipe_id: null,
    })

    const updates = mockUpdates.filter(u => u.table === 'order_items')
    expect(updates).toHaveLength(2)
    const recipeUpdate = updates.find(u => u.payload.deducted_at && !u.payload.transaction_id)
    const directUpdate = updates.find(u => u.payload.transaction_id)
    expect(recipeUpdate?.payload.deducted_at).toBeTruthy()
    expect(directUpdate?.payload.transaction_id).toBe('txn-1')
  })

  it('skips ingredients already deducted by a prior engine run (retry safety)', async () => {
    fixtures = {
      ...fixtures,
      inventory_transactions: [{ product_id: 'ing-a' }],
      order_items: [recipeLine()],
    }
    await deductOrderItems('order-1', 'loc-1')
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    const call = mockCreateTransaction.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.product_id).toBe('ing-b')
    const updates = mockUpdates.filter(u => u.table === 'order_items')
    expect(updates).toHaveLength(1)
    expect(updates[0]?.payload.deducted_at).toBeTruthy()
  })

  it('keeps an incomplete recipe line unmarked and throws on insufficient stock', async () => {
    fixtures = { ...fixtures, order_items: [recipeLine(), directLine()] }
    mockCreateTransaction
      .mockResolvedValueOnce({ id: 'txn-1' })
      .mockRejectedValueOnce(new Error('Insufficient stock for product ing-b at location loc-1: requested 0.6, available 0.5'))
      .mockResolvedValueOnce({ id: 'txn-2' })

    await expect(deductOrderItems('order-1', 'loc-1')).rejects.toThrow(/partially failed/)

    expect(mockCreateTransaction).toHaveBeenCalledTimes(3)
    const updates = mockUpdates.filter(u => u.table === 'order_items')
    // recipe line never marked; direct line completed and marked
    const recipeUpdate = updates.find(u => u.payload.deducted_at && !u.payload.transaction_id)
    expect(recipeUpdate).toBeUndefined()
    expect(updates.some(u => u.payload.transaction_id === 'txn-2')).toBe(true)
  })

  it('skips matched lines without a usable base quantity', async () => {
    fixtures = { ...fixtures, order_items: [directLine({ base_quantity: null })] }
    const res = await deductOrderItems('order-1', 'loc-1')
    expect(res).toEqual({ deducted: 0, skipped: 1 })
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })
})

describe('autoDeductCompletedOrder (completion hook path)', () => {
  it('resolves the first active location, syncs and deducts via the RPC', async () => {
    fixtures = { ...fixtures, orders: { id: 'order-1', items_json: '[]', status: 'completed' } }
    mockClient.rpc.mockResolvedValue({ data: { deducted: 1, skipped: 0, already_deducted: false }, error: null })
    const res = await autoDeductCompletedOrder('order-1')
    expect(res).toEqual({ deducted: 1, skipped: 0 })
    expect(mockClient.rpc).toHaveBeenCalledWith('deduct_order_items', { p_order_id: 'order-1', p_location_id: 'loc-1' })
  })
})