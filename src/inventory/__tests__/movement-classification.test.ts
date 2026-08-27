import { describe, expect, it } from 'vitest'
import {
  classifyMovement,
  movementAmounts,
} from '../lib/movement-classification'

describe('canonical movement classification', () => {
  it.each([
    ['purchase', 2, 'inbound'],
    ['return', 2, 'inbound'],
    ['transfer_in', 2, 'inbound'],
    ['sale', -2, 'sold'],
    ['sale_bottle', -2, 'sold'],
    ['comp', -2, 'internal_consumption'],
    ['staff', -2, 'internal_consumption'],
    ['production', -2, 'internal_consumption'],
    ['gas_usage', -2, 'internal_consumption'],
    ['waste', -2, 'waste_loss'],
    ['breakage', -2, 'waste_loss'],
    ['spillage', -2, 'waste_loss'],
    ['expiry_loss', -2, 'waste_loss'],
    ['theft', -2, 'waste_loss'],
    ['stolen', -2, 'waste_loss'],
    ['donation', -2, 'waste_loss'],
    ['adjustment', -2, 'adjustment'],
    ['physical_count', -2, 'physical_count'],
  ] as const)('classifies %s as %s', (type, quantity, expected) => {
    expect(classifyMovement(type, quantity)).toBe(expected)
  })

  it('does not classify positive production as consumption', () => {
    expect(classifyMovement('production', 3)).toBe('unclassified')
  })

  it('keeps operational used, waste, and total outflow separate', () => {
    expect(movementAmounts('sale', -4)).toMatchObject({ operationalUsed: 4, wasteLoss: 0, totalOutflow: 4 })
    expect(movementAmounts('waste', -3)).toMatchObject({ operationalUsed: 0, wasteLoss: 3, totalOutflow: 3 })
  })
})
