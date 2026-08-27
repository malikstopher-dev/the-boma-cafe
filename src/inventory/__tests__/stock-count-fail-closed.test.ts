import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = { from: vi.fn() }
const mocks = vi.hoisted(() => ({
  getBalanceAtTime: vi.fn(),
  writeAuditLog: vi.fn(),
}))

vi.mock('../lib/db', () => ({ getInventoryClient: () => mockClient }))
vi.mock('../engine/ledger', () => ({
  createTransaction: vi.fn(),
  getBalanceAtTime: mocks.getBalanceAtTime,
}))
vi.mock('../lib/audit', () => ({ writeAuditLog: mocks.writeAuditLog }))
vi.mock('../engine/dashboard', () => ({ refreshDashboardCache: vi.fn() }))

import { createStockCount, getStockCount, saveCountItem } from '../engine/stock-counts'

function query(result: { data?: unknown; error?: { message: string } | null; count?: number | null }) {
  const value = { data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'gt', 'order', 'limit']) chain[method] = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(async () => value)
  chain.single = vi.fn(async () => value)
  chain.then = (resolve: (input: typeof value) => unknown) => Promise.resolve(value).then(resolve)
  return chain
}

describe('stock-count source reads fail closed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBalanceAtTime.mockResolvedValue(5)
    mocks.writeAuditLog.mockResolvedValue(undefined)
  })

  it('does not create a session when location validation fails', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_locations') return query({ error: { message: 'location read failed' } })
      throw new Error(`unexpected write to ${table}`)
    })

    await expect(createStockCount('loc-1')).rejects.toThrow(
      'Failed to validate stock count location: location read failed',
    )
    expect(mockClient.from).not.toHaveBeenCalledWith('inventory_stock_counts')
  })

  it('does not create a session when the ledger snapshot read fails', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_locations') return query({ data: { id: 'loc-1' } })
      if (table === 'inventory_transactions') return query({ error: { message: 'snapshot read failed' } })
      throw new Error(`unexpected write to ${table}`)
    })

    await expect(createStockCount('loc-1')).rejects.toThrow(
      'Failed to establish stock count snapshot: snapshot read failed',
    )
    expect(mockClient.from).not.toHaveBeenCalledWith('inventory_stock_counts')
  })

  it('does not create a session when stocked-product counting fails', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_locations') return query({ data: { id: 'loc-1' } })
      if (table === 'inventory_transactions') return query({ data: { id: 'tx-1' } })
      if (table === 'inventory_product_balances') return query({ error: { message: 'balance read failed' } })
      throw new Error(`unexpected write to ${table}`)
    })

    await expect(createStockCount('loc-1')).rejects.toThrow(
      'Failed to count stocked products: balance read failed',
    )
    expect(mockClient.from).not.toHaveBeenCalledWith('inventory_stock_counts')
  })

  it('does not upsert an item when its snapshot transaction cannot be read', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') {
        return query({ data: { id: 'sc-1', status: 'in_progress', location_id: 'loc-1', snapshot_tx_before: 'tx-1' } })
      }
      if (table === 'inventory_transactions') return query({ error: { message: 'transaction read failed' } })
      throw new Error(`unexpected write to ${table}`)
    })

    await expect(saveCountItem('sc-1', 'product-1', 4)).rejects.toThrow(
      'Failed to load stock count snapshot transaction: transaction read failed',
    )
    expect(mockClient.from).not.toHaveBeenCalledWith('inventory_stock_count_items')
    expect(mocks.getBalanceAtTime).not.toHaveBeenCalled()
  })

  it('does not convert an item-list read failure into an empty count', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') return query({ data: { id: 'sc-1', status: 'submitted' } })
      if (table === 'inventory_stock_count_items') return query({ error: { message: 'item read failed' } })
      throw new Error(`unexpected table ${table}`)
    })

    await expect(getStockCount('sc-1')).rejects.toThrow('Failed to load stock count items: item read failed')
  })
})
