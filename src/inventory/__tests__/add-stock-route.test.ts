import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { InactiveProductError, LocationNotFoundError, ProductNotFoundError, ProductUomNotLinkedError } from '../lib/errors'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  adminContext: vi.fn(),
  resolveLocation: vi.fn(),
  createTransaction: vi.fn(),
}))

vi.mock('@/inventory/lib/require-inventory-permission', () => ({
  requireInventoryPermission: mocks.requirePermission,
}))
vi.mock('@/lib/admin/context', () => ({ getAdminContext: mocks.adminContext }))
vi.mock('@/inventory/lib/location', () => ({ resolveLocationId: mocks.resolveLocation }))
vi.mock('@/inventory/engine/ledger', () => ({ createTransaction: mocks.createTransaction }))

import { POST } from '@/app/api/inventory/transactions/route'

const actor = {
  adminId: 'admin-real',
  displayName: 'Ms Zelda',
  username: 'zelda',
  role: 'full_manager',
  legacy: false,
  sessionId: 'session-1',
}

function request(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://boma.test/api/inventory/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const validBody = {
  product_id: 'product-1',
  location_id: 'location-1',
  transaction_type: 'purchase',
  quantity: 3,
  uom_id: 'uom-case',
  unit_cost: 240,
  notes: 'Invoice 42',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requirePermission.mockResolvedValue(null)
  mocks.adminContext.mockResolvedValue(actor)
  mocks.resolveLocation.mockResolvedValue('location-1')
  mocks.createTransaction.mockResolvedValue({ id: 'tx-1', quantity: 36 })
})

describe('INV-4B transaction route', () => {
  it('uses inventory.approve and replaces body/header actors with the validated admin session', async () => {
    const response = await POST(request({
      ...validBody,
      performed_by: 'staff-spoof',
      admin_actor_id: 'admin-spoof',
      admin_actor_name: 'Forged Name',
      note_author: 'Forged Name',
      cost_centre_id: 'cost-centre-spoof',
    }, {
      'x-admin-id': 'header-spoof',
      'x-admin-name': 'Header Forgery',
    }))

    expect(response.status).toBe(201)
    expect(mocks.requirePermission).toHaveBeenCalledWith(expect.any(NextRequest), 'inventory.approve')
    expect(mocks.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'product-1',
      location_id: 'location-1',
      quantity: 3,
      source_uom_id: 'uom-case',
      source_unit_cost: 240,
      unit_cost: null,
      cost_centre_id: null,
      entry_source: 'direct_receipt',
      require_active_product: true,
      performed_by: null,
      note_author: 'Ms Zelda',
      admin_actor_id: 'admin-real',
      admin_actor_name: 'Ms Zelda',
    }))
  })

  it.each([
    ['item', { ...validBody, product_id: '' }],
    ['location', { ...validBody, location_id: '' }],
    ['quantity', { ...validBody, quantity: undefined }],
    ['UOM', { ...validBody, uom_id: undefined }],
  ])('rejects missing required %s before mutation', async (_field, body) => {
    const response = await POST(request(body))
    expect(response.status).toBe(400)
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it.each([0, -1, Number.POSITIVE_INFINITY])('rejects invalid receipt quantity %s', async quantity => {
    const response = await POST(request({ ...validBody, quantity }))
    expect(response.status).toBe(400)
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it('rejects an invalid or negative unit cost', async () => {
    for (const unit_cost of [-1, 'bad']) {
      const response = await POST(request({ ...validBody, unit_cost }))
      expect(response.status).toBe(400)
    }
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it('fails closed when the validated admin context cannot be resolved', async () => {
    mocks.adminContext.mockResolvedValue(null)
    const response = await POST(request(validBody))
    expect(response.status).toBe(401)
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it('returns the permission denial before resolving identity or writing', async () => {
    mocks.requirePermission.mockResolvedValue(NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 }))
    const response = await POST(request(validBody))
    expect(response.status).toBe(403)
    expect(mocks.adminContext).not.toHaveBeenCalled()
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })

  it.each([
    [new InactiveProductError('product-1'), 400],
    [new ProductUomNotLinkedError('product-1', 'uom-case'), 400],
    [new ProductNotFoundError('product-1'), 404],
    [new LocationNotFoundError('location-1'), 404],
  ])('maps authoritative item/UOM rejection %s', async (error, expectedStatus) => {
    mocks.createTransaction.mockRejectedValue(error)
    const response = await POST(request(validBody))
    expect(response.status).toBe(expectedStatus)
  })

  it('allows the unchanged spreadsheet base-unit writer only with its compatibility header', async () => {
    const body = { ...validBody }
    delete (body as Partial<typeof validBody>).uom_id
    const response = await POST(request(body, { 'x-boma-stock-entry-mode': 'legacy-spreadsheet' }))
    expect(response.status).toBe(201)
    expect(mocks.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      source_uom_id: null,
      entry_source: 'direct_receipt',
    }))
  })
})
