import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient: any = { from: vi.fn() }
const mockCreateTransaction = vi.hoisted(() => vi.fn())

vi.mock('../lib/db', () => ({ getInventoryClient: () => mockClient }))
vi.mock('../engine/ledger', () => ({ createTransaction: mockCreateTransaction }))

import {
  processReservationLifecycle,
  ReservationLifecycleError,
} from '../engine/reservations'

type ReservationRow = {
  id: string
  booking_id: string
  product_id: string
  location_id: string
  quantity_reserved: number
  quantity_consumed: number
  status: string
  notes: null
  created_at: string
  updated_at: string
}

const now = '2026-08-30T10:00:00.000Z'
const rows: ReservationRow[] = [
  { id: 'res-1', booking_id: 'booking-1', product_id: 'prod-1', location_id: 'loc-1', quantity_reserved: 2, quantity_consumed: 0, status: 'active', notes: null, created_at: now, updated_at: now },
  { id: 'res-2', booking_id: 'booking-1', product_id: 'prod-2', location_id: 'loc-1', quantity_reserved: 3, quantity_consumed: 0, status: 'active', notes: null, created_at: now, updated_at: now },
]

function reservationTable() {
  return {
    select: vi.fn(() => {
      let filterKey = ''
      let filterValue = ''
      const chain: any = {
        eq: vi.fn((key: string, value: string) => {
          filterKey = key
          filterValue = value
          return chain
        }),
        order: vi.fn(async () => ({ data: rows.map(row => ({ ...row })), error: null })),
        maybeSingle: vi.fn(async () => ({
          data: filterKey === 'id' ? rows.find(row => row.id === filterValue) ?? null : null,
          error: null,
        })),
      }
      return chain
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      let id = ''
      const chain: any = {
        eq: vi.fn((_key: string, value: string) => {
          id = value
          return chain
        }),
        in: vi.fn(() => chain),
        select: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          const row = rows.find(item => item.id === id)
          if (!row) return { data: null, error: null }
          Object.assign(row, payload)
          return { data: { ...row }, error: null }
        }),
      }
      return chain
    }),
  }
}

function bookingTable() {
  return {
    select: vi.fn((columns: string) => {
      const chain: any = {
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: { status: 'completed' }, error: null })),
        single: vi.fn(async () => ({
          data: columns === 'status'
            ? { status: 'completed' }
            : { id: 'booking-1', venue_area_id: 'area-1', adults: 0, guests: 0 },
          error: null,
        })),
      }
      return chain
    }),
  }
}

describe('reservation lifecycle processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rows[0]!.status = 'active'
    rows[0]!.quantity_consumed = 0
    rows[1]!.status = 'active'
    rows[1]!.quantity_consumed = 0
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'bookings') return bookingTable()
      if (table === 'inventory_reservations') return reservationTable()
      return {}
    })
  })

  it('reports exact partial-consumption counts and throws for worker retry', async () => {
    mockCreateTransaction
      .mockResolvedValueOnce({ id: 'tx-1' })
      .mockRejectedValueOnce(new Error('temporary ledger failure'))

    try {
      await processReservationLifecycle('booking-1', 'consume')
      throw new Error('expected lifecycle failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ReservationLifecycleError)
      expect((error as ReservationLifecycleError).details).toMatchObject({
        action: 'consume', expected: 2, processed: 1, failed: 1,
      })
      expect((error as ReservationLifecycleError).details.failures[0]).toMatchObject({
        reservation_id: 'res-2', message: 'temporary ledger failure',
      })
    }
  })

  it('converges on retry without posting a second SALE for consumed reservations', async () => {
    rows[0]!.status = 'consumed'
    rows[0]!.quantity_consumed = 2
    rows[1]!.status = 'consumed'
    rows[1]!.quantity_consumed = 3

    await expect(processReservationLifecycle('booking-1', 'consume')).resolves.toMatchObject({
      expected: 2, processed: 2, failed: 0,
    })
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('fails visibly while the booking status commit has not happened yet', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn(() => {
            const chain: any = {
              eq: vi.fn(() => chain),
              maybeSingle: vi.fn(async () => ({ data: { status: 'in_progress' }, error: null })),
            }
            return chain
          }),
        }
      }
      return reservationTable()
    })

    await expect(processReservationLifecycle('booking-1', 'consume'))
      .rejects.toMatchObject({
        name: 'ReservationLifecycleError',
        details: { expected: 1, processed: 0, failed: 1 },
      })
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })
})
