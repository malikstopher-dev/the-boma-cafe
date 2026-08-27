import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../api/imports/[id]/apply/route'

const mockClient = {
  rpc: vi.fn(),
  from: vi.fn(),
}

vi.mock('@/inventory/lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

// Ship 3 added a route-level permission gate; provide an admin identity
// (owner) so the gate passes and attribution stays 'admin-1'.
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

const { mockApply } = vi.hoisted(() => ({
  mockApply: vi.fn(),
}))

vi.mock('@/inventory/import/ImportService', () => ({
  ImportService: vi.fn().mockImplementation(function () {
    return { apply: mockApply }
  }),
}))

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string): Promise<{ data: null; error: { message: string } }> {
  return Promise.resolve({ data: null, error: { message: msg } })
}

const BATCH_ID = 'batch-1'
const DECISIONS = [{ rowIndex: 1, action: 'apply', productId: 'prod-1', quantity: 10 }]

function makeRequest(decisions: unknown[] = DECISIONS): NextRequest {
  return new NextRequest(`http://localhost/api/inventory/imports/${BATCH_ID}/apply`, {
    method: 'POST',
    body: JSON.stringify({ decisions, performed_by: 'admin-1' }),
  })
}

describe('import apply route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApply.mockResolvedValue({
      importBatchId: BATCH_ID,
      transactionIds: ['txn-engine'],
      productIds: [],
      rowCount: 1,
      appliedAt: '2026-08-13T12:00:00Z',
    })
  })

  it('rejects a rolled_back batch from the atomic RPC and never calls the engine', async () => {
    mockClient.rpc.mockReturnValue(err('Import batch batch-1 is rolled back and cannot be re-applied'))

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: BATCH_ID }) })

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('IMPORT_APPLY_FAILED')
    expect(body.error.message).toContain('rolled back and cannot be re-applied')
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('fails closed (500) when the atomic RPC cannot run', async () => {
    mockClient.rpc.mockReturnValue(err('RPC unavailable'))

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: BATCH_ID }) })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('IMPORT_APPLY_FAILED')
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('keeps the RPC already_applied path idempotent (no engine fallback)', async () => {
    mockClient.rpc.mockResolvedValue(res({
      import_batch_id: BATCH_ID,
      transaction_ids: ['txn-1', 'txn-2'],
      product_ids: [],
      row_count: 2,
      applied_at: '2026-08-13T12:00:00Z',
      already_applied: true,
    }))

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: BATCH_ID }) })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.importBatchId).toBe(BATCH_ID)
    expect(body.data.transactionIds).toEqual(['txn-1', 'txn-2'])
    expect(body.data.rowCount).toBe(2)
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('applies a pending batch through the RPC without the engine', async () => {
    mockClient.rpc.mockResolvedValue(res({
      import_batch_id: BATCH_ID,
      transaction_ids: ['txn-new'],
      product_ids: ['prod-1'],
      row_count: 1,
      applied_at: '2026-08-13T12:00:00Z',
      already_applied: false,
    }))

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: BATCH_ID }) })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.transactionIds).toEqual(['txn-new'])
    expect(body.data.productIds).toEqual(['prod-1'])
    expect(mockApply).not.toHaveBeenCalled()
  })

  it('does not fall back to the engine when the RPC is unavailable', async () => {
    mockClient.rpc.mockReturnValue(err('Could not find the function public.apply_import_batch'))

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: BATCH_ID }) })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('IMPORT_APPLY_FAILED')
    expect(mockApply).not.toHaveBeenCalled()
  })
})
