import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportRollbackService } from '../import/ImportRollbackService'

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

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string): Promise<{ data: null; error: { message: string } }> {
  return Promise.resolve({ data: null, error: { message: msg } })
}

describe('ImportRollbackService', () => {
  const service = new ImportRollbackService()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateTransaction.mockResolvedValue({ id: 'rev-1' })
  })

  function mockChains(options: {
    batch?: unknown
    claimResult?: unknown
    transactions?: unknown
    notSpy?: ReturnType<typeof vi.fn>
    existingReversal?: unknown
  }) {
    const { batch, claimResult, transactions, notSpy, existingReversal } = options
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_imports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => res(batch ?? null)),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res(patch.status === 'rolled_back'
                    ? claimResult !== undefined ? claimResult : { id: 'batch-1' }
                    : { id: 'batch-1' })),
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn((cols: string) => {
            if (cols === 'id') {
              return { eq: vi.fn(() => ({ maybeSingle: vi.fn(() => res(existingReversal ?? null)) })) }
            }
            return { eq: vi.fn(() => ({ not: notSpy ?? vi.fn(() => res(transactions ?? [])) })) }
          }),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })
  }

  it('reverses a +10 purchase with an exact -10 adjustment', async () => {
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      transactions: [
        { id: 'txn-1', product_id: 'prod-1', location_id: 'loc-1', quantity: 10, unit_cost: 250, transaction_type: 'purchase' },
      ],
    })

    const result = await service.rollback('batch-1', 'admin')

    expect(result.reversalTransactionIds).toEqual(['rev-1'])
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'prod-1',
      location_id: 'loc-1',
      transaction_type: 'adjustment',
      quantity: -10,
      unit_cost: 250,
      performed_by: 'admin',
      reference_type: 'import_batch',
      reference_id: 'batch-1',
      notes: 'Rollback of import batch batch-1 (reversal of txn-1)',
    }))
    // Reversals must never carry import_batch_id (they are not batch
    // movements and must not be re-reversed by a retry).
    const reversalArgs = mockCreateTransaction.mock.calls[0]?.[0]
    expect(reversalArgs).toBeDefined()
    expect((reversalArgs as Record<string, unknown>).import_batch_id).toBeUndefined()
  })

  it('reverses a -4 adjustment with an exact +4 adjustment (sign negation, not Math.abs)', async () => {
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      transactions: [
        { id: 'txn-1', product_id: 'prod-1', location_id: 'loc-1', quantity: -4, unit_cost: null, transaction_type: 'adjustment' },
      ],
    })

    await service.rollback('batch-1')

    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({ quantity: 4 }))
  })

  it('excludes prior reversals via the notes signature (retry-safety)', async () => {
    const notSpy = vi.fn(() => res([]))
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      notSpy,
    })

    await service.rollback('batch-1')

    expect(notSpy).toHaveBeenCalledWith('notes', 'like', 'Rollback of import batch %')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('throws when the batch does not exist', async () => {
    mockChains({ batch: null })
    await expect(service.rollback('missing')).rejects.toThrow('Import batch not found: missing')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('throws when the batch is not applied', async () => {
    mockChains({ batch: { id: 'batch-1', status: 'previewed', applied_at: null } })
    await expect(service.rollback('batch-1')).rejects.toThrow("not in 'applied' status")
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('throws when the 24h rollback window has expired', async () => {
    mockChains({ batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-01T08:00:00Z' } })
    await expect(service.rollback('batch-1')).rejects.toThrow('Rollback window has expired (24 hours)')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('resumes a concurrent rollback instead of rejecting (H4 claim re-entry)', async () => {
    // The concurrent winner claimed the batch (claim update affected 0 rows)
    // and already reversed every movement. The loser re-enters, finds no
    // unreversed movements, and completes without posting anything.
    let importSelects = 0
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_imports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => {
                importSelects++
                if (importSelects === 1) return res({ id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' })
                return res({ id: 'batch-1', status: 'rolled_back' })
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res(null)),
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => res([])),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    const result = await service.rollback('batch-1')

    expect(result.reversalTransactionIds).toEqual([])
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('resumes a partial rollback after a crash (H4: recoverable)', async () => {
    // A crashed attempt left the batch 'rolled_back' with txn-1 already
    // reversed (its reversal row exists — the retry's notes-signature
    // filter excludes it). The retry re-enters and only reverses txn-2.
    let importSelects = 0
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_imports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => {
                importSelects++
                if (importSelects === 1) return res({ id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' })
                return res({ id: 'batch-1', status: 'rolled_back' })
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res(null)),
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => res([
                { id: 'txn-2', product_id: 'prod-2', location_id: 'loc-1', quantity: 5, unit_cost: null, transaction_type: 'purchase' },
              ])),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    const result = await service.rollback('batch-1')

    expect(result.reversalTransactionIds).toEqual(['rev-1'])
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      quantity: -5,
      notes: 'Rollback of import batch batch-1 (reversal of txn-2)',
    }))
  })

  it('reuses an existing reversal on duplicate-key error (H4: no double reversal)', async () => {
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      transactions: [
        { id: 'txn-1', product_id: 'prod-1', location_id: 'loc-1', quantity: 10, unit_cost: null, transaction_type: 'purchase' },
      ],
      existingReversal: { id: 'rev-existing' },
    })
    mockCreateTransaction.mockRejectedValueOnce(
      new Error('Failed to create transaction: duplicate key value violates unique constraint "idx_inventory_transactions_rollback_reversal"'),
    )

    const result = await service.rollback('batch-1')

    // A concurrent loop won the insert; this run reused it and posted nothing.
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    expect(result.reversalTransactionIds).toEqual(['rev-existing'])
  })

  it('throws when re-entry reveals the batch is not rolled_back (defensive reject)', async () => {
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      claimResult: null,
      transactions: [
        { id: 'txn-1', product_id: 'prod-1', location_id: 'loc-1', quantity: 10, unit_cost: null, transaction_type: 'purchase' },
      ],
    })

    await expect(service.rollback('batch-1')).rejects.toThrow('already rolled back')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('restores status to applied and rethrows when a reversal fails mid-loop', async () => {
    mockChains({
      batch: { id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' },
      transactions: [
        { id: 'txn-1', product_id: 'prod-1', location_id: 'loc-1', quantity: 10, unit_cost: null, transaction_type: 'purchase' },
        { id: 'txn-2', product_id: 'prod-2', location_id: 'loc-1', quantity: 5, unit_cost: null, transaction_type: 'purchase' },
      ],
    })
    mockCreateTransaction
      .mockResolvedValueOnce({ id: 'rev-1' })
      .mockRejectedValueOnce(new Error('insufficient stock'))

    await expect(service.rollback('batch-1')).rejects.toThrow('insufficient stock')

    const restoreCalls = mockClient.from.mock.calls.filter(c => c[0] === 'inventory_imports')
    const restoreUpdate = restoreCalls[restoreCalls.length - 1]
    expect(restoreUpdate).toBeDefined()
    expect(mockCreateTransaction).toHaveBeenCalledTimes(2)
  })

  it('surfaces a claim error', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_imports') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => res({ id: 'batch-1', status: 'applied', applied_at: '2026-08-13T08:00:00Z' })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(() => err('network down')),
                })),
              })),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    await expect(service.rollback('batch-1')).rejects.toThrow('Failed to mark import batch as rolled back: network down')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })
})
