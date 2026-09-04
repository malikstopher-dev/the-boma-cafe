import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/admin/context', () => ({
  getAdminContext: vi.fn(),
}))
vi.mock('@/inventory/lib/require-inventory-permission', () => ({
  requireInventoryPermission: vi.fn(async () => null),
}))
vi.mock('@/inventory/lib/db', () => ({
  getInventoryClient: vi.fn(),
}))

import { POST as quickCreate } from '../../inventory/api/products/quick-create/route'
import { getAdminContext } from '@/lib/admin/context'
import { getInventoryClient } from '@/inventory/lib/db'

const adminMock = getAdminContext as unknown as ReturnType<typeof vi.fn>
const clientMock = getInventoryClient as unknown as ReturnType<typeof vi.fn>

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/inventory/products/quick-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request
}

const VALID_BODY = {
  name: 'Triple Sec 750ml',
  base_uom_id: '11111111-1111-1111-1111-111111111111',
  inventory_type: 'BEVERAGE',
}

describe('POST /api/inventory/products/quick-create contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminMock.mockResolvedValue({
      adminId: '55555555-5555-5555-5555-555555555555',
      displayName: 'Probe Manager',
      role: 'manager',
      sessionId: 'sess-1',
    })
  })

  it('creates a product through the RPC and returns it', async () => {
    clientMock.mockReturnValue({
      rpc: vi.fn(async () => ({
        data: { product: { id: 'p1', name: 'Triple Sec 750ml' } },
        error: null,
      })),
    })
    const response = await quickCreate(makeRequest(VALID_BODY) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.name).toBe('Triple Sec 750ml')
  })

  it('rejects a missing name before any RPC call', async () => {
    const client = { rpc: vi.fn(async () => ({ data: {}, error: null })) }
    clientMock.mockReturnValue(client)
    const response = await quickCreate(makeRequest({ base_uom_id: VALID_BODY.base_uom_id }) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects a missing base UOM before any RPC call', async () => {
    const client = { rpc: vi.fn(async () => ({ data: {}, error: null })) }
    clientMock.mockReturnValue(client)
    const response = await quickCreate(makeRequest({ name: 'X' }) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects a negative unit cost before any RPC call', async () => {
    const client = { rpc: vi.fn(async () => ({ data: {}, error: null })) }
    clientMock.mockReturnValue(client)
    const response = await quickCreate(makeRequest({ ...VALID_BODY, unit_cost: -3 }) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(400)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('surfaces a duplicate-SKU RPC failure as 400 without partial state', async () => {
    clientMock.mockReturnValue({
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: 'A product with this SKU already exists' },
      })),
    })
    const response = await quickCreate(makeRequest({ ...VALID_BODY, sku: 'DUP-1' }) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.message).toContain('already exists')
  })

  it('returns 401 without an admin identity', async () => {
    adminMock.mockResolvedValue(null)
    const response = await quickCreate(makeRequest(VALID_BODY) as unknown as Parameters<typeof quickCreate>[0])
    expect(response.status).toBe(401)
  })
})
