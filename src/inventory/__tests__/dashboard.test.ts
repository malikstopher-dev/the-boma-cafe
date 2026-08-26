import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = { from: vi.fn() }

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

vi.mock('../engine/reconciliation', () => ({
  getReconciliation: vi.fn(),
  getInventoryValue: vi.fn(async () => 1234),
}))

import { getAlerts, getDashboardSummary } from '../engine/dashboard'

type Thenable = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown
}

function makeChain(result: unknown): Thenable {
  const chain: any = { then: (resolve: (v: unknown) => unknown) => resolve(result) }
  for (const m of ['eq', 'gte', 'lte', 'select']) chain[m] = vi.fn(() => chain)
  return chain
}

function setup(opts: {
  count?: number
  ids?: { id: string; reorder_threshold: number | null }[]
  balances?: { product_id: string; balance: number }[]
  txns?: unknown[]
}) {
  const countChain = makeChain({ count: opts.count ?? 0, error: null })
  const idsChain = makeChain({ data: opts.ids ?? [], error: null })
  const balChain = makeChain({ data: opts.balances ?? [], error: null })
  const txnChain = makeChain({ data: opts.txns ?? [], error: null })
  mockClient.from.mockImplementation((table: string) => ({
    select: vi.fn((_sel: unknown, selOpts?: { head?: boolean }) => {
      if (table === 'inventory_products') return selOpts?.head ? countChain : idsChain
      if (table === 'inventory_product_balances') return balChain
      if (table === 'inventory_transactions') return txnChain
      throw new Error('unexpected table ' + table)
    }),
  }))
}

describe('getDashboardSummary counters (O6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts out of stock from balances (<= 0) including products with no balance row', async () => {
    setup({
      count: 3,
      ids: [
        { id: 'a', reorder_threshold: null },
        { id: 'b', reorder_threshold: 5 },
        { id: 'c', reorder_threshold: 10 },
      ],
      balances: [
        { product_id: 'a', balance: 0 },
        { product_id: 'c', balance: 20 },
      ],
    })

    const s = await getDashboardSummary('loc-1')
    expect(s.totalProducts).toBe(3)
    expect(s.outOfStockCount).toBe(2)
    expect(s.lowStockCount).toBe(0)
  })

  it('counts low stock when 0 < balance <= threshold', async () => {
    setup({
      count: 3,
      ids: [
        { id: 'a', reorder_threshold: 10 },
        { id: 'b', reorder_threshold: 5 },
        { id: 'c', reorder_threshold: null },
      ],
      balances: [
        { product_id: 'a', balance: 5 },
        { product_id: 'b', balance: 3 },
        { product_id: 'c', balance: 0 },
      ],
    })

    const s = await getDashboardSummary('loc-1')
    expect(s.lowStockCount).toBe(2)
    expect(s.outOfStockCount).toBe(1)
  })

  it('threshold boundary: equal counts as low, above does not', async () => {
    setup({
      count: 2,
      ids: [
        { id: 'a', reorder_threshold: 10 },
        { id: 'b', reorder_threshold: 10 },
      ],
      balances: [
        { product_id: 'a', balance: 10 },
        { product_id: 'b', balance: 11 },
      ],
    })

    const s = await getDashboardSummary('loc-1')
    expect(s.lowStockCount).toBe(1)
    expect(s.outOfStockCount).toBe(0)
  })

  it('no balance rows means every active product counts as out of stock', async () => {
    setup({
      count: 2,
      ids: [
        { id: 'a', reorder_threshold: 10 },
        { id: 'b', reorder_threshold: 10 },
      ],
      balances: [],
    })

    const s = await getDashboardSummary('loc-1')
    expect(s.outOfStockCount).toBe(2)
    expect(s.lowStockCount).toBe(0)
  })

  it('keeps total products, inventory value and today txn count from their sources', async () => {
    setup({ count: 7, ids: [], balances: [], txns: [] })

    const s = await getDashboardSummary('loc-1', 'FOOD')
    expect(s.totalProducts).toBe(7)
    expect(s.inventoryValue).toBe(1234)
    expect(s.todayTransactions).toBe(0)
  })
})

describe('getAlerts balance consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses location cache balances and flags zero stock without a threshold', async () => {
    setup({
      ids: [
        { id: 'zero', reorder_threshold: null },
        { id: 'low', reorder_threshold: 5 },
        { id: 'healthy', reorder_threshold: 5 },
      ],
      balances: [
        { product_id: 'zero', balance: 0 },
        { product_id: 'low', balance: 3 },
        { product_id: 'healthy', balance: 9 },
      ],
    })

    const alerts = await getAlerts('loc-1')

    expect(alerts).toEqual([
      expect.objectContaining({ productId: 'zero', type: 'out_of_stock', currentBalance: 0 }),
      expect.objectContaining({ productId: 'low', type: 'low_stock', currentBalance: 3, threshold: 5 }),
    ])
    expect(mockClient.from).not.toHaveBeenCalledWith('inventory_transactions')
  })
})
