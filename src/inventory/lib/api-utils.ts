import type { InventoryType } from '../engine/types'

export function getInventoryTypeFilter(searchParams: URLSearchParams): InventoryType | null {
  const val = searchParams.get('inventory_type')
  if (!val) return null
  const upper = val.toUpperCase() as InventoryType
  if (['FOOD', 'BEVERAGE', 'CLEANING', 'PACKAGING', 'GENERAL'].includes(upper)) {
    return upper
  }
  return null
}

export function applyInventoryTypeFilter(
  query: any,
  inventoryType: InventoryType | null,
): any {
  if (inventoryType) {
    return query.eq('inventory_type', inventoryType)
  }
  return query
}
