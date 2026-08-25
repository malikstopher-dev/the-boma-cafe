// Pure filter builder for realtime_events subscriptions (Ship 4).
//
// Supabase postgres_changes accepts exactly ONE WALRUS condition per
// binding, so a scoped subscription replaces the event_name in-list
// with a scope_id equality. Catch-up queries (REST) can combine both.
//
// Values must be UNQUOTED: verified live that the WALRUS parser
// silently matches NOTHING for double-quoted values.

export function buildEventNameFilter(events: string[]): string {
  return `event_name=in.(${events.join(',')})`
}

export function buildScopeFilter(scopeId: string): string {
  return `scope_id=eq.${scopeId}`
}

/**
 * Live-binding filter for one subscription.
 *  - scopeId present -> scope_id equality (event names ride along
 *    implicitly: scope ids are conversation UUIDs / station names and
 *    cannot collide across event families).
 *  - otherwise       -> classic event_name in-list (unchanged behavior).
 */
export function buildLiveFilter(events: string[], scopeId?: string): string {
  if (scopeId && scopeId !== '') return buildScopeFilter(scopeId)
  return buildEventNameFilter(events)
}
