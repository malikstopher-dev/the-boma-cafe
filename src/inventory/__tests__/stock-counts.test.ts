import { describe, it, expect, vi, beforeEach } from 'vitest'
import { approveStockCount } from '../engine/stock-counts'
import type { InventoryStockCount, InventoryStockCountItem } from '../engine/types'

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
  getBalanceAtTime: vi.fn(),
}))

vi.mock('../engine/dashboard', () => ({
  refreshDashboardCache: vi.fn(() => Promise.resolve()),
}))

vi.mock('../lib/audit', () => ({
  writeAuditLog: vi.fn(() => Promise.resolve()),
}))

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string): Promise<{ data: null; error: { message: string } }> {
  return Promise.resolve({ data: null, error: { message: msg } })
}

const now = '2026-08-13T12:00:00Z'

function sessionRow(status: string): InventoryStockCount {
  return {
    id: 'sc-1',
    location_id: 'loc-1',
    status: status as InventoryStockCount['status'],
    snapshot_tx_before: 'tx-0',
    snapshot_tx_after: null,
    performed_by: null,
    approved_by: null,
    completed_at: null,
    notes: null,
    created_at: now,
    updated_at: now,
  } as unknown as InventoryStockCount
}

function itemRow(id: string, variance: number, transactionId?: string | null): InventoryStockCountItem {
  return {
    id,
    stock_count_id: 'sc-1',
    product_id: `prod-${id.slice(-1)}`,
    physical_quantity: 10,
    expected_quantity: 10 - variance,
    variance,
    variance_reason: null,
    transaction_id: transactionId ?? null,
  }
}

