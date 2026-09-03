import { describe, expect, it, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const from = vi.fn()

vi.mock('../lib/db', () => ({
  getInventoryClient: () => ({ rpc, from }),
}))

import { recordWaste } from '../engine/waste'
import type { RecordWasteInput } from '../engine/waste'

function baseInput(overrides: Partial<RecordWasteInput> = {}): RecordWasteInput {
  return {
    product_id: 'product-1',
    location_id: 'location-1',
    transaction_type: 'waste',
    quantity: 3,
    reason_type: null,
    reason_notes: null,
    cost_centre_id: null,
    performed_by: null,
    ...overrides,
  }
}

describe('waste engine actor attribution (Gate A critical fix)', () => {
  beforeEach(() => {
    rpc.mockReset()
    rpc.mockResolvedValue({ data: { id: 'tx-1' }, error: null })
    from.mockReset()
  })

  it('passes server-derived admin actor fields through to the ledger RPC', async () => {
    await recordWaste(baseInput({ admin_actor_id: 'admin-uuid-1', admin_actor_name: 'Mr Gibbs' }))

    expect(rpc).toHaveBeenCalledWith('create_inventory_transaction', {
      p_input: expect.objectContaining({
        admin_actor_id: 'admin-uuid-1',
        admin_actor_name: 'Mr Gibbs',
        performed_by: null,
        transaction_type: 'waste',
        quantity: -3,
        reason_type: 'WASTE',
        reference_type: 'manual',
      }),
    })
  })

  it('never receives a display name as performed_by', async () => {
    // The old defect: the waste route passed admin.displayName into
    // performed_by, which the RPC casts to UUID -> 500 on every
    // admin-authenticated waste posting.
    await recordWaste(baseInput({ admin_actor_name: 'GATEA full_manager' }))

    const payload = rpc.mock.calls[0]?.[1]?.p_input as Record<string, unknown>
    expect(payload.performed_by).toBeNull()
  })

  it('keeps a valid UUID performed_by (staff identity) when supplied', async () => {
    await recordWaste(baseInput({ performed_by: 'staff-profile-uuid' }))

    const payload = rpc.mock.calls[0]?.[1]?.p_input as Record<string, unknown>
    expect(payload.performed_by).toBe('staff-profile-uuid')
  })

  it('normalizes quantity sign and applies the default reason', async () => {
    await recordWaste(baseInput({ transaction_type: 'breakage', quantity: 2, reason_type: null }))

    const payload = rpc.mock.calls[0]?.[1]?.p_input as Record<string, unknown>
    expect(payload.quantity).toBe(-2)
    expect(payload.reason_type).toBe('BREAKAGE')
  })
})
