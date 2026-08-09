import { getInventoryClient } from './db'
import { MissingCostCentreError, InvalidCostCentreError } from './errors'

/**
 * Resolves the cost centre that must be stamped on every ledger movement.
 *
 * Priority:
 *   1. An explicitly supplied cost_centre_id (validated against active
 *      cost centres).
 *   2. The cost centre configured on the movement's location
 *      (inventory_locations.cost_centre_id, NOT NULL since migration 066).
 *
 * Every transaction-creation path passes its location_id, and every
 * location carries a cost centre, so movements are never left
 * financially ambiguous. Throws a typed error (never returns null) so
 * callers can fail cleanly BEFORE any DB write.
 */
export async function resolveCostCentreId(
  locationId: string,
  explicitCostCentreId?: string | null,
): Promise<string> {
  const supabase = getInventoryClient()

  if (explicitCostCentreId) {
    const { data, error } = await supabase
      .from('cost_centres')
      .select('id')
      .eq('id', explicitCostCentreId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(`Failed to validate cost centre: ${error.message}`)
    if (!data) throw new InvalidCostCentreError(explicitCostCentreId)
    return data.id
  }

  const { data, error } = await supabase
    .from('inventory_locations')
    .select('cost_centre_id')
    .eq('id', locationId)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve cost centre: ${error.message}`)
  const locationCostCentreId = (data as { cost_centre_id?: string | null } | null)?.cost_centre_id
  if (!locationCostCentreId) throw new MissingCostCentreError(locationId)
  return locationCostCentreId
}

/**
 * Business-area mapping used when a new location is created without an
 * explicit cost centre. Mirrors the backfill rules in migration 066.
 */
export function defaultCostCentreNameForLocation(locationName: string): string | null {
  const name = (locationName ?? '').toLowerCase()

  if (name.includes('bar')) return 'Bar'
  if (name.includes('kitchen')) return 'Kitchen'
  if (name.includes('event') || name.includes('lounge')) return 'Events'
  if (name.includes('vip')) return 'VIP Room'
  if (name.includes('store') || name.includes('room') || name.includes('storage')) return 'Restaurant'
  if (name.includes('takeaway') || name.includes('delivery')) return 'Takeaway'

  return null
}

/**
 * Looks up the cost centre id by exact name (used by the locations
 * creation route to backfill the NOT NULL column).
 */
export async function findCostCentreIdByName(name: string): Promise<string | null> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('cost_centres')
    .select('id')
    .eq('name', name)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return null
  return (data as { id: string } | null)?.id ?? null
}
