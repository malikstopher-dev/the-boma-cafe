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
  c.like = () => c
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
    orders: { id: 'order-1', items_json: JSON.stringify([{ name: 'Margarita', quantity: 2, price: 95 }]), status: 'completed', station: 'bar' },
    inventory_locations: { id: 'loc-1' },
    bar_items: null,
    inventory_products: [{ id: 'prod-1' }],
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

  it('keeps duplicate display names as distinct stable source lines', async () => {
    fixtures = {
      ...fixtures,
      orders: {
        id: 'order-1',
        status: 'completed',
        station: 'bar',
        items_json: JSON.stringify([
          { name: 'Margarita', quantity: 1, selected_size: 'single', source_line_id: 'line-a', source_type: 'bar_item', source_item_id: '11111111-1111-4111-8111-111111111111', inventory_required: true },
          { name: 'Margarita', quantity: 1, selected_size: 'double', source_line_id: 'line-b', source_type: 'bar_item', source_item_id: '11111111-1111-4111-8111-111111111111', inventory_required: true },
        ]),
      },
    }

    await syncOrderItems('order-1')

    const lines = mockInserts.filter(i => i.table === 'order_items').map(i => i.payload)
    expect(lines).toHaveLength(2)
    expect(lines.map(line => line.source_line_id)).toEqual(['line-a', 'line-b'])
    expect(lines.map(line => line.selected_size)).toEqual(['single', 'double'])
    expect(lines.every(line => line.reconciliation_status === 'matched')).toBe(true)
  })

  it('does not choose an arbitrary product when duplicate names exist', async () => {
    fixtures = {
      ...fixtures,
      inventory_products: [{ id: 'product-a' }, { id: 'product-b' }],
      inventory_recipe_outputs: null,
      inventory_recipes: null,
      orders: {
        id: 'order-1',
        status: 'completed',
        station: 'bar',
        items_json: JSON.stringify([{
          name: 'Lager',
          quantity: 1,
          source_line_id: 'line-a',
          source_type: 'bar_item',
          source_item_id: '11111111-1111-4111-8111-111111111111',
          inventory_required: true,
        }]),
      },
    }

    await syncOrderItems('order-1')

    const line = mockInserts.find(i => i.table === 'order_items')!.payload
    expect(line.product_id).toBeNull()
    expect(line.reconciliation_status).toBe('requires_mapping')
  })
})

describe('deductOrderItems — atomic RPC first (F2)', () => {
  it('returns the RPC result without touching the ledger engine', async () => {
    mockClient.rpc.mockResolvedValue({ data: { deducted: 3, skipped: 1, already_deducted: false }, error: null })
    const res = await deductOrderItems('order-1', 'loc-1')
    expect(res).toEqual({ deducted: 3, skipped: 1 })
    expect(mockClient.rpc).toHaveBeenCalledWith('deduct_order_items_v2', { p_order_id: 'order-1', p_location_id: 'loc-1' })
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

  it('fails closed when the atomic RPC is unavailable', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'function not found' } })
    await expect(deductOrderItems('order-1', 'loc-1')).rejects.toThrow(
      'Order deduction failed atomically: function not found',
    )
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('surfaces required unmatched lines and performs no fallback writes', async () => {
    mockClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Order item reconciliation required before deduction: Lager [line-a]' },
    })

    await expect(deductOrderItems('order-1', 'loc-1')).rejects.toThrow(
      'Order item reconciliation required before deduction: Lager [line-a]',
    )
    expect(mockCreateTransaction).not.toHaveBeenCalled()
    expect(mockUpdates.filter(update => update.table === 'order_items')).toHaveLength(0)
  })
})

describe('autoDeductCompletedOrder (completion hook path)', () => {
  it('resolves the order station mapping, syncs and deducts via the RPC', async () => {
    fixtures = { ...fixtures, orders: { id: 'order-1', items_json: '[]', status: 'completed', station: 'bar' } }
    mockClient.rpc.mockResolvedValue({ data: { deducted: 1, skipped: 0, already_deducted: false }, error: null })
    const res = await autoDeductCompletedOrder('order-1')
    expect(res).toEqual({ deducted: 1, skipped: 0 })
    expect(mockClient.rpc).toHaveBeenCalledWith('deduct_order_items_v2', { p_order_id: 'order-1', p_location_id: 'loc-1' })
  })
})
