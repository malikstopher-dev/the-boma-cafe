import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: () => mockClient,
}))

import { createTransaction, getBalance, getBalanceAtTime } from '../engine/ledger'
import {
  InactiveProductError,
  InsufficientStockError,
  LocationNotFoundError,
  MissingCostCentreError,
  ProductUomNotLinkedError,
  ProductNotFoundError,
} from '../lib/errors'

const transaction = {
  id: 'txn-1',
  product_id: 'product-1',
  location_id: 'location-1',
  transaction_type: 'purchase',
  quantity: 10,
  unit_cost: 25,
  reference_type: null,
  reference_id: null,
  performed_by: null,
  notes: null,
  import_batch_id: null,
  created_at: '2026-08-26T10:00:00.000Z',
  cost_centre_id: 'cost-centre-1',
  reason_type: null,
  reason_notes: null,
  manager_note: null,
  note_author: null,
  order_id: null,
  order_line_id: null,
  recipe_id: null,
}

function makeHistoryChain(result: { data: Array<{ quantity: number | string | null }> | null; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'lte']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

describe('ledger atomic transaction contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a movement through exactly one atomic RPC call', async () => {
    mockClient.rpc.mockResolvedValue({ data: transaction, error: null })

    const result = await createTransaction({
      product_id: 'product-1',
      location_id: 'location-1',
      transaction_type: 'purchase',
      quantity: 10,
      unit_cost: 25,
      cost_centre_id: 'cost-centre-1',
      order_id: 'order-1',
      order_line_id: 'line-1',
      recipe_id: 'recipe-1',
      entry_source: 'direct_receipt',
      source_uom_id: 'uom-case',
      source_unit_cost: 240,
      require_active_product: true,
      admin_actor_id: 'admin-1',
      admin_actor_name: 'Ms Zelda',
    })

    expect(result).toEqual(transaction)
    expect(mockClient.rpc).toHaveBeenCalledTimes(1)
    expect(mockClient.rpc).toHaveBeenCalledWith('create_inventory_transaction', {
      p_input: expect.objectContaining({
        product_id: 'product-1',
        location_id: 'location-1',
        transaction_type: 'purchase',
        quantity: 10,
        unit_cost: 25,
        cost_centre_id: 'cost-centre-1',
        order_id: 'order-1',
        order_line_id: 'line-1',
        recipe_id: 'recipe-1',
        entry_source: 'direct_receipt',
        source_uom_id: 'uom-case',
        source_unit_cost: 240,
        require_active_product: true,
        admin_actor_id: 'admin-1',
        admin_actor_name: 'Ms Zelda',
      }),
    })
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it.each([
    ['Product not found: product-1', ProductNotFoundError],
    ['Product is not active: product-1', InactiveProductError],
    ['UOM uom-case is not linked to product product-1', ProductUomNotLinkedError],
    ['Location not found: location-1', LocationNotFoundError],
    ['No cost centre could be determined for location location-1', MissingCostCentreError],
    ['Insufficient stock for product product-1 at location location-1', InsufficientStockError],
  ])('maps RPC error %s to the typed domain error', async (message, ErrorType) => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message } })

    await expect(createTransaction({
      product_id: 'product-1',
      location_id: 'location-1',
      transaction_type: 'sale',
      quantity: 1,
    })).rejects.toThrow(ErrorType)
  })

  it('fails closed when the atomic RPC returns no transaction', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: null })

    await expect(createTransaction({
      product_id: 'product-1',
      location_id: 'location-1',
      transaction_type: 'purchase',
      quantity: 1,
    })).rejects.toThrow('Failed to create transaction atomically: No transaction returned')
  })

  it('reads the current display balance from the balance RPC', async () => {
    mockClient.rpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: '12.5', error: null }),
    })
    await expect(getBalance('product-1', 'location-1')).resolves.toBe(12.5)
  })

  it('falls back to the ledger sum when the display-balance RPC is unavailable', async () => {
    mockClient.rpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'missing function' } }),
    })
    mockClient.from.mockReturnValue(makeHistoryChain({
      data: [{ quantity: '4.5' }, { quantity: -1 }, { quantity: null }],
      error: null,
    }))

    await expect(getBalance('product-1', 'location-1')).resolves.toBe(3.5)
  })

  it('sums historical movements at the supplied timestamp', async () => {
    mockClient.from.mockReturnValue(makeHistoryChain({
      data: [{ quantity: 10 }, { quantity: '-2.5' }],
      error: null,
    }))

    await expect(getBalanceAtTime(
      'product-1',
      'location-1',
      '2026-08-26T12:00:00.000Z',
    )).resolves.toBe(7.5)
  })

  it('fails closed when a historical movement read fails', async () => {
    mockClient.from.mockReturnValue(makeHistoryChain({
      data: null,
      error: { message: 'database unavailable' },
    }))

    await expect(getBalanceAtTime(
      'product-1',
      'location-1',
      '2026-08-26T12:00:00.000Z',
    )).rejects.toThrow('Failed to read historical balance: database unavailable')
  })
})
