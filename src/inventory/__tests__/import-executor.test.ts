import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImportExecutor } from '../import/ImportExecutor'

const mockClient = {
  from: vi.fn(),
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

vi.mock('../lib/location', () => ({
  resolveLocationId: vi.fn(async () => 'loc-1'),
}))

describe('ImportExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateTransaction.mockResolvedValue({ id: 'txn-1' })
  })

  it('returns the real batch id (importId), not a fresh one (H3)', async () => {
    const upserts: Array<Record<string, unknown>> = []
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'inventory_imports') {
        return {
          upsert: vi.fn((row: Record<string, unknown>) => {
            upserts.push(row)
            return { onConflict: vi.fn() }
          }),
        }
      }
      return { upsert: vi.fn(), insert: vi.fn(), select: vi.fn(), update: vi.fn() }
    })

    const executor = new ImportExecutor()
    const result = await executor.execute(
      'batch-real',
      [{ rowIndex: 1, action: 'apply', productId: 'prod-1', quantity: 10 }],
      'admin-1',
      { importType: 'supplier_delivery', filename: 'sheet.xlsx' },
    )

    // The returned batch id matches the id the row was upserted under
    // (and therefore the id the RPC path returns).
    expect(result.importBatchId).toBe('batch-real')
    expect(upserts[0]?.id).toBe('batch-real')
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
  })
})