import { getInventoryClient } from './db'

export { resolveOrderStationLocation } from './station-location'
export type { OrderStation } from './station-location'

const ALIASES = new Set(['main', 'default'])

export async function resolveLocationId(locationId?: string | null): Promise<string | null> {
  const id = locationId?.trim()

  if (id && !ALIASES.has(id.toLowerCase())) {
    return id
  }

  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}
