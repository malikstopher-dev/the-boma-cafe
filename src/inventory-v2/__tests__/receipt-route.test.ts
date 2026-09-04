import { describe, it, expect, vi, beforeEach } from 'vitest'

// The receipts route imports permission/context helpers that read cookies;
// mock them to keep this a focused contract test.
vi.mock('@/lib/admin/context', () => ({
  getAdminContext: vi.fn(),
}))
vi.mock('@/inventory/lib/require-inventory-permission', () => ({
  requireInventoryPermission: vi.fn(async () => null),
}))
vi.mock('@/inventory/lib/db', () => ({
  getInventoryClient: vi.fn(),
}))
vi.mock('@/inventory/lib/location', () => ({
  resolveLocationId: vi.fn(async (id: string) => id || null),
}))

import { POST as postReceipt } from '../../inventory/api/receipts/route'
import { getAdminContext } from '@/lib/admin/context'
import { getInventoryClient } from '@/inventory/lib/db'

const adminMock = getAdminContext as unknown as ReturnType<typeof vi.fn>
const clientMock = getInventoryClient as unknown as ReturnType<typeof vi.fn>

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/inventory/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request
}

const VALID_LINE = {
  product_id: '11111111-1111-1111-1111-111111111111',
  uom_id: '22222222-2222-2222-2222-222222222222',
  quantity: 5,
  unit_cost: 10,
  line_value: 50,
}

const VALID_BODY = {
  location_id: '33333333-3333-3333-3333-333333333333',
  idempotency_key: '44444444-4444-4444-4444-444444444444',
  lines: [VALID_LINE],
}

function makeRpcClient(result: unknown, error?: unknown) {
  return {
    rpc: vi.fn(async () => ({ data: result, error: error ?? null })),
  }
}

describe('POST /api/inventory/receipts contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminMock.mockResolvedValue({
      adminId: '55555555-5555-5555-5555-555555555555',
      displayName: 'Probe Manager',
      role: 'manager',
      sessionId: 'sess-1',
    })
  })

  it('posts a valid multi-line receipt and returns the receipt payload', async () => {
    clientMock.mockReturnValue(makeRpcClient({
      outcome: 'posted',
      receipt_id: '66666666-6666-6666-6666-666666666666',
      transactions: [{ id: 't1' }, { id: 't2' }],
    }))
    const response = await postReceipt(makeRequest({
      ...VALID_BODY,
      lines: [VALID_LINE, { ...VALID_LINE, product_id: '77777777-7777-7777-7777-777777777777' }],
    }) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.outcome).toBe('posted')
    expect(body.data.posted_count).toBe(2)
  })

  it('rejects an empty lines array before any RPC call', async () => {
    const client = makeRpcClient({ outcome: 'posted' })
    clientMock.mockReturnValue(client)
    const response = await postReceipt(makeRequest({ ...VALID_BODY, lines: [] }) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects a non-UUID idempotency key before any RPC call', async () => {
    const client = makeRpcClient({ outcome: 'posted' })
    clientMock.mockReturnValue(client)
    const response = await postReceipt(makeRequest({ ...VALID_BODY, idempotency_key: 'not-a-uuid' }) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects a zero-quantity line before any RPC call', async () => {
    const client = makeRpcClient({ outcome: 'posted' })
    clientMock.mockReturnValue(client)
    const response = await postReceipt(makeRequest({
      ...VALID_BODY,
      lines: [{ ...VALID_LINE, quantity: 0 }],
    }) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects a negative unit cost before any RPC call', async () => {
    const client = makeRpcClient({ outcome: 'posted' })
    clientMock.mockReturnValue(client)
    const response = await postReceipt(makeRequest({
      ...VALID_BODY,
      lines: [{ ...VALID_LINE, unit_cost: -5 }],
    }) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('surfaces RPC failure as a 400 without fallback writes', async () => {
    clientMock.mockReturnValue(makeRpcClient(null, { message: 'Location not found or inactive: x' }))
    const response = await postReceipt(makeRequest(VALID_BODY) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('RECEIPT_FAILED')
    expect(body.error.message).toContain('Location not found')
  })

  it('returns 401 without an admin identity', async () => {
    adminMock.mockResolvedValue(null)
    const response = await postReceipt(makeRequest(VALID_BODY) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(401)
  })

  it('converges on an idempotent retry with already_posted outcome', async () => {
    clientMock.mockReturnValue(makeRpcClient({
      outcome: 'already_posted',
      receipt_id: '66666666-6666-6666-6666-666666666666',
      transactions: [{ id: 't1' }],
    }))
    const response = await postReceipt(makeRequest(VALID_BODY) as unknown as Parameters<typeof postReceipt>[0])
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.outcome).toBe('already_posted')
    expect(body.data.posted_count).toBe(1)
  })
})
