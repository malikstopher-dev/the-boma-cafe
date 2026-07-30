import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = {
  from: vi.fn(),
  rpc: vi.fn(),
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

import {
  createReservation,
  getReservation,
  getReservationsForBooking,
  getReservationsForProduct,
  getTotalReserved,
  cancelReservation,
  cancelReservationsForBooking,
  consumeReservation,
  consumeReservationsForBooking,
  autoReserveForBooking,
  getDrinkPackageProducts,
  getAllDrinkPackageProducts,
  addDrinkPackageProduct,
  removeDrinkPackageProduct,
} from '../engine/reservations'

function res<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string, code?: string): Promise<{ data: null; error: { message: string; code?: string } }> {
  return Promise.resolve({ data: null, error: { message: msg, code: code ?? 'UNKNOWN' } })
}

const now = '2026-07-29T12:00:00Z'

describe('reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createReservation', () => {
    it('should create a reservation', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => res({
                  id: 'res-1',
                  booking_id: 'booking-1',
                  product_id: 'prod-1',
                  location_id: 'loc-1',
                  quantity_reserved: 10,
                  quantity_consumed: 0,
                  status: 'active',
                  notes: null,
                  created_at: now,
                  updated_at: now,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      const result = await createReservation({
        booking_id: 'booking-1',
        product_id: 'prod-1',
        location_id: 'loc-1',
        quantity: 10,
      })

      expect(result.id).toBe('res-1')
      expect(result.quantity_reserved).toBe(10)
      expect(result.status).toBe('active')
    })

    it('should throw on duplicate booking+product+location', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => err('duplicate key', '23505')),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      await expect(
        createReservation({
          booking_id: 'booking-1',
          product_id: 'prod-1',
          location_id: 'loc-1',
          quantity: 10,
        }),
      ).rejects.toThrow('Reservation already exists')
    })
  })

  describe('getReservation', () => {
    it('should return reservation when found', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({
                  id: 'res-1',
                  booking_id: 'booking-1',
                  product_id: 'prod-1',
                  location_id: 'loc-1',
                  quantity_reserved: 10,
                  quantity_consumed: 0,
                  status: 'active',
                  notes: null,
                  created_at: now,
                  updated_at: now,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getReservation('res-1')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('res-1')
    })

    it('should return null when not found', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res(null)),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getReservation('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getReservationsForBooking', () => {
    it('should return all reservations for a booking', async () => {
      const reservations = [
        { id: 'res-1', booking_id: 'booking-1', product_id: 'prod-1', location_id: 'loc-1', quantity_reserved: 10, quantity_consumed: 0, status: 'active', notes: null, created_at: now, updated_at: now },
        { id: 'res-2', booking_id: 'booking-1', product_id: 'prod-2', location_id: 'loc-1', quantity_reserved: 5, quantity_consumed: 0, status: 'active', notes: null, created_at: now, updated_at: now },
      ]

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res(reservations)),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getReservationsForBooking('booking-1')
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('res-1')
      expect(result[1]!.id).toBe('res-2')
    })

    it('should return empty array when no reservations', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res([])),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getReservationsForBooking('booking-empty')
      expect(result).toHaveLength(0)
    })
  })

  describe('getReservationsForProduct', () => {
    it('should return active reservations for a product+location', async () => {
      const reservations = [
        { id: 'res-1', booking_id: 'booking-1', product_id: 'prod-1', location_id: 'loc-1', quantity_reserved: 10, quantity_consumed: 0, status: 'active', notes: null, created_at: now, updated_at: now },
      ]

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    order: vi.fn(() => res(reservations)),
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getReservationsForProduct('prod-1', 'loc-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.product_id).toBe('prod-1')
    })
  })

  describe('getTotalReserved', () => {
    it('should return sum of reserved minus consumed', async () => {
      const reservations = [
        { quantity_reserved: 10, quantity_consumed: 2 },
        { quantity_reserved: 5, quantity_consumed: 0 },
      ]

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    order: vi.fn(() => res(reservations)),
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getTotalReserved('prod-1', 'loc-1')
      expect(result).toBe(13)
    })

    it('should return 0 when no active reservations', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    order: vi.fn(() => res([])),
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const result = await getTotalReserved('prod-1', 'loc-1')
      expect(result).toBe(0)
    })
  })

  describe('cancelReservation', () => {
    it('should cancel an active reservation', async () => {
      let callCount = 0
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => {
                  callCount++
                  if (callCount === 1) {
                    return res({ status: 'active' })
                  }
                  return res(null)
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => res({
                    id: 'res-1',
                    booking_id: 'booking-1',
                    product_id: 'prod-1',
                    location_id: 'loc-1',
                    quantity_reserved: 10,
                    quantity_consumed: 0,
                    status: 'cancelled',
                    notes: null,
                    created_at: now,
                    updated_at: now,
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const result = await cancelReservation('res-1')
      expect(result.status).toBe('cancelled')
    })

    it('should throw when already consumed', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ status: 'consumed' })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(cancelReservation('res-consumed')).rejects.toThrow('Cannot cancel a consumed reservation')
    })

    it('should throw when already cancelled', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({ status: 'cancelled' })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(cancelReservation('res-cancelled')).rejects.toThrow('Reservation is already cancelled')
    })

    it('should throw when not found', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res(null)),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(cancelReservation('nonexistent')).rejects.toThrow('Reservation not found')
    })
  })

  describe('cancelReservationsForBooking', () => {
    it('should cancel all active reservations for a booking', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res([
                  { id: 'res-1', status: 'active' },
                  { id: 'res-2', status: 'active' },
                ])),
              })),
            })),
            update: vi.fn(() => ({
              in: vi.fn(() => ({
                in: vi.fn(() => res(null)),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const count = await cancelReservationsForBooking('booking-1')
      expect(count).toBe(2)
    })

    it('should return 0 when no active reservations', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res([
                  { id: 'res-1', status: 'consumed' },
                  { id: 'res-2', status: 'cancelled' },
                ])),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const count = await cancelReservationsForBooking('booking-1')
      expect(count).toBe(0)
    })
  })

  describe('consumeReservation', () => {
    it('should consume an active reservation and create SALE transaction', async () => {
      let callCount = 0
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => {
                  callCount++
                  if (callCount === 1) {
                    return res({
                      id: 'res-1',
                      booking_id: 'booking-1',
                      product_id: 'prod-1',
                      location_id: 'loc-1',
                      quantity_reserved: 10,
                      quantity_consumed: 0,
                      status: 'active',
                      notes: null,
                      created_at: now,
                      updated_at: now,
                    })
                  }
                  return res(null)
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => res({
                    id: 'res-1',
                    booking_id: 'booking-1',
                    product_id: 'prod-1',
                    location_id: 'loc-1',
                    quantity_reserved: 10,
                    quantity_consumed: 10,
                    status: 'consumed',
                    notes: null,
                    created_at: now,
                    updated_at: now,
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const result = await consumeReservation('res-1')

      expect(mockCreateTransaction).toHaveBeenCalledWith({
        product_id: 'prod-1',
        location_id: 'loc-1',
        transaction_type: 'sale',
        quantity: 10,
        reference_type: 'booking',
        reference_id: 'booking-1',
        notes: 'Consumed from reservation res-1',
      })
      expect(result.status).toBe('consumed')
      expect(result.quantity_consumed).toBe(10)
    })

    it('should throw when already consumed', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({
                  id: 'res-1',
                  status: 'consumed',
                  quantity_reserved: 10,
                  quantity_consumed: 10,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(consumeReservation('res-1')).rejects.toThrow('Reservation is already consumed')
    })

    it('should throw when cancelled', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => res({
                  id: 'res-1',
                  status: 'cancelled',
                  quantity_reserved: 10,
                  quantity_consumed: 0,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      await expect(consumeReservation('res-1')).rejects.toThrow('Cannot consume a cancelled reservation')
    })
  })

  describe('consumeReservationsForBooking', () => {
    it('should consume all active reservations for a booking', async () => {
      let getCallCount = 0
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inventory_reservations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => {
                  getCallCount++
                  if (getCallCount === 1) {
                    return res([
                      { id: 'res-1', status: 'active' },
                      { id: 'res-2', status: 'active' },
                    ])
                  }
                  return res([])
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => res(null)),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), update: vi.fn() }
      })

      const count = await consumeReservationsForBooking('booking-1')
      expect(count).toBe(0)
    })
  })

  describe('autoReserveForBooking', () => {
    type BookingQuery = { select: ReturnType<typeof vi.fn> }

    function makeBookingMock(bookingData: unknown, quoteIdResult: unknown): BookingQuery {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => res(bookingData)),
            maybeSingle: vi.fn(() => res(quoteIdResult)),
          })),
        })),
      }
    }

    it('should auto-reserve products from drink packages', async () => {
      const bookingData = { id: 'booking-1', venue_area_id: 'va-1', adults: 20, guests: 25 }
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'bookings') return makeBookingMock(bookingData, { quote_id: 'quote-1' })
        if (table === 'inventory_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(() => res({ id: 'loc-1' })),
                  })),
                })),
              })),
            })),
          }
        }
        if (table === 'quote_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => res([
                  { reference_id: 'dp-1', quantity: 1 },
                ])),
              })),
            })),
          }
        }
        if (table === 'drink_package_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => res([
                { product_id: 'prod-1', quantity_per_person: 2 },
                { product_id: 'prod-2', quantity_per_person: 1.5 },
              ])),
            })),
          }
        }
        if (table === 'inventory_reservations') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => res({
                  id: 'res-auto-1',
                  booking_id: 'booking-1',
                  product_id: 'prod-1',
                  location_id: 'loc-1',
                  quantity_reserved: 40,
                  quantity_consumed: 0,
                  status: 'active',
                  notes: 'Auto-reserved from drink package dp-1',
                  created_at: now,
                  updated_at: now,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      const results = await autoReserveForBooking('booking-1')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.quantity_reserved).toBe(40)
    })

    it('should return empty if booking has no adults', async () => {
      const bookingData = { id: 'booking-1', venue_area_id: 'va-1', adults: 0, guests: 0 }
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'bookings') return makeBookingMock(bookingData, null)
        return { select: vi.fn(), insert: vi.fn() }
      })

      const results = await autoReserveForBooking('booking-1')
      expect(results).toHaveLength(0)
    })

    it('should return empty if booking has no quote', async () => {
      const bookingData = { id: 'booking-1', venue_area_id: 'va-1', adults: 10, guests: 10 }
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'bookings') return makeBookingMock(bookingData, null)
        if (table === 'inventory_locations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(() => res({ id: 'loc-1' })),
                  })),
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      const results = await autoReserveForBooking('booking-1')
      expect(results).toHaveLength(0)
    })
  })

  describe('getDrinkPackageProducts', () => {
    it('should return products for a drink package', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'drink_package_products') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res([
                  { id: 'dpp-1', drink_package_id: 'dp-1', product_id: 'prod-1', quantity_per_person: 2, created_at: now },
                ])),
              })),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const results = await getDrinkPackageProducts('dp-1')
      expect(results).toHaveLength(1)
      expect(results[0]!.product_id).toBe('prod-1')
    })
  })

  describe('getAllDrinkPackageProducts', () => {
    it('should return all drink package products with names', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'drink_package_products') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => res([
                { id: 'dpp-1', drink_package_id: 'dp-1', product_id: 'prod-1', quantity_per_person: 2, created_at: now },
              ])),
            })),
          }
        }
        return { select: vi.fn() }
      })

      const results = await getAllDrinkPackageProducts()
      expect(results).toHaveLength(1)
    })
  })

  describe('addDrinkPackageProduct', () => {
    it('should add a product to a drink package', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'drink_package_products') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => res({
                  id: 'dpp-1',
                  drink_package_id: 'dp-1',
                  product_id: 'prod-1',
                  quantity_per_person: 2,
                  created_at: now,
                })),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      const result = await addDrinkPackageProduct('dp-1', 'prod-1', 2)
      expect(result.id).toBe('dpp-1')
      expect(result.quantity_per_person).toBe(2)
    })

    it('should throw on duplicate', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'drink_package_products') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => err('duplicate key', '23505')),
              })),
            })),
          }
        }
        return { select: vi.fn(), insert: vi.fn() }
      })

      await expect(addDrinkPackageProduct('dp-1', 'prod-1', 2)).rejects.toThrow('Product already added')
    })
  })

  describe('removeDrinkPackageProduct', () => {
    it('should remove a product from a drink package', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'drink_package_products') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => res(null)),
            })),
          }
        }
        return { select: vi.fn(), delete: vi.fn() }
      })

      await expect(removeDrinkPackageProduct('dpp-1')).resolves.toBeUndefined()
    })
  })
})
