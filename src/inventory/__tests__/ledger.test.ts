import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InsufficientStockError, ProductNotFoundError, LocationNotFoundError } from '../lib/errors'

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

import { createTransaction, getBalance, getBalanceAtTime } from '../engine/ledger'

function eq2Return(promise: Promise<unknown>) {
  return vi.fn(() => ({
    eq: vi.fn(() => promise),
  }))
}

function selectReturn(promise: Promise<unknown>) {
  return vi.fn(() => ({
    eq: eq2Return(promise),
  }))
}

function lteReturn(promise: Promise<unknown>) {
  return vi.fn(() => promise)
}

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string): Promise<{ data: null; error: { message: string } }> {
  return Promise.resolve({ data: null, error: { message: msg } })
}

describe('ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBalance', () => {
    it('should return summed balance from RPC', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn(() => res({ balance: 13 })),
      })

      const balance = await getBalance('prod-1', 'loc-1')
      expect(balance).toBe(13)
    })

    it('should return 0 from fallback when RPC fails and no transactions', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn(() => err('RPC not found')),
      })
      mockClient.from.mockReturnValue({
        select: selectReturn(res([])),
      })

      const balance = await getBalance('prod-1', 'loc-1')
      expect(balance).toBe(0)
    })

    it('should sum from fallback when RPC fails and transactions exist', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn(() => err('RPC not found')),
      })
      mockClient.from.mockReturnValue({
        select: selectReturn(res([{ quantity: 10 }, { quantity: 5 }])),
      })

      const balance = await getBalance('prod-1', 'loc-1')
      expect(balance).toBe(15)
    })
  })

  describe('getBalanceAtTime', () => {
    it('should return sum of transactions up to the timestamp', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: lteReturn(res([{ quantity: 10 }, { quantity: 5 }])),
            })),
          })),
        })),
      })

      const balance = await getBalanceAtTime('prod-1', 'loc-1', '2026-07-29T00:00:00Z')
      expect(balance).toBe(15)
    })

    it('should return 0 when no transactions', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: lteReturn(res([])),
            })),
          })),
        })),
      })

      const balance = await getBalanceAtTime('prod-1', 'loc-1', '2026-07-29T00:00:00Z')
      expect(balance).toBe(0)
    })
  })

  describe('createTransaction', () => {
    it('should create a purchase transaction', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn(() => res({ balance: 100 })),
      })
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ id: 'prod-1' })),
              })),
            })),
          }
        }
        if (table === 'inventory_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res({ id: 'loc-1' })),
                })),
              })),
            })),
          }
        }
        if (table === 'inventory_transactions') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => res({
                  id: 'tx-1',
                  product_id: 'prod-1',
                  location_id: 'loc-1',
                  transaction_type: 'purchase',
                  quantity: 10,
                  unit_cost: 50,
                  reference_type: null,
                  reference_id: null,
                  performed_by: null,
                  notes: null,
                  import_batch_id: null,
                  created_at: '2026-07-29T00:00:00Z',
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const tx = await createTransaction({
        product_id: 'prod-1',
        location_id: 'loc-1',
        transaction_type: 'purchase',
        quantity: 10,
        unit_cost: 50,
      })
      expect(tx.id).toBe('tx-1')
      expect(tx.quantity).toBe(10)
      expect(tx.unit_cost).toBe(50)
    })

    it('should throw ProductNotFoundError for non-existent product', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res(null)),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(
        createTransaction({
          product_id: 'prod-nonexistent',
          location_id: 'loc-1',
          transaction_type: 'purchase',
          quantity: 10,
        }),
      ).rejects.toThrow(ProductNotFoundError)
    })

    it('should throw LocationNotFoundError for inactive location', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ id: 'prod-1' })),
              })),
            })),
          }
        }
        if (table === 'inventory_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res(null)),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(
        createTransaction({
          product_id: 'prod-1',
          location_id: 'loc-inactive',
          transaction_type: 'purchase',
          quantity: 10,
        }),
      ).rejects.toThrow(LocationNotFoundError)
    })

    it('should throw InsufficientStockError for sale exceeding balance', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn(() => err('RPC skip')),
      })
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ id: 'prod-1' })),
              })),
            })),
          }
        }
        if (table === 'inventory_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res({ id: 'loc-1' })),
                })),
              })),
            })),
          }
        }
        if (table === 'inventory_transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => res([{ quantity: 5 }])),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(
        createTransaction({
          product_id: 'prod-1',
          location_id: 'loc-1',
          transaction_type: 'sale',
          quantity: 10,
        }),
      ).rejects.toThrow(InsufficientStockError)
    })
  })
})
