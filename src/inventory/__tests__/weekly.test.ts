import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.hoisted(() => vi.fn())
const mockResolveLocationId = vi.hoisted(() => vi.fn())

vi.mock('../lib/db', () => ({
  getInventoryClient: () => ({ from: mockFrom }),
}))

vi.mock('../lib/location', () => ({
  resolveLocationId: mockResolveLocationId,
}))

const MAIN_BAR_ID = '214044c5-ea83-442f-8431-7e2cfc74e302'

function queryBuilder(result: { data: unknown[] | null; error: { message: string } | null }) {
  const query: Record<string, any> = {}
  for (const method of ['select', 'gte', 'lte', 'eq', 'in']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return query
}

describe('weekly movement', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockResolveLocationId.mockReset()
    mockResolveLocationId.mockImplementation(async (id: string | null) => id === 'main' ? MAIN_BAR_ID : id)
  })

  it('resolves the main alias before applying the UUID location filter', async () => {
    const query = queryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(query)

    const { getWeeklyMovement } = await import('../engine/weekly')
    await getWeeklyMovement(2026, 34, 'main')

    expect(mockResolveLocationId).toHaveBeenCalledWith('main')
    expect(query.eq).toHaveBeenCalledWith('location_id', MAIN_BAR_ID)
  })

  it('preserves an explicit UUID location', async () => {
    const query = queryBuilder({ data: [], error: null })
    mockFrom.mockReturnValue(query)

    const { getWeeklyMovement } = await import('../engine/weekly')
    await getWeeklyMovement(2026, 34, MAIN_BAR_ID)

    expect(mockResolveLocationId).toHaveBeenCalledWith(MAIN_BAR_ID)
    expect(query.eq).toHaveBeenCalledWith('location_id', MAIN_BAR_ID)
  })

  it('counts delivered and used types without changing their existing semantics', async () => {
    const query = queryBuilder({
      data: [
        { transaction_type: 'purchase', quantity: 10, unit_cost: 5, inventory_products: { inventory_type: 'BEVERAGE' } },
        { transaction_type: 'return', quantity: 2, unit_cost: 5, inventory_products: { inventory_type: 'BEVERAGE' } },
        { transaction_type: 'transfer_in', quantity: 3, unit_cost: 5, inventory_products: { inventory_type: 'BEVERAGE' } },
        { transaction_type: 'sale', quantity: -4, unit_cost: 5, inventory_products: { inventory_type: 'BEVERAGE' } },
        { transaction_type: 'adjustment', quantity: 99, unit_cost: 5, inventory_products: { inventory_type: 'BEVERAGE' } },
      ],
      error: null,
    })
    mockFrom.mockReturnValue(query)

    const { getWeeklyMovement } = await import('../engine/weekly')
    const result = await getWeeklyMovement(2026, 34, MAIN_BAR_ID)

    expect(result.totals).toMatchObject({ deliveredQty: 15, deliveredValue: 75, usedQty: 4, usedValue: 20 })
    expect(result.rows).toHaveLength(1)
  })

  it('surfaces database errors instead of returning business zeros', async () => {
    const query = queryBuilder({ data: null, error: { message: 'database unavailable' } })
    mockFrom.mockReturnValue(query)

    const { getWeeklyMovement } = await import('../engine/weekly')

    await expect(getWeeklyMovement(2026, 34, 'main')).rejects.toThrow('Failed to load weekly movements: database unavailable')
  })
})
