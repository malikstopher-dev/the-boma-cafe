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
      { name: 'Cappuccino', quantity: 2, unit_price: 32, selected_size: null, notes: null, source_line_id: 'legacy:0', source_type: 'legacy', source_item_id: null, inventory_required: false },
      { name: 'Beer', quantity: 1, unit_price: 45, selected_size: null, notes: null, source_line_id: 'legacy:1', source_type: 'legacy', source_item_id: null, inventory_required: false },
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
      { name: 'Wine', quantity: 1, unit_price: 90, selected_size: '750ml', notes: 'no ice', source_line_id: 'legacy:0', source_type: 'legacy', source_item_id: null, inventory_required: false },
    ])
  })

  it('defaults quantity to 1 and price to 0 when missing', () => {
    const items = parseOrderItemsJson(JSON.stringify([{ name: 'Coffee' }]))
    expect(items).toEqual([
      { name: 'Coffee', quantity: 1, unit_price: 0, selected_size: null, notes: null, source_line_id: 'legacy:0', source_type: 'legacy', source_item_id: null, inventory_required: false },
    ])
  })

  it('filters out unnamed items', () => {
    const items = parseOrderItemsJson(JSON.stringify([{ name: '  ' }, { name: 'Espresso', quantity: 3 }]))
    expect(items).toHaveLength(1)
    const [first] = items
    expect(first?.name).toBe('Espresso')
  })

  it('preserves explicit source identity and inventory requirements', () => {
    const items = parseOrderItemsJson(JSON.stringify([{
      name: 'Custom lager',
      quantity: 2,
      source_line_id: 'line-abc',
      source_type: 'bar_item',
      source_item_id: 'bar-item-1',
      inventory_required: true,
    }]))

    expect(items[0]).toEqual(expect.objectContaining({
      source_line_id: 'line-abc',
      source_type: 'bar_item',
      source_item_id: 'bar-item-1',
      inventory_required: true,
    }))
  })

  it('normalizes the enriched selected-size object without losing customization', () => {
    const items = parseOrderItemsJson(JSON.stringify([{
      name: 'Gin',
      selected_size: { name: 'double', price: 80 },
      source_line_id: 'line-double',
    }]))

    expect(items[0]?.selected_size).toBe('double')
    expect(items[0]?.source_line_id).toBe('line-double')
  })

  it('returns [] for null, empty, or invalid JSON', () => {
    expect(parseOrderItemsJson(null)).toEqual([])
    expect(parseOrderItemsJson('')).toEqual([])
    expect(parseOrderItemsJson('not json')).toEqual([])
    expect(parseOrderItemsJson('{"foo": "bar"}')).toEqual([])
  })
})
