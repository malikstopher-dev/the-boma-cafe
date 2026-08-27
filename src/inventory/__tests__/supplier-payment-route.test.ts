import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  record: vi.fn(),
  audit: vi.fn(),
}))

vi.mock('@/lib/admin/context', () => ({ getAdminContext: mocks.context }))
vi.mock('@/lib/admin/audit', () => ({ logAdminAction: mocks.audit }))
vi.mock('@/inventory/engine/payables', () => ({ recordSupplierPayment: mocks.record }))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }))

import { POST } from '../api/supplier-payments/route'

function request() {
  return new NextRequest('https://example.test/api/inventory/supplier-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId: '11111111-1111-4111-8111-111111111111',
      amount: 250,
      paidAt: '2026-08-26T12:00:00.000Z',
      idempotencyKey: 'payment-key-1',
    }),
  })
}

const owner = {
  adminId: 'admin-1',
  username: 'owner',
  displayName: 'Owner',
  role: 'owner',
  legacy: false,
  sessionId: 'session-1',
}

describe('supplier payment route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.context.mockResolvedValue(owner)
    mocks.audit.mockResolvedValue(undefined)
    mocks.record.mockResolvedValue({
      id: 'payment-1',
      invoice_id: '11111111-1111-4111-8111-111111111111',
      status: 'partial',
      already_recorded: false,
    })
  })

  it('uses the server-resolved admin identity and records one audit event', async () => {
    const response = await POST(request())

    expect(response.status).toBe(201)
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      recordedBy: 'admin-1',
      idempotencyKey: 'payment-key-1',
      amount: 250,
    }))
    expect(mocks.audit).toHaveBeenCalledTimes(1)
  })

  it('returns an idempotent retry without duplicating the admin audit event', async () => {
    mocks.record.mockResolvedValue({
      id: 'payment-1',
      invoice_id: '11111111-1111-4111-8111-111111111111',
      status: 'partial',
      already_recorded: true,
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.audit).not.toHaveBeenCalled()
  })
})
