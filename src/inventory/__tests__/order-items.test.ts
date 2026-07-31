import { describe, it, expect } from 'vitest'
import { parseOrderItemsJson } from '../engine/order-items'

describe('parseOrderItemsJson', () => {
  it('parses an array of items', () => {
    const items = parseOrderItemsJson(
      JSON.stringify([
        { name: 'Cappuccino', quantity: 2, price: 32 },
        { name: 'Beer', quantity: 1, price: 45 },
      ]),
    )
    expect(items).toEqual([
      { name: 'Cappuccino', quantity: 2, unit_price: 32, selected_size: null, notes: null },
      { name: 'Beer', quantity: 1, unit_price: 45, selected_size: null, notes: null },
    ])
  })

  it('parses the wrapped { items: [...] } shape used by the POS', () => {
    const items = parseOrderItemsJson(
      JSON.stringify({
        items: [{ name: 'Wine', quantity: 1, price: 90, selected_size: '750ml', notes: 'no ice' }],
        metadata: { paymentStatus: 'paid' },
      }),
    )
    expect(items).toEqual([
      { name: 'Wine', quantity: 1, unit_price: 90, selected_size: '750ml', notes: 'no ice' },
    ])
  })

  it('defaults quantity to 1 and price to 0 when missing', () => {
    const items = parseOrderItemsJson(JSON.stringify([{ name: 'Coffee' }]))
    expect(items).toEqual([
      { name: 'Coffee', quantity: 1, unit_price: 0, selected_size: null, notes: null },
    ])
  })

  it('filters out unnamed items', () => {
    const items = parseOrderItemsJson(JSON.stringify([{ name: '  ' }, { name: 'Espresso', quantity: 3 }]))
    expect(items).toHaveLength(1)
    const [first] = items
    expect(first?.name).toBe('Espresso')
  })

  it('returns [] for null, empty, or invalid JSON', () => {
    expect(parseOrderItemsJson(null)).toEqual([])
    expect(parseOrderItemsJson('')).toEqual([])
    expect(parseOrderItemsJson('not json')).toEqual([])
    expect(parseOrderItemsJson('{"foo": "bar"}')).toEqual([])
  })
})