describe('approveStockCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateTransaction.mockResolvedValue({ id: 'txn-new' })
  })

  function mockApprove(options: {
    initialStatus: string
    items: InventoryStockCountItem[]
    claimResult?: unknown
    secondStatus?: string
    createTransactionErrorAt?: number
  }): { updatePatches: Array<{ table: string; patch: Record<string, unknown> }> } {
    const { initialStatus, items, claimResult, secondStatus, createTransactionErrorAt } = options
    let countStatus = initialStatus
    let selectCalls = 0
    const updatePatches: Array<{ table: string; patch: Record<string, unknown> }> = []
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => {
                selectCalls++
                if (selectCalls > 1 && secondStatus) countStatus = secondStatus
                return res(sessionRow(countStatus))
              }),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            updatePatches.push({ table, patch })
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    maybeSingle: vi.fn(() => {
                      if (patch.status === 'approving') {
                        return res(claimResult !== undefined ? claimResult : { id: 'sc-1' })
                      }
                      return res({ id: 'sc-1' })
                    }),
                    single: vi.fn(() => res({ ...sessionRow('approved'), ...patch })),
                  })),
                })),
              })),
            }
          }),
        }
      }
      if (table === 'inventory_stock_count_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => res(items)),
              maybeSingle: vi.fn(() => res(null)),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            updatePatches.push({ table, patch })
            return {
              eq: vi.fn(() => res(null)),
            }
          }),
        }
      }
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ id: 'tx-max' })),
              })),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })
    if (createTransactionErrorAt != null) {
      // Fail on the Nth call: queue successes for calls 1..N-1, then the
      // rejection (once-implementations run FIFO ahead of the base mock).
      for (let i = 1; i < createTransactionErrorAt; i++) {
        mockCreateTransaction.mockImplementationOnce(() => Promise.resolve({ id: 'txn-new' }))
      }
      mockCreateTransaction.mockRejectedValueOnce(new Error('insufficient stock'))
    }
    return { updatePatches }
  }

  it('approves with signed variances, skips zero variance, stamps and finishes', async () => {
    const mocks = mockApprove({
      initialStatus: 'submitted',
      items: [itemRow('i1', 5), itemRow('i2', -3), itemRow('i3', 0)],
    })

    const result = await approveStockCount('sc-1', 'admin-1')

    // Signed quantities: +5 and -3 (a short variance must DECREASE stock).
    expect(mockCreateTransaction).toHaveBeenCalledTimes(2)
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'prod-1',
      transaction_type: 'physical_count',
      quantity: 5,
      reference_type: 'stock_count',
      reference_id: 'sc-1',
      performed_by: 'admin-1',
    }))
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'prod-2',
      transaction_type: 'physical_count',
      quantity: -3,
    }))

    const stampPatches = mocks.updatePatches.filter(p => p.table === 'inventory_stock_count_items')
    expect(stampPatches).toHaveLength(2)

    expect(result.status).toBe('approved')
    expect(result.snapshot_tx_after).toBe('tx-max')
    expect(result.approved_by).toBe('admin-1')
  })

  it('skips items already stamped with a transaction_id (retry-safety)', async () => {
    mockApprove({
      initialStatus: 'approving',
      items: [itemRow('i1', 5, 'txn-done'), itemRow('i2', 7)],
    })

    await approveStockCount('sc-1', 'admin-1')

    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({ quantity: 7 }))
  })

  it('returns idempotently when a concurrent approve already finished', async () => {
    mockApprove({
      initialStatus: 'submitted',
      claimResult: null,
      secondStatus: 'approved',
      items: [itemRow('i1', 5)],
    })

    const result = await approveStockCount('sc-1', 'admin-1')

    expect(result.status).toBe('approved')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('re-enters an interrupted (approving) session without double-posting', async () => {
    const result = mockApprove({
      initialStatus: 'approving',
      claimResult: null,
      items: [itemRow('i1', 5, 'txn-done')],
    })

    const approved = await approveStockCount('sc-1', 'admin-1')

    expect(approved.status).toBe('approved')
    // Claim hits zero rows (session already 'approving'), the already-stamped
    // item is skipped, and the session completes — no duplicate adjustments.
    expect(mockCreateTransaction).not.toHaveBeenCalled()
    // No restore was needed (approval completed)
    expect(result.updatePatches.filter(p => p.table === 'inventory_stock_counts' && p.patch.status === 'submitted')).toHaveLength(0)
  })

  it('restores the session to submitted and rethrows on mid-loop failure', async () => {
    const result = mockApprove({
      initialStatus: 'submitted',
      items: [itemRow('i1', 5), itemRow('i2', 3)],
      createTransactionErrorAt: 2,
    })

    await expect(approveStockCount('sc-1', 'admin-1')).rejects.toThrow('insufficient stock')

    // A restore update to 'submitted' must have been issued after the failure
    const restorePatch = result.updatePatches.find(
      p => p.table === 'inventory_stock_counts' && p.patch.status === 'submitted',
    )
    expect(restorePatch).toBeDefined()
    // First item was stamped before the failure — retry skips it
    expect(mockCreateTransaction).toHaveBeenCalledTimes(2)
  })

  it('rejects sessions that are not submitted/approving', async () => {
    mockApprove({ initialStatus: 'in_progress', items: [] })
    await expect(approveStockCount('sc-1', 'admin-1')).rejects.toThrow('cannot approve')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('rejects cleanly before claiming when migration 073 is not applied (preflight)', async () => {
    const updateMock = vi.fn()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => res(sessionRow('submitted'))),
            })),
          })),
          update: updateMock,
        }
      }
      if (table === 'inventory_stock_count_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => res([])),
              maybeSingle: vi.fn(() =>
                err('PGRST204: Could not find the transaction_id column of inventory_stock_count_items in the schema cache'),
              ),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    await expect(approveStockCount('sc-1', 'admin-1')).rejects.toThrow('migration 073')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('reuses an already-posted adjustment on duplicate-key error (H1: no double-post)', async () => {
    const updatePatches: Array<{ table: string; patch: Record<string, unknown> }> = []
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => res(sessionRow('submitted'))),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            updatePatches.push({ table, patch })
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    maybeSingle: vi.fn(() => res({ id: 'sc-1' })),
                    single: vi.fn(() => res({ ...sessionRow('approved'), ...patch })),
                  })),
                })),
              })),
            }
          }),
        }
      }
      if (table === 'inventory_stock_count_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => res([itemRow('i1', 5)])),
              maybeSingle: vi.fn(() => res(null)),
            })),
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            updatePatches.push({ table, patch })
            return { eq: vi.fn(() => res(null)) }
          }),
        }
      }
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => res({ id: 'txn-winner' })),
                })),
              })),
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ id: 'tx-max' })),
              })),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    // Simulates both H1 windows: a concurrent approval that already posted
    // this item's adjustment (winner's txn committed before our insert), or
    // a retry after a crash between createTransaction and the stamp.
    mockCreateTransaction.mockRejectedValueOnce(
      new Error('Failed to create transaction: duplicate key value violates unique constraint "idx_inventory_transactions_stock_count_item"'),
    )

    const result = await approveStockCount('sc-1', 'admin-1')

    expect(result.status).toBe('approved')
    // The winner's txn was fetched and stamped — no second adjustment posted
    const stampPatches = updatePatches.filter(p => p.table === 'inventory_stock_count_items')
    expect(stampPatches).toHaveLength(1)
    expect(stampPatches[0]?.patch.transaction_id).toBe('txn-winner')
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
  })

  it('surfaces a claim error', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_stock_counts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => res(sessionRow('submitted'))),
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
      if (table === 'inventory_stock_count_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => res([])),
              maybeSingle: vi.fn(() => res(null)),
            })),
          })),
        }
      }
      return { select: vi.fn(), update: vi.fn() }
    })

    await expect(approveStockCount('sc-1', 'admin-1')).rejects.toThrow('Failed to start approval: network down')
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })
})
