// Ship 4 — realtime scope filter builder.
//
// Contract locked by live verification (E1-1): WALRUS values must be
// UNQUOTED; postgres_changes accepts exactly ONE condition per binding,
// so a scoped subscription replaces the event_name in-list.

import { describe, it, expect } from 'vitest'
import { buildEventNameFilter, buildScopeFilter, buildLiveFilter } from '../lib/realtime-filter'

describe('buildLiveFilter', () => {
  it('classic unscoped subscription builds an unquoted event_name in-list', () => {
    expect(buildLiveFilter(['stock.moved', 'po.received'])).toBe(
      'event_name=in.(stock.moved,po.received)',
    )
  })

  it('single-event list uses the same in-form', () => {
    expect(buildLiveFilter(['chat.message'])).toBe('event_name=in.(chat.message)')
  })

  it('scopeId swaps the binding to a bare scope_id equality', () => {
    const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    expect(buildLiveFilter(['chat.message'], id)).toBe(`scope_id=eq.${id}`)
  })

  it('empty-string scopeId falls back to the in-list', () => {
    expect(buildLiveFilter(['chat.message'], '')).toBe('event_name=in.(chat.message)')
  })

  it('station names are emitted unquoted too', () => {
    expect(buildScopeFilter('kitchen')).toBe('scope_id=eq.kitchen')
  })

  it('event-name filter helper matches the live-binding form exactly', () => {
    expect(buildEventNameFilter(['a', 'b'])).toBe('event_name=in.(a,b)')
  })
})
