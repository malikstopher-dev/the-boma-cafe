import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  row: { id: 'loc-kitchen' } as { id: string } | null,
  error: null as { message: string } | null,
  filters: [] as Array<[string, unknown]>,
}))

function chain() {
  const query: any = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn((column: string, value: unknown) => {
    state.filters.push([column, value])
    return query
  })
  query.is = vi.fn((column: string, value: unknown) => {
    state.filters.push([column, value])
    return query
  })
  query.maybeSingle = vi.fn(async () => ({ data: state.row, error: state.error }))
  return query
}

vi.mock('../lib/db', () => ({
  getInventoryClient: () => ({ from: vi.fn(() => chain()) }),
}))

import { isOrderStation, resolveOrderStationLocation } from '../lib/station-location'

beforeEach(() => {
  state.row = { id: 'loc-kitchen' }
  state.error = null
  state.filters = []
})

describe('order station location authority', () => {
  it('resolves only an active non-archived location mapped to the station', async () => {
    await expect(resolveOrderStationLocation('kitchen')).resolves.toBe('loc-kitchen')
    expect(state.filters).toEqual(expect.arrayContaining([
      ['order_station', 'kitchen'],
      ['is_active', true],
      ['deleted_at', null],
    ]))
  })

  it('rejects missing or invalid stations before querying', async () => {
    expect(isOrderStation('bar')).toBe(true)
    expect(isOrderStation('expo')).toBe(false)
    await expect(resolveOrderStationLocation(null)).rejects.toThrow('invalid or missing')
  })

  it('throws when no active mapping exists instead of choosing a default', async () => {
    state.row = null
    await expect(resolveOrderStationLocation('bar')).rejects.toThrow(
      'No active inventory location is mapped to order station "bar"',
    )
  })

  it('propagates mapping query failures', async () => {
    state.error = { message: 'connection reset' }
    await expect(resolveOrderStationLocation('bar')).rejects.toThrow('connection reset')
  })

  it('migration enforces one explicit mapping per station and seeds only named canonical locations', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/109_order_station_location_mapping.sql'),
      'utf8',
    )
    expect(sql).toContain("order_station IN ('kitchen', 'bar')")
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_locations_order_station')
    expect(sql).toContain("SET order_station = 'kitchen'")
    expect(sql).toContain("SET order_station = 'bar'")
    expect(sql).not.toContain('ORDER BY created_at ASC\n  LIMIT 1;')
  })
})
