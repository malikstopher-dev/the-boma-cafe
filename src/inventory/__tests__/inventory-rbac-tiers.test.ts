// Ship 3 — inventory RBAC tier enforcement.
//
// Matrix proves the ROUTE-LEVEL gates added this ship:
//   Tier B inventory.config.write  → owner/full_manager/manager pass; assistant_manager 403
//   Tier C inventory.approve       → owner/full_manager/manager pass; assistant_manager 403
//   Tier F inventory.final_approve → owner/full_manager ONLY (owner decision: submissions stay
//                                    manager-tier, approvals do not)
//   Tier D inventory.destructive   → owner/full_manager ONLY
// Fail-closed: unresolved admin identity → 401 on every gated route.
// Positive cells assert "not 401/403" (the gate passed); downstream handler
// behavior is intentionally out of scope here.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  adminContext: vi.fn(),
}))

vi.mock('@/lib/admin/context', () => ({
  getAdminContext: authMocks.adminContext,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

vi.mock('@/inventory/lib/db', () => ({
  getInventoryClient: () => {
    const ok = { data: null, error: { message: 'rbac-stub' } }
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      or: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      single: async () => ok,
      maybeSingle: async () => ok,
      insert: async () => ok,
      update: async () => ok,
      delete: async () => ok,
      rpc: async () => ok,
      then: (res?: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(ok).then(res, rej),
    }
    return chain
  },
}))

vi.mock('@/inventory/engine/stock-counts', () => ({
  approveStockCount: vi.fn(async () => ({})),
  getStockCount: vi.fn(async () => null),
}))
vi.mock('@/inventory/engine/daily-entry', () => ({
  approveDailySession: vi.fn(async () => ({})),
}))
vi.mock('@/inventory/engine/waste', () => ({
  recordWaste: vi.fn(async () => ({ id: 'w1' })),
  listWasteEvents: vi.fn(async () => []),
  wasteSummary: vi.fn(async () => []),
}))
vi.mock('@/inventory/lib/location', () => ({
  resolveLocationId: vi.fn(async () => 'loc-uuid'),
}))

import { PATCH as productPatch, DELETE as productDelete } from '@/app/api/inventory/products/[id]/route'
import { POST as stockCountApprove } from '@/app/api/inventory/stock-counts/[id]/approve/route'
import { POST as dailyApprove } from '@/app/api/inventory/daily-stock/[sessionId]/approve/route'
import { POST as wastePost } from '@/app/api/inventory/waste/route'
import { POST as supplierPost } from '@/app/api/inventory/suppliers/route'
import { POST as transactionPost } from '@/app/api/inventory/transactions/route'
import { POST as bulkPost } from '@/app/api/inventory/products/bulk/route'
import { POST as supplierPaymentPost } from '@/app/api/inventory/supplier-payments/route'
import { GET as payablesGet } from '@/app/api/inventory/payables/route'
import { can } from '@/lib/admin/permissions'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

function req(url: string, method: string, body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new NextRequest(`https://x.test${url}`, init)
}

function setRole(role: string | null) {
  authMocks.adminContext.mockResolvedValue(
    role ? { adminId: 'a1', username: role, displayName: role, role, legacy: false, sessionId: 's1' } : null,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('permission map distribution (unit)', () => {
  it('supplier finance is limited to owner and full_manager', () => {
    for (const permission of ['supplier.finance.read', 'supplier.finance.write'] as const) {
      expect(can('owner', permission)).toBe(true)
      expect(can('full_manager', permission)).toBe(true)
      expect(can('manager', permission)).toBe(false)
      expect(can('assistant_manager', permission)).toBe(false)
    }
  })

  it('final_approve is owner+full_manager only', () => {
    expect(can('owner', 'inventory.final_approve')).toBe(true)
    expect(can('full_manager', 'inventory.final_approve')).toBe(true)
    expect(can('manager', 'inventory.final_approve')).toBe(false)
    expect(can('assistant_manager', 'inventory.final_approve')).toBe(false)
  })
  it('config.write/approve exclude assistant_manager only', () => {
    for (const p of ['inventory.config.write', 'inventory.approve'] as const) {
      expect(can('owner', p)).toBe(true)
      expect(can('full_manager', p)).toBe(true)
      expect(can('manager', p)).toBe(true)
      expect(can('assistant_manager', p)).toBe(false)
    }
  })
  it('destructive excludes manager + assistant_manager', () => {
    expect(can('full_manager', 'inventory.destructive')).toBe(true)
    expect(can('manager', 'inventory.destructive')).toBe(false)
    expect(can('assistant_manager', 'inventory.destructive')).toBe(false)
  })
})

describe('Tier B — inventory.config.write', () => {
  it.each(['assistant_manager'])('%s denied on product PATCH', async (role) => {
    setRole(role)
    const res = await productPatch(req(`/api/inventory/products/${UUID}`, 'PATCH', { name: 'x' }), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect(res.status).toBe(403)
  })

  it.each(['manager', 'full_manager', 'owner'])('%s passes the gate on product PATCH', async (role) => {
    setRole(role)
    const res = await productPatch(req(`/api/inventory/products/${UUID}`, 'PATCH', { name: 'x' }), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect([401, 403]).not.toContain(res.status)
  })

  it('unresolved identity fails closed (401)', async () => {
    setRole(null)
    const res = await supplierPost(req('/api/inventory/suppliers', 'POST', { name: 's' }))
    expect(res.status).toBe(401)
  })
})

describe('supplier finance permissions', () => {
  it.each(['manager', 'assistant_manager'])('%s cannot read supplier payables', async (role) => {
    setRole(role)
    const response = await payablesGet(req('/api/inventory/payables', 'GET'))
    expect(response.status).toBe(403)
  })

  it.each(['manager', 'assistant_manager'])('%s cannot record supplier payments', async (role) => {
    setRole(role)
    const response = await supplierPaymentPost(req('/api/inventory/supplier-payments', 'POST', {
      invoiceId: UUID,
      amount: 100,
      paidAt: '2026-08-26T12:00:00.000Z',
      idempotencyKey: 'payment-1',
    }))
    expect(response.status).toBe(403)
  })

  it.each(['owner', 'full_manager'])('%s passes the supplier payment gate', async (role) => {
    setRole(role)
    const response = await supplierPaymentPost(req('/api/inventory/supplier-payments', 'POST', {
      invoiceId: UUID,
      amount: 100,
      paidAt: '2026-08-26T12:00:00.000Z',
      idempotencyKey: 'payment-1',
    }))
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })
})

describe('Tier C — inventory.approve', () => {
  it('assistant_manager denied on waste POST', async () => {
    setRole('assistant_manager')
    const res = await wastePost(req('/api/inventory/waste', 'POST', { product_id: 'p', location_id: 'l', transaction_type: 'waste', quantity: 1 }))
    expect(res.status).toBe(403)
  })

  it('manager passes the gate on waste POST', async () => {
    setRole('manager')
    const res = await wastePost(req('/api/inventory/waste', 'POST', { product_id: 'p', location_id: 'l', transaction_type: 'waste', quantity: 1 }))
    expect([401, 403]).not.toContain(res.status)
  })

  it('assistant_manager denied on transaction POST', async () => {
    setRole('assistant_manager')
    const res = await transactionPost(req('/api/inventory/transactions', 'POST', { product_id: 'p', location_id: 'l', transaction_type: 'sale', quantity: 1 }))
    expect(res.status).toBe(403)
  })

  it('manager passes the transaction mutation gate with server-resolved identity', async () => {
    setRole('manager')
    const res = await transactionPost(req('/api/inventory/transactions', 'POST', {
      product_id: 'p',
      location_id: 'l',
      transaction_type: 'adjustment',
      quantity: 1,
    }))
    expect([401, 403]).not.toContain(res.status)
  })
})

describe("Tier F — inventory.final_approve (owner decision: approvals = owner+full only)", () => {
  it('manager denied on stock-count approval', async () => {
    setRole('manager')
    const res = await stockCountApprove(req(`/api/inventory/stock-counts/${UUID}/approve`, 'POST', {}), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect(res.status).toBe(403)
  })

  it('full_manager passes the gate on stock-count approval', async () => {
    setRole('full_manager')
    const res = await stockCountApprove(req(`/api/inventory/stock-counts/${UUID}/approve`, 'POST', {}), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect([401, 403]).not.toContain(res.status)
  })

  it('assistant_manager denied on daily-stock approval', async () => {
    setRole('assistant_manager')
    const res = await dailyApprove(req(`/api/inventory/daily-stock/${UUID}/approve`, 'POST', {}), {
      params: Promise.resolve({ sessionId: UUID }),
    } as never)
    expect(res.status).toBe(403)
  })
})

describe('Tier D — inventory.destructive', () => {
  it('manager denied on product hard DELETE', async () => {
    setRole('manager')
    const res = await productDelete(req(`/api/inventory/products/${UUID}?hard=1`, 'DELETE'), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect(res.status).toBe(403)
  })

  it('full_manager passes the gate on product hard DELETE', async () => {
    setRole('full_manager')
    const res = await productDelete(req(`/api/inventory/products/${UUID}?hard=1`, 'DELETE'), {
      params: Promise.resolve({ id: UUID }),
    } as never)
    expect([401, 403]).not.toContain(res.status)
  })

  it('bulk with delete intent: manager 403 before any write', async () => {
    setRole('manager')
    const res = await bulkPost(req('/api/inventory/products/bulk', 'POST', {
      ids: [UUID],
      delete: true,
      patch: { is_active: false },
    }))
    expect(res.status).toBe(403)
  })

  it('bulk with delete intent: owner passes the destructive gate', async () => {
    setRole('owner')
    const res = await bulkPost(req('/api/inventory/products/bulk', 'POST', {
      ids: [UUID],
      delete: true,
      patch: { is_active: false },
    }))
    expect([401, 403]).not.toContain(res.status)
  })

  it('bulk plain edit: manager still passes (conditional tier)', async () => {
    setRole('manager')
    const res = await bulkPost(req('/api/inventory/products/bulk', 'POST', {
      ids: [UUID],
      patch: { reorder_threshold: 5 },
    }))
    expect([401, 403]).not.toContain(res.status)
  })
})
