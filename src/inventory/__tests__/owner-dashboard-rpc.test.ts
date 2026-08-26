import { describe, expect, it, vi } from 'vitest'

const mockRpc = vi.hoisted(() => vi.fn())

vi.mock('../lib/db', () => ({
  getInventoryClient: () => ({ rpc: mockRpc }),
}))

describe('owner dashboard RPC reader', () => {
  it('uses one aggregate RPC and retains the existing response range', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        location: 'main-location',
        locationName: 'Main Bar',
        kpi: {},
        locations: [],
        suppliers: [],
        supplierTotal: 0,
        recentPayments: [],
        boards: [],
        alerts: [],
        activity: [],
        movement: [],
        supplierPaymentsEnabled: true,
        managementActivity: [],
      },
      error: null,
    })
    const { getOwnerDashboard } = await import('../engine/owner-dashboard')
    const data = await getOwnerDashboard('custom', '2026-08-01', '2026-08-07')

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('owner_dashboard_consistent', {
      p_start: '2026-08-01T00:00:00.000Z',
      p_end: '2026-08-08T00:00:00.000Z',
      p_previous_start: '2026-07-25T00:00:00.000Z',
      p_previous_end: '2026-08-01T00:00:00.000Z',
    })
    expect(data.range.label).toBe('2026-08-01 to 2026-08-07')
    expect(data.locationName).toBe('Main Bar')
  })

  it('surfaces an aggregate RPC error instead of silently using the N+1 engine', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied' } })
    const { getOwnerDashboard } = await import('../engine/owner-dashboard')
    await expect(getOwnerDashboard('this_week')).rejects.toEqual({ code: '42501', message: 'permission denied' })
  })
})
