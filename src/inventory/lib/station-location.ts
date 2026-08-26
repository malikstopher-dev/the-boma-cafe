import { getInventoryClient } from './db'

export type OrderStation = 'kitchen' | 'bar'

export function isOrderStation(value: unknown): value is OrderStation {
  return value === 'kitchen' || value === 'bar'
}

export async function resolveOrderStationLocation(station: unknown): Promise<string> {
  if (!isOrderStation(station)) {
    throw new Error(`Order station is invalid or missing: ${String(station ?? 'null')}`)
  }

  const { data, error } = await getInventoryClient()
    .from('inventory_locations')
    .select('id')
    .eq('order_station', station)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to resolve inventory location for ${station}: ${error.message}`)
  }
  if (!data?.id) {
    throw new Error(`No active inventory location is mapped to order station "${station}"`)
  }

  return data.id as string
}
