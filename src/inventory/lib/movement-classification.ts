export const INBOUND_TYPES = ['purchase', 'return', 'transfer_in'] as const
export const SOLD_TYPES = ['sale', 'sale_bottle'] as const
export const INTERNAL_CONSUMPTION_TYPES = ['comp', 'staff', 'gas_usage'] as const
export const WASTE_LOSS_TYPES = [
  'waste',
  'breakage',
  'spillage',
  'expiry_loss',
  'theft',
  'stolen',
  'donation',
] as const

const inbound = new Set<string>(INBOUND_TYPES)
const sold = new Set<string>(SOLD_TYPES)
const internal = new Set<string>(INTERNAL_CONSUMPTION_TYPES)
const waste = new Set<string>(WASTE_LOSS_TYPES)

export type MovementClass =
  | 'inbound'
  | 'sold'
  | 'internal_consumption'
  | 'waste_loss'
  | 'adjustment'
  | 'physical_count'
  | 'unclassified'

export interface MovementAmounts {
  inbound: number
  sold: number
  internalConsumption: number
  operationalUsed: number
  wasteLoss: number
  adjustment: number
  physicalCountVariance: number
  totalOutflow: number
}

export function classifyMovement(transactionType: string | null | undefined, quantity: number): MovementClass {
  const type = String(transactionType ?? '').toLowerCase()
  const qty = Number(quantity) || 0

  if (inbound.has(type) && qty > 0) return 'inbound'
  if (sold.has(type) && qty < 0) return 'sold'
  if ((internal.has(type) || type === 'production') && qty < 0) return 'internal_consumption'
  if (waste.has(type) && qty < 0) return 'waste_loss'
  if (type === 'adjustment') return 'adjustment'
  if (type === 'physical_count') return 'physical_count'
  return 'unclassified'
}

export function movementAmounts(transactionType: string | null | undefined, quantity: number): MovementAmounts {
  const qty = Number(quantity) || 0
  const absolute = Math.abs(qty)
  const movementClass = classifyMovement(transactionType, qty)
  const result: MovementAmounts = {
    inbound: 0,
    sold: 0,
    internalConsumption: 0,
    operationalUsed: 0,
    wasteLoss: 0,
    adjustment: 0,
    physicalCountVariance: 0,
    totalOutflow: 0,
  }

  if (movementClass === 'inbound') result.inbound = absolute
  if (movementClass === 'sold') result.sold = absolute
  if (movementClass === 'internal_consumption') result.internalConsumption = absolute
  if (movementClass === 'waste_loss') result.wasteLoss = absolute
  if (movementClass === 'adjustment') result.adjustment = qty
  if (movementClass === 'physical_count') result.physicalCountVariance = qty

  result.operationalUsed = result.sold + result.internalConsumption
  result.totalOutflow = result.operationalUsed + result.wasteLoss
  return result
}
